-- Permite que Presidencia inserte movimientos (p. ej. el ingreso de una multa
-- disciplinaria, cuyo fallo hace la Junta). Tesorería sigue registrando lo demás.
-- Ejecutar en el SQL Editor de Supabase.
drop policy if exists movements_insert on public.movements;
create policy movements_insert on public.movements for insert
  with check (public.app_role() in ('tesoreria', 'presidencia'));
