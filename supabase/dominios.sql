-- =============================================================================
-- Dominio propio por sindicato.
-- El super-admin asigna un dominio a cada sindicato; el sitio público resuelve
-- qué sindicato mostrar según el dominio (o ?org=slug), y si no, SERDNP.
-- Idempotente. Ejecutar en el SQL Editor de Supabase.
-- =============================================================================

alter table public.organizations add column if not exists dominio text;
create index if not exists organizations_dominio_idx on public.organizations(lower(dominio));

-- Resuelve el sindicato del sitio público: por slug (si viene), luego por
-- dominio (host), y por defecto SERDNP. Devuelve slug + marca. Anónimo.
create or replace function public.sitio_publico(p_host text, p_slug text default null)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare s text; n text; l text;
begin
  if coalesce(p_slug,'') <> '' then
    select slug, nombre, logo_url into s, n, l
    from public.organizations where slug = p_slug and activo = true limit 1;
  end if;
  if s is null and coalesce(p_host,'') <> '' then
    select slug, nombre, logo_url into s, n, l
    from public.organizations where lower(dominio) = lower(p_host) and activo = true limit 1;
  end if;
  if s is null then
    select slug, nombre, logo_url into s, n, l
    from public.organizations where slug = 'serdnp' limit 1;
  end if;
  if s is null then return '{}'::jsonb; end if;
  return jsonb_build_object('slug', s, 'nombre', n, 'logoUrl', l);
end $$;
grant execute on function public.sitio_publico(text, text) to anon, authenticated;

select 'listo: dominios' as estado;
