-- =============================================================================
-- SaaS · Etapa 15 — CERRAR FUGAS DE AISLAMIENTO: case_events y audit_log
-- -----------------------------------------------------------------------------
-- Ambas tablas filtraban SOLO por rol (no por sindicato), así que un directivo /
-- presidencia / fiscal podía ver la bitácora disciplinaria y la auditoría de
-- OTROS sindicatos. Este parche les agrega org_id y aislamiento por organización.
-- Idempotente. Ejecutar una vez en el SQL Editor de Supabase.
-- =============================================================================

-- 1) case_events: bitácora disciplinaria ------------------------------------
alter table public.case_events add column if not exists org_id uuid references public.organizations(id);
-- Backfill: el org del evento = el org de su expediente.
update public.case_events ce
   set org_id = c.org_id
  from public.cases c
 where ce.case_id = c.id and ce.org_id is null;
create index if not exists case_events_org_idx on public.case_events(org_id);

-- Al insertar, asigna el sindicato de la sesión (= el del expediente).
drop trigger if exists set_org_case_events on public.case_events;
create trigger set_org_case_events before insert on public.case_events
  for each row execute function public.set_org_id();

-- Aislamiento por organización (RESTRICTIVA: se suma a las reglas de rol).
drop policy if exists org_isolation on public.case_events;
create policy org_isolation on public.case_events as restrictive for all
  using (org_id = public.current_org() or public.is_platform_admin())
  with check (org_id = public.current_org() or public.is_platform_admin());

-- 2) audit_log: bitácora de auditoría ---------------------------------------
alter table public.audit_log add column if not exists org_id uuid references public.organizations(id);
-- Backfill: los registros existentes eran todos de SERDNP.
update public.audit_log set org_id = '11111111-1111-1111-1111-111111111111' where org_id is null;
create index if not exists audit_log_org_idx on public.audit_log(org_id);

-- El trigger de auditoría ahora guarda el org del registro cambiado.
create or replace function public.audit_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_role  text;
  v_name  text;
  v_json  jsonb := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  v_rowid text;
  v_label text;
  v_org   uuid;
begin
  select full_name, role::text into v_name, v_role from public.profiles where id = v_actor;
  v_rowid := coalesce(v_json->>'id', v_json->>'codigo', v_json->>'code');
  v_label := coalesce(
    v_json->>'name', v_json->>'title', v_json->>'subject', v_json->>'concept',
    v_json->>'code', v_json->>'codigo', v_json->>'period', v_rowid
  );
  -- Sindicato del registro auditado (todas las tablas auditadas tienen org_id).
  v_org := coalesce((v_json->>'org_id')::uuid, public.current_org());
  insert into public.audit_log(table_name, row_id, row_label, action, actor_id, actor_role, actor_name, old_data, new_data, org_id)
  values (
    tg_table_name, v_rowid, v_label, tg_op, v_actor,
    coalesce(v_role, 'desconocido'),
    nullif(trim(coalesce(v_name, '')), ''),
    case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) else null end,
    case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) else null end,
    v_org
  );
  return case when tg_op = 'DELETE' then old else new end;
end $$;

-- Solo Presidencia/Fiscal LEEN, y SOLO la de su propio sindicato.
drop policy if exists audit_select on public.audit_log;
create policy audit_select on public.audit_log for select
  to authenticated
  using (
    public.app_role() in ('presidencia','fiscal')
    and (org_id = public.current_org() or public.is_platform_admin())
  );

-- Verificación: no deben quedar filas sin org.
select 'case_events sin org' as chequeo, count(*) as filas from public.case_events where org_id is null
union all select 'audit_log sin org', count(*) from public.audit_log where org_id is null;
-- (Ambos deben dar 0.)
