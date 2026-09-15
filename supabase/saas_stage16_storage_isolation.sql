-- =============================================================================
-- SaaS · Etapa 16 — AISLAR EL STORAGE DE SOPORTES POR SINDICATO
-- -----------------------------------------------------------------------------
-- Antes: cualquier usuario autenticado podía leer/subir a CUALQUIER ruta del
-- bucket 'soportes'. Ahora los archivos viven bajo la carpeta del sindicato
-- (<org_id>/<carpeta>/<archivo>) y solo se leen/suben dentro de la propia.
-- Los archivos viejos de SERDNP (subidos sin prefijo) siguen accesibles para SERDNP.
-- Idempotente. Ejecutar una vez en el SQL Editor de Supabase.
-- =============================================================================

-- Lectura: solo archivos de la carpeta del propio sindicato (o admin de plataforma).
drop policy if exists "soportes_select" on storage.objects;
create policy "soportes_select" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'soportes' and (
      public.is_platform_admin()
      or (storage.foldername(name))[1] = public.current_org()::text
      -- Compatibilidad: archivos antiguos de SERDNP subidos SIN prefijo de org.
      or (public.current_org() = '11111111-1111-1111-1111-111111111111'
          and (storage.foldername(name))[1] in ('caja','disciplinario','documental','conceptos'))
    )
  );

-- Subida: solo dentro de la carpeta del propio sindicato.
drop policy if exists "soportes_insert" on storage.objects;
create policy "soportes_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'soportes' and (
      public.is_platform_admin()
      or (storage.foldername(name))[1] = public.current_org()::text
    )
  );

select 'listo: storage soportes aislado por sindicato' as estado;
