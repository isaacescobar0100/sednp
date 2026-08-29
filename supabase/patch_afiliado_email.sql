-- Parche: permite que el afiliado vea SU ficha y SUS aportes (y pague) por
-- correo, mientras su cuenta aún no está enlazada por user_id (migración).
-- Ejecutar en el SQL Editor de Supabase después del schema.sql.
-- Idempotente: se puede correr varias veces.

-- Correo del usuario autenticado.
create or replace function public.mi_correo()
returns text language sql stable as $$
  select lower(coalesce(auth.jwt() ->> 'email', ''))
$$;

-- AFILIADOS: la directiva ve todos; el afiliado ve su ficha por user_id o correo.
drop policy if exists affiliates_select on public.affiliates;
create policy affiliates_select on public.affiliates for select
  using (
    public.is_directiva()
    or user_id = auth.uid()
    or lower(email) = public.mi_correo()
  );

-- APORTES: directiva y el propio afiliado (por user_id o correo) los leen.
drop policy if exists aportes_select on public.aportes;
create policy aportes_select on public.aportes for select
  using (
    public.is_directiva()
    or affiliate_id in (
      select id from public.affiliates
      where user_id = auth.uid() or lower(email) = public.mi_correo()
    )
  );

-- APORTES: Tesorería genera/gestiona; el afiliado paga el suyo (por user_id o correo).
drop policy if exists aportes_update on public.aportes;
create policy aportes_update on public.aportes for update
  using (
    public.app_role() = 'tesoreria'
    or affiliate_id in (
      select id from public.affiliates
      where user_id = auth.uid() or lower(email) = public.mi_correo()
    )
  ) with check (true);
