-- =============================================================================
-- SaaS · Etapa 19 — QUITAR EL FALLBACK A SERDNP EN sitio_publico
-- -----------------------------------------------------------------------------
-- Antes, cualquier subdominio inexistente (ej. xyz.acordemusic.com) caía por
-- defecto a SERDNP y abría SU página pública. Ahora, si el host/slug no
-- corresponde a ningún sindicato, la función devuelve vacío y el sitio muestra
-- "no encontrado" (el cliente ya no cae a 'serdnp' tampoco).
-- SERDNP se sigue alcanzando por su slug (serdnp.<dominio>) o ?org=serdnp.
-- Idempotente. Ejecutar una vez en el SQL Editor de Supabase.
-- =============================================================================

create or replace function public.sitio_publico(p_host text, p_slug text default null)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare s text; n text; l text; etiqueta text;
begin
  -- 1) Por slug explícito (?org=)
  if coalesce(p_slug,'') <> '' then
    select slug, nombre, logo_url into s, n, l
    from public.organizations where slug = p_slug and activo = true limit 1;
  end if;

  -- 2) Por dominio propio exacto
  if s is null and coalesce(p_host,'') <> '' then
    select slug, nombre, logo_url into s, n, l
    from public.organizations where lower(dominio) = lower(p_host) and activo = true limit 1;
  end if;

  -- 3) Por SUBDOMINIO: <slug>.loquesea → primera etiqueta = slug (ignora reservadas)
  if s is null and coalesce(p_host,'') <> '' and position('.' in p_host) > 0 then
    etiqueta := lower(split_part(p_host, '.', 1));
    if etiqueta not in ('www','sindika','app','admin','api','mail','ftp','localhost') then
      select slug, nombre, logo_url into s, n, l
      from public.organizations where slug = etiqueta and activo = true limit 1;
    end if;
  end if;

  -- 4) Sin coincidencia → vacío (ya NO cae a SERDNP).
  if s is null then return '{}'::jsonb; end if;
  return jsonb_build_object('slug', s, 'nombre', n, 'logoUrl', l);
end $$;

grant execute on function public.sitio_publico(text, text) to anon, authenticated;

select 'listo: sitio_publico sin default SERDNP' as estado;
