-- =============================================================================
-- SaaS · Etapa 22 — COMPROBANTE DE PAGO EN APORTES (evidencia de transferencia)
-- -----------------------------------------------------------------------------
-- Cuando el recaudo es por transferencia, el afiliado registra su pago y adjunta
-- el comprobante (imagen/PDF). Se guarda la RUTA del archivo en Storage (bucket
-- 'soportes', carpeta del sindicato). El trigger enforce_aporte_columns YA permite
-- que el afiliado toque columnas distintas de monto/periodo/tipo/titular/acta, así
-- que basta con crear la columna. Idempotente.
-- =============================================================================

alter table public.aportes add column if not exists comprobante_path text;

select 'listo: columna comprobante_path en aportes' as estado;
