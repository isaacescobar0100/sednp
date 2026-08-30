-- =============================================================================
-- SIG-SERDNP · Endurecimiento de RLS de LECTURA
-- Cierra el acceso de LECTURA anónimo: varias tablas tenían `select using (true)`,
-- lo que permitía leerlas solo con la anon key (sin iniciar sesión) desde consola,
-- script o peticiones del navegador. Ahora exigen sesión iniciada; la caja menor
-- (financiero) queda solo para la Junta Directiva.
--
-- Los afiliados AUTENTICADOS siguen viendo votaciones, documentos y comunicados en
-- su portal. Los ANÓNIMOS ya no pueden leer nada.
-- Idempotente. Ejecutar en el SQL Editor de Supabase.
-- =============================================================================

-- --- Gobernanza / comités / documental / comunicaciones: solo usuarios logueados
drop policy if exists ballots_select on public.ballots;
create policy ballots_select on public.ballots for select
  to authenticated using (true);

drop policy if exists committees_select on public.committees;
create policy committees_select on public.committees for select
  to authenticated using (true);

drop policy if exists docs_select on public.docs;
create policy docs_select on public.docs for select
  to authenticated using (true);

drop policy if exists comunicados_select on public.comunicados;
create policy comunicados_select on public.comunicados for select
  to authenticated using (true);

-- --- Catálogos y parámetros: solo usuarios logueados (los usa el formulario y el app)
do $$
declare t text;
begin
  foreach t in array array['cargos','dependencias','vinculaciones','escalas','presupuestos','cuentas','params']
  loop
    execute format('drop policy if exists %I_select on public.%I;', t, t);
    execute format('create policy %I_select on public.%I for select to authenticated using (true);', t, t);
  end loop;
end $$;

-- --- Caja menor: es FINANCIERO -> solo la Junta Directiva puede leerla
drop policy if exists caja_gastos_select on public.caja_gastos;
create policy caja_gastos_select on public.caja_gastos for select
  to authenticated using (public.is_directiva());

-- =============================================================================
-- Verificación: ninguna política de SELECT debe seguir abierta a 'anon'/public.
-- Debe devolver 0 filas (o solo tablas con SECURITY DEFINER, que no aplican aquí).
-- =============================================================================
select tablename, policyname, roles
from pg_policies
where schemaname = 'public'
  and cmd = 'SELECT'
  and (roles is null or 'anon' = any(roles) or 'public' = any(roles))
order by tablename;
