-- =============================================================================
-- Página Web / CMS: tabla de publicaciones (artículos, anuncios y páginas fijas)
-- + lectura pública (anónima) del contenido PUBLICADO.
--
-- - Escritura: Presidencia / Secretaría (encargadas de comunicaciones).
-- - Lectura pública: vía RPCs SECURITY DEFINER (solo lo 'publicado' del sindicato).
-- Multi-tenant (org_id). Idempotente. Ejecutar en el SQL Editor.
-- =============================================================================

create table if not exists public.publicaciones (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid references public.organizations(id),
  tipo       text not null default 'articulo',   -- 'articulo' | 'anuncio' | 'pagina'
  clave      text,                                 -- páginas fijas: 'quienes-somos','servicios','contacto'
  titulo     text not null default '',
  resumen    text default '',
  contenido  text default '',
  categoria  text default '',
  imagen_url text,
  estado     text not null default 'borrador',    -- 'borrador' | 'publicado'
  fecha_pub  timestamptz,
  autor      text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists publicaciones_org_idx on public.publicaciones(org_id);
create index if not exists publicaciones_estado_idx on public.publicaciones(org_id, tipo, estado);

alter table public.publicaciones enable row level security;

-- La directiva ve todo (para administrar en el CMS).
drop policy if exists publicaciones_select on public.publicaciones;
create policy publicaciones_select on public.publicaciones for select
  using (public.is_directiva());

-- Escriben Presidencia y Secretaría.
drop policy if exists publicaciones_write on public.publicaciones;
create policy publicaciones_write on public.publicaciones for all
  using (public.app_role() in ('presidencia','secretaria'))
  with check (public.app_role() in ('presidencia','secretaria'));

-- Aislamiento por sindicato.
drop trigger if exists set_org_publicaciones on public.publicaciones;
create trigger set_org_publicaciones before insert on public.publicaciones
  for each row execute function public.set_org_id();

drop policy if exists org_isolation on public.publicaciones;
create policy org_isolation on public.publicaciones as restrictive for all
  using (org_id = public.current_org() or public.is_platform_admin())
  with check (org_id = public.current_org() or public.is_platform_admin());

-- Lectura pública: lista de publicaciones PUBLICADAS del sindicato -------------
create or replace function public.posts_publicos(p_slug text, p_tipo text default null)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v_org uuid; result jsonb;
begin
  select id into v_org from public.organizations where slug = p_slug and activo = true limit 1;
  if v_org is null then return '[]'::jsonb; end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', id, 'tipo', tipo, 'clave', clave, 'titulo', titulo, 'resumen', resumen,
    'contenido', contenido, 'categoria', categoria, 'imagenUrl', imagen_url,
    'fechaPub', fecha_pub, 'autor', autor
  ) order by coalesce(fecha_pub, created_at) desc), '[]'::jsonb)
  into result
  from public.publicaciones
  where org_id = v_org and estado = 'publicado' and (p_tipo is null or tipo = p_tipo);
  return result;
end $$;
grant execute on function public.posts_publicos(text, text) to anon, authenticated;

-- Lectura pública: una página fija (por clave) --------------------------------
create or replace function public.pagina_publica(p_slug text, p_clave text)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v_org uuid; result jsonb;
begin
  select id into v_org from public.organizations where slug = p_slug and activo = true limit 1;
  if v_org is null then return '{}'::jsonb; end if;
  select coalesce(jsonb_build_object('titulo', titulo, 'contenido', contenido, 'imagenUrl', imagen_url), '{}'::jsonb)
  into result
  from public.publicaciones
  where org_id = v_org and tipo = 'pagina' and clave = p_clave and estado = 'publicado'
  order by updated_at desc limit 1;
  return coalesce(result, '{}'::jsonb);
end $$;
grant execute on function public.pagina_publica(text, text) to anon, authenticated;

select 'listo: publicaciones' as estado;
