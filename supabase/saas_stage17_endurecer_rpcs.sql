-- =============================================================================
-- SaaS · Etapa 17 — ENDURECER FUNCIONES SECURITY DEFINER (aislamiento/seguridad)
-- -----------------------------------------------------------------------------
-- 1) crear_directiva: función legacy SIN guard de rol/org que además resetea la
--    clave de cualquier correo → riesgo de toma de cuentas. La app NO la usa
--    (usa crear_cuenta_persona / crear_miembro_directiva, que verifican rol+org).
--    Se elimina.
-- 2) emitir_voto: SECURITY DEFINER que no validaba el sindicato de la votación →
--    permitía votar en votaciones de OTRO sindicato. Se agrega el chequeo de org.
-- 3) contar_afiliados_activos: contaba afiliados de TODOS los sindicatos. Se hace
--    por sindicato (por slug para el login público, o el de la sesión).
-- Idempotente. Ejecutar una vez en el SQL Editor de Supabase.
-- =============================================================================

-- 1) Eliminar la función legacy insegura ------------------------------------
drop function if exists public.crear_directiva(text, text, text, app_role);

-- 2) Voto solo en votaciones del PROPIO sindicato ---------------------------
create or replace function public.emitir_voto(p_ballot uuid, p_choice text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare rc int;
begin
  if p_choice not in ('favor', 'contra', 'abstencion') then
    return false;
  end if;
  -- En curso, dentro del plazo, y de MI sindicato.
  if not exists (
    select 1 from public.ballots
    where id = p_ballot and status = 'En curso'
      and org_id = public.current_org()
      and (closes_at_ts is null or now() <= closes_at_ts)
  ) then
    return false;
  end if;
  insert into public.votes (ballot_id, voter_id, choice)
  values (p_ballot, auth.uid(), p_choice)
  on conflict (ballot_id, voter_id) do nothing;
  get diagnostics rc = row_count;
  if rc = 0 then
    return false; -- ya había votado
  end if;
  update public.ballots set
    favor      = favor      + (case when p_choice = 'favor' then 1 else 0 end),
    contra     = contra     + (case when p_choice = 'contra' then 1 else 0 end),
    abstencion = abstencion + (case when p_choice = 'abstencion' then 1 else 0 end)
  where id = p_ballot;
  return true;
end $$;
grant execute on function public.emitir_voto(uuid, text) to authenticated;

-- 3) Conteo de afiliados por SINDICATO (no global) --------------------------
drop function if exists public.contar_afiliados_activos();
create or replace function public.contar_afiliados_activos(p_slug text default null)
returns integer
language sql
security definer
stable
set search_path = public
as $$
  select count(*)::int from public.affiliates a
  where a.status = 'Activo'
    and a.org_id = coalesce(
      (select id from public.organizations where slug = p_slug and activo = true limit 1),
      public.current_org()
    )
$$;
grant execute on function public.contar_afiliados_activos(text) to anon, authenticated;

select 'listo: rpcs endurecidas' as estado;
