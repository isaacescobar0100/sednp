-- =============================================================================
-- SaaS · Etapa 25 — FIX CRÍTICO: escalada de privilegios vía profiles (C2)
-- -----------------------------------------------------------------------------
-- La política profiles_update_self dejaba que un usuario actualizara SU fila sin
-- límite de columnas, incluidas role / org_id / platform_admin. Como current_org(),
-- app_role() e is_platform_admin() leen de profiles, cualquiera podía volverse
-- platform_admin y tomar toda la plataforma.
--
-- Fix a nivel de PERMISOS DE COLUMNA: el rol 'authenticated' (el cliente con el
-- anon key + JWT) solo puede ACTUALIZAR columnas inocuas. Los RPC SECURITY DEFINER
-- de creación/gestión de cuentas corren como OWNER (postgres) y NO se ven afectados,
-- así que la directiva sigue pudiendo asignar rol/org a través de ellos.
-- Idempotente. Ejecutar en el SQL Editor de Supabase.
-- =============================================================================

revoke update on public.profiles from authenticated;
revoke update on public.profiles from anon;

-- Solo estas columnas puede tocar el propio usuario desde el cliente.
grant update (full_name, foto_url, initials) on public.profiles to authenticated;

-- (RLS profiles_update_self sigue limitando a la fila propia; esto limita LAS COLUMNAS.)

select 'listo: profiles blindado contra escalada de privilegios (C2)' as estado;
