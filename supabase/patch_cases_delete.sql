-- Permite eliminar expedientes disciplinarios (Fiscal o Presidencia).
-- Ejecutar en el SQL Editor de Supabase.
drop policy if exists cases_delete on public.cases;
create policy cases_delete on public.cases for delete
  using (public.app_role() in ('fiscal', 'presidencia'));
