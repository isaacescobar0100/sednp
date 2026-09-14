-- =============================================================================
-- SaaS · Etapa 12 — SUBDOMINIOS AUTOMÁTICOS POR SINDICATO
-- -----------------------------------------------------------------------------
-- Con un dominio comodín (*.tudominio) apuntado a Vercel UNA sola vez, cada
-- sindicato queda disponible en <slug>.tudominio sin configurar nada por
-- sindicato. Esta función resuelve el sindicato del sitio público en este orden:
--   1) ?org=<slug> explícito
--   2) dominio propio exacto (sindicato que compró su dominio)
--   3) SUBDOMINIO: la primera etiqueta del host se usa como slug
--   4) por defecto: SERDNP
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

  -- 3) Por SUBDOMINIO de plataforma: <slug>.loquesea → primera etiqueta = slug.
  --    Se ignoran etiquetas reservadas (la plataforma, www, etc.).
  if s is null and coalesce(p_host,'') <> '' and position('.' in p_host) > 0 then
    etiqueta := lower(split_part(p_host, '.', 1));
    if etiqueta not in ('www','sindika','app','admin','api','mail','ftp','localhost') then
      select slug, nombre, logo_url into s, n, l
      from public.organizations where slug = etiqueta and activo = true limit 1;
    end if;
  end if;

  -- 4) Por defecto: SERDNP
  if s is null then
    select slug, nombre, logo_url into s, n, l
    from public.organizations where slug = 'serdnp' limit 1;
  end if;

  if s is null then return '{}'::jsonb; end if;
  return jsonb_build_object('slug', s, 'nombre', n, 'logoUrl', l);
end $$;

grant execute on function public.sitio_publico(text, text) to anon, authenticated;

select 'listo: subdominios automaticos' as estado;
