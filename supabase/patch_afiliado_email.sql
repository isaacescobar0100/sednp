-- Parche: permite que el afiliado vea SU ficha por correo mientras su cuenta
-- aún no está enlazada por user_id (durante la migración).
-- Ejecutar en el SQL Editor de Supabase después del schema.sql.

drop policy if exists affiliates_select on public.affiliates;
create policy affiliates_select on public.affiliates for select
  using (
    public.is_directiva()
    or user_id = auth.uid()
    or lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
