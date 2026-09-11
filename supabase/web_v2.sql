-- =============================================================================
-- Página Web v2: video (YouTube), galería de imágenes, destacados (slider) y
-- documentos públicos. Amplía la tabla publicaciones y su lectura pública.
-- Requiere publicaciones.sql. Idempotente. Ejecutar en el SQL Editor.
-- =============================================================================

alter table public.publicaciones add column if not exists video_url  text;
alter table public.publicaciones add column if not exists galeria    jsonb not null default '[]'::jsonb;
alter table public.publicaciones add column if not exists destacado  boolean not null default false;
alter table public.publicaciones add column if not exists archivo_url text;

-- El CMS sube imágenes, VIDEOS y PDFs al bucket público 'fotos'. Permitimos
-- cualquier tipo de archivo y hasta 50 MB por archivo (los videos pesados es
-- mejor enlazarlos desde YouTube).
update storage.buckets set file_size_limit = 52428800, allowed_mime_types = null where id = 'fotos';

-- Lectura pública actualizada: incluye los nuevos campos ----------------------
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
    'videoUrl', video_url, 'galeria', galeria, 'destacado', destacado, 'archivoUrl', archivo_url,
    'fechaPub', fecha_pub, 'autor', autor
  ) order by coalesce(fecha_pub, created_at) desc), '[]'::jsonb)
  into result
  from public.publicaciones
  where org_id = v_org and estado = 'publicado' and (p_tipo is null or tipo = p_tipo);
  return result;
end $$;
grant execute on function public.posts_publicos(text, text) to anon, authenticated;

select 'listo: web_v2' as estado;
