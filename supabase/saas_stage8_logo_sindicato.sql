-- =============================================================================
-- SIG-SERDNP (Sindika) · SaaS ETAPA 8 — Logo del sindicato (self-service)
-- Permite que la Presidencia/Secretaría cambie el logo de SU propio sindicato
-- desde la app (sube el archivo al bucket 'fotos' y guarda la URL).
-- Requiere stage1..stage7. Idempotente. Ejecutar en el SQL Editor UNA VEZ.
-- =============================================================================

create or replace function public.set_logo_sindicato(p_url text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.app_role() not in ('presidencia','secretaria') then
    raise exception 'Solo la Presidencia o la Secretaría puede cambiar el logo';
  end if;
  update public.organizations
     set logo_url = nullif(p_url, '')
   where id = public.current_org();
end $$;

grant execute on function public.set_logo_sindicato(text) to authenticated;

select 'listo: logo self-service' as estado;
