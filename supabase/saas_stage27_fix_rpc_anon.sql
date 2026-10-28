-- =============================================================================
-- SaaS · Etapa 27 — FIX CRÍTICO: RPCs sensibles ejecutables por ANÓNIMOS + secreto Wompi
-- -----------------------------------------------------------------------------
-- Hallazgos de la auditoría (2026-10-11):
--
-- F1 (CRÍTICO): resetear_password, crear_sindicato y correos_presidencia usan el
--   guard `if auth.uid() is not null and not is_platform_admin() then raise`.
--   Para un llamante ANÓNIMO (anon), auth.uid() es NULL → el guard NO se dispara.
--   Y como ninguna función revoca el EXECUTE por defecto a PUBLIC, el rol `anon`
--   puede llamarlas. Resultado: un anónimo podía RESETEAR la contraseña de la
--   presidencia de cualquier sindicato y tomarlo por completo.
--   FIX: quitar EXECUTE a public/anon. (El guard existente ya bloquea a los
--   autenticados no-admin; el admin de plataforma conserva su grant explícito;
--   el bootstrap por SQL Editor/service role sigue disponible.)
--
-- F4 (MEDIO): la RLS de organizations expone TODA la fila (incluido wompi_integrity)
--   a cualquier miembro del sindicato (hasta un afiliado). El secreto de integridad
--   NO debe llegar al cliente. FIX: el rol `authenticated` pierde el SELECT de esa
--   columna; el servidor la lee con el service role (que no se ve afectado).
--
-- Idempotente. Ejecutar en el SQL Editor de Supabase.
-- =============================================================================

-- ---- F1/F2/F3: cerrar el acceso anónimo a las RPCs sensibles -----------------
-- Revoca EXECUTE a public/anon de CUALQUIER firma existente de estas funciones
-- (así no falla si un overload no existe en esta base).
do $$
declare r record;
begin
  for r in
    select 'public.' || quote_ident(p.proname) || '(' || pg_get_function_identity_arguments(p.oid) || ')' as sig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in ('resetear_password', 'crear_sindicato', 'correos_presidencia')
  loop
    execute 'revoke execute on function ' || r.sig || ' from public, anon';
  end loop;
end $$;

-- ---- F4: ocultar wompi_integrity del cliente (lo lee solo el servidor) --------
-- Reconstruye el SELECT de `authenticated` sobre organizations con TODAS las
-- columnas MENOS wompi_integrity (se auto-ajusta a las columnas actuales).
do $$
declare cols text;
begin
  select string_agg(format('%I', column_name), ', ')
    into cols
  from information_schema.columns
  where table_schema = 'public' and table_name = 'organizations'
    and column_name <> 'wompi_integrity';

  execute 'revoke select on public.organizations from authenticated';
  execute 'grant select (' || cols || ') on public.organizations to authenticated';
end $$;

select 'listo: RPCs sensibles sin acceso anonimo + wompi_integrity oculto al cliente' as estado;
