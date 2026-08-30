-- =============================================================================
-- SIG-SERDNP · AUDITORÍA (bitácora imborrable)
-- Registra automáticamente QUIÉN cambió QUÉ y CUÁNDO en las tablas sensibles.
-- El registro es solo-lectura para la app: lo escribe un trigger SECURITY DEFINER,
-- y nadie (desde el cliente) puede insertarlo, editarlo ni borrarlo.
-- Solo Presidencia y Fiscal pueden LEERLO. Ejecutar en el SQL Editor. Idempotente.
-- =============================================================================

create table if not exists public.audit_log (
  id          bigint generated always as identity primary key,
  table_name  text not null,
  row_id      text,
  row_label   text,                 -- etiqueta legible del registro (nombre/título…)
  action      text not null check (action in ('INSERT','UPDATE','DELETE')),
  actor_id    uuid,
  actor_role  text,
  actor_name  text,                 -- nombre de la persona que hizo el cambio
  old_data    jsonb,
  new_data    jsonb,
  changed_at  timestamptz not null default now()
);
-- Para instalaciones previas: agrega las columnas nuevas si faltan.
alter table public.audit_log add column if not exists row_label  text;
alter table public.audit_log add column if not exists actor_name text;
create index if not exists audit_log_changed_idx on public.audit_log(changed_at desc);
create index if not exists audit_log_table_idx   on public.audit_log(table_name);

-- Función de auditoría: captura el usuario, su rol y los datos antes/después.
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
begin
  -- Persona que hizo el cambio (nombre + rol).
  select full_name, role::text into v_name, v_role from public.profiles where id = v_actor;
  -- Id técnico y una etiqueta legible del registro afectado.
  v_rowid := coalesce(v_json->>'id', v_json->>'codigo', v_json->>'code');
  v_label := coalesce(
    v_json->>'name', v_json->>'title', v_json->>'subject', v_json->>'concept',
    v_json->>'code', v_json->>'codigo', v_json->>'period', v_rowid
  );
  insert into public.audit_log(table_name, row_id, row_label, action, actor_id, actor_role, actor_name, old_data, new_data)
  values (
    tg_table_name,
    v_rowid,
    v_label,
    tg_op,
    v_actor,
    coalesce(v_role, 'desconocido'),
    nullif(trim(coalesce(v_name, '')), ''),
    case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) else null end,
    case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) else null end
  );
  return case when tg_op = 'DELETE' then old else new end;
end $$;

-- Engancha el trigger a las tablas sensibles (financiero, disciplinario,
-- afiliados, gobernanza, parámetros, caja menor, comunicaciones y documental).
do $$
declare t text;
begin
  foreach t in array array[
    'affiliates','movements','aportes','cases','ballots','sessions',
    'params','caja_gastos','comunicados','docs','committees'
  ]
  loop
    execute format('drop trigger if exists audit_%1$s on public.%1$s;', t);
    execute format(
      'create trigger audit_%1$s after insert or update or delete on public.%1$s '
      || 'for each row execute function public.audit_trigger();', t);
  end loop;
end $$;

-- RLS: solo Presidencia y Fiscal LEEN la bitácora. Nadie la escribe/borra desde
-- el cliente (no hay policy de insert/update/delete -> denegado por defecto).
alter table public.audit_log enable row level security;
drop policy if exists audit_select on public.audit_log;
create policy audit_select on public.audit_log for select
  to authenticated
  using (public.app_role() in ('presidencia','fiscal'));

-- Verificación rápida:
select count(*) as registros_auditoria from public.audit_log;
