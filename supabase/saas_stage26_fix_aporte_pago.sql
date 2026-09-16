-- =============================================================================
-- SaaS · Etapa 26 — FIX: quién puede marcar un aporte "Pagado" (C1)
-- -----------------------------------------------------------------------------
-- Antes, un afiliado podía marcar SU aporte como Pagado por RLS directo (sin
-- pagar). Ahora:
--   • Tesorería / Presidencia: gestionan todo (como siempre).
--   • La pasarela (/api/wompi-confirm, service role, auth.uid() null): acceso total.
--   • El afiliado: solo puede registrar su pago (cambiar status) cuando el sindicato
--     está en modo de recaudo MANUAL ('transferencia'). En nómina o PSE NO puede;
--     ahí lo marca la Tesorería o la pasarela. En ningún caso toca monto/periodo/etc.
-- Idempotente. Ejecutar en el SQL Editor de Supabase.
-- =============================================================================

create or replace function public.enforce_aporte_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  r text := public.app_role();
  v_modo text;
begin
  -- Service role / contexto sin usuario (ej. /api/wompi-confirm): acceso total.
  if auth.uid() is null then
    return new;
  end if;
  -- Tesorería y Presidencia gestionan el aporte por completo.
  if r in ('tesoreria', 'presidencia') then
    return new;
  end if;
  -- El propio afiliado: no puede alterar monto, periodo, tipo, titular, acta ni anticipo.
  if new.amount       is distinct from old.amount
     or new.period    is distinct from old.period
     or new.tipo      is distinct from old.tipo
     or new.affiliate_id is distinct from old.affiliate_id
     or new.acta      is distinct from old.acta
     or new.anticipada is distinct from old.anticipada then
    raise exception 'Solo puedes registrar el pago de tu aporte, no modificar sus datos.';
  end if;
  -- Y solo puede marcar el pago (cambiar status) en modo de recaudo MANUAL.
  if new.status is distinct from old.status then
    select modo_recaudo into v_modo from public.organizations where id = new.org_id;
    if coalesce(v_modo, 'nomina') <> 'transferencia' then
      raise exception 'En este sindicato el pago lo registra la Tesorería o la pasarela, no el afiliado.';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists trg_aporte_columns on public.aportes;
create trigger trg_aporte_columns
  before update on public.aportes
  for each row execute function public.enforce_aporte_columns();

select 'listo: solo Tesoreria/pasarela marca pagado (afiliado solo en modo manual)' as estado;
