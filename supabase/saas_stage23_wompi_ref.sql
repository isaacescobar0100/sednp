-- =============================================================================
-- SaaS · Etapa 23 — TRAZABILIDAD DE PAGOS PSE (número de transacción Wompi)
-- -----------------------------------------------------------------------------
-- Al confirmar un pago por PSE, el endpoint /api/wompi-confirm guarda aquí el id
-- de la transacción de Wompi. Sirve como "número de recibo" para que Tesorería y
-- el afiliado puedan rastrear el pago en el panel de Wompi. Idempotente.
-- =============================================================================

alter table public.aportes add column if not exists wompi_ref text;

select 'listo: columna wompi_ref en aportes' as estado;
