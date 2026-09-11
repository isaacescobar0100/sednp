-- =============================================================================
-- Eliminar un sindicato y TODOS sus datos (destructivo, irreversible).
-- Solo el administrador de la plataforma. Protege al sindicato principal (SERDNP).
-- Borra datos de negocio, catálogos, publicaciones, suscripciones push y las
-- cuentas de acceso (auth) de las personas de ese sindicato.
-- Idempotente. Ejecutar en el SQL Editor de Supabase.
-- =============================================================================

create or replace function public.eliminar_sindicato(p_org uuid)
returns void
language plpgsql security definer set search_path = public, auth
as $$
declare v_slug text;
begin
  if not public.is_platform_admin() then
    raise exception 'Solo el administrador de la plataforma puede eliminar sindicatos';
  end if;
  select slug into v_slug from public.organizations where id = p_org;
  if v_slug is null then raise exception 'Sindicato no encontrado'; end if;
  if v_slug = 'serdnp' then raise exception 'No se puede eliminar el sindicato principal (SERDNP).'; end if;

  -- Datos de negocio (hijos antes que padres para respetar llaves foráneas).
  delete from public.push_subscriptions where org_id = p_org;
  delete from public.actos where org_id = p_org;
  delete from public.publicaciones where org_id = p_org;
  delete from public.votes where org_id = p_org;
  delete from public.ballots where org_id = p_org;
  delete from public.case_events ce using public.cases c where ce.case_id = c.id and c.org_id = p_org;
  delete from public.aportes where org_id = p_org;
  delete from public.cases where org_id = p_org;
  delete from public.sessions where org_id = p_org;
  delete from public.movements where org_id = p_org;
  delete from public.caja_gastos where org_id = p_org;
  delete from public.comunicados where org_id = p_org;
  delete from public.docs where org_id = p_org;
  delete from public.committees where org_id = p_org;
  delete from public.affiliates where org_id = p_org;

  -- Catálogos / parámetros.
  delete from public.cargos where org_id = p_org;
  delete from public.dependencias where org_id = p_org;
  delete from public.vinculaciones where org_id = p_org;
  delete from public.escalas where org_id = p_org;
  delete from public.presupuestos where org_id = p_org;
  delete from public.cuentas where org_id = p_org;
  delete from public.params where org_id = p_org;

  -- Cuentas de acceso de ese sindicato (cascada a identities y perfiles).
  delete from auth.users where id in (select id from public.profiles where org_id = p_org);
  delete from public.profiles where org_id = p_org;

  -- La organización.
  delete from public.organizations where id = p_org;
end $$;

grant execute on function public.eliminar_sindicato(uuid) to authenticated;

select 'listo: eliminar_sindicato' as estado;
