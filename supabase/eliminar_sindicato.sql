-- =============================================================================
-- Eliminar un sindicato y TODOS sus datos (destructivo, irreversible).
-- Solo el administrador de la plataforma. Borra datos de negocio, catálogos,
-- publicaciones, suscripciones push, auditoría y las cuentas de acceso de las
-- personas de ese sindicato. PROTEGE a los administradores de plataforma: si
-- alguno estaba asociado a este sindicato, se DESVINCULA (no se borra su cuenta),
-- para no quedarte sin acceso al eliminar el sindicato principal.
-- Recomendado correr también saas_stage24_borrado_cascada.sql (CASCADE de respaldo).
-- Idempotente. Ejecutar en el SQL Editor de Supabase.
-- =============================================================================

create or replace function public.eliminar_sindicato(p_org uuid)
returns void
language plpgsql security definer set search_path = public, auth
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'Solo el administrador de la plataforma puede eliminar sindicatos';
  end if;
  if not exists (select 1 from public.organizations where id = p_org) then
    raise exception 'Sindicato no encontrado';
  end if;

  -- Desvincula a los administradores de plataforma de este sindicato (no se borran).
  update public.profiles set org_id = null
   where org_id = p_org and coalesce(platform_admin, false) = true;

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
  delete from public.audit_log where org_id = p_org;

  -- Catálogos / parámetros.
  delete from public.cargos where org_id = p_org;
  delete from public.dependencias where org_id = p_org;
  delete from public.vinculaciones where org_id = p_org;
  delete from public.escalas where org_id = p_org;
  delete from public.presupuestos where org_id = p_org;
  delete from public.cuentas where org_id = p_org;
  delete from public.params where org_id = p_org;

  -- Cuentas de acceso de ese sindicato (NUNCA los administradores de plataforma).
  delete from auth.users where id in (
    select id from public.profiles where org_id = p_org and coalesce(platform_admin, false) = false
  );
  delete from public.profiles where org_id = p_org and coalesce(platform_admin, false) = false;

  -- La organización. Con stage24 (CASCADE), cualquier tabla hija no listada aquí
  -- se borra en cascada y no bloquea el borrado.
  delete from public.organizations where id = p_org;
end $$;

grant execute on function public.eliminar_sindicato(uuid) to authenticated;

select 'listo: eliminar_sindicato (sin protección a SERDNP, con protección a admins)' as estado;
