-- =============================================================================
-- SaaS · Etapa 11 — CORREOS DE PRESIDENCIA (para el recordatorio de cobro)
-- -----------------------------------------------------------------------------
-- Devuelve el correo de la cuenta de presidencia de cada sindicato, para que el
-- CRON de cobros pueda enviarle el recordatorio "por vencer" al cliente.
-- Solo lo puede leer el administrador de la plataforma o el proceso de servidor
-- (service_role, donde auth.uid() es null). Correr una vez en el SQL Editor.
-- =============================================================================

create or replace function public.correos_presidencia()
returns table (org_id uuid, email text)
language plpgsql
stable
security definer
set search_path = public, auth
as $$
begin
  -- Permitido al admin de plataforma o al proceso de servidor (service_role).
  if auth.uid() is not null and not public.is_platform_admin() then
    raise exception 'No autorizado';
  end if;
  return query
    select p.org_id, u.email::text
    from public.profiles p
    join auth.users u on u.id = p.id
    where p.role = 'presidencia' and u.email is not null;
end;
$$;

grant execute on function public.correos_presidencia() to authenticated;
