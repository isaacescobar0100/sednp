-- Conteo público de afiliados activos para la pantalla de login (sin sesión).
-- SECURITY DEFINER: cuenta saltando RLS, pero SOLO devuelve un número (no datos).
create or replace function public.contar_afiliados_activos()
returns integer
language sql
security definer
stable
set search_path = public
as $$
  select count(*)::int from public.affiliates where status = 'Activo'
$$;

grant execute on function public.contar_afiliados_activos() to anon, authenticated;
