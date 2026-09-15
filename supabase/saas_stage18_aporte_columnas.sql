-- =============================================================================
-- SaaS · Etapa 18 — CANDADO DE COLUMNAS EN APORTES (integridad intra-sindicato)
-- -----------------------------------------------------------------------------
-- El RLS deja que el propio afiliado actualice SU aporte (para registrar el pago
-- desde el portal), pero sin restringir columnas podía alterar el monto/periodo.
-- Este trigger permite que un afiliado SOLO marque el pago (status/paid_date/
-- method); Tesorería y Presidencia sí pueden todo. Mismo patrón que
-- enforce_movement_columns / enforce_affiliate_columns.
-- Idempotente. Ejecutar una vez en el SQL Editor de Supabase.
-- =============================================================================

create or replace function public.enforce_aporte_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare r text := public.app_role();
begin
  -- Tesorería y Presidencia gestionan el aporte por completo.
  if r in ('tesoreria', 'presidencia') then
    return new;
  end if;
  -- Los demás (el propio afiliado) solo pueden registrar el pago; no alterar
  -- monto, periodo, tipo, titular, acta ni el flag de anticipo.
  if new.amount       is distinct from old.amount
     or new.period    is distinct from old.period
     or new.tipo      is distinct from old.tipo
     or new.affiliate_id is distinct from old.affiliate_id
     or new.acta      is distinct from old.acta
     or new.anticipada is distinct from old.anticipada then
    raise exception 'Solo puedes registrar el pago de tu aporte, no modificar sus datos.';
  end if;
  return new;
end $$;

drop trigger if exists trg_aporte_columns on public.aportes;
create trigger trg_aporte_columns
  before update on public.aportes
  for each row execute function public.enforce_aporte_columns();

select 'listo: candado de columnas en aportes' as estado;
