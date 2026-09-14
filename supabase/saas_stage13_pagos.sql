-- =============================================================================
-- SaaS · Etapa 13 — HISTORIAL DE PAGOS + CONTACTO DEL CLIENTE (Opción A: manual)
-- -----------------------------------------------------------------------------
-- Registra cada renovación pagada (por transferencia/PSE a la cuenta del dueño)
-- para llevar contabilidad y poder emitir recibos. Solo el administrador de la
-- plataforma puede ver/gestionar pagos. Correr una vez en el SQL Editor.
-- =============================================================================

create table if not exists public.pagos (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.organizations(id) on delete cascade,
  monto       bigint not null default 0,
  periodo     text,                         -- año/rango cubierto (ej. "2026 → 2027")
  metodo      text default 'Transferencia', -- Transferencia / PSE / Efectivo / Otro
  fecha_pago  date not null default current_date,
  vence_nuevo date,                         -- vencimiento resultante tras el pago
  nota        text,
  created_at  timestamptz not null default now()
);
create index if not exists pagos_org_idx on public.pagos(org_id, fecha_pago desc);
alter table public.pagos enable row level security;

-- Solo el administrador de la plataforma ve y gestiona los pagos.
drop policy if exists pagos_admin on public.pagos;
create policy pagos_admin on public.pagos for all
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

-- Datos de contacto del cliente (para el cobro y el soporte).
alter table public.organizations add column if not exists contacto_nombre   text;
alter table public.organizations add column if not exists contacto_telefono text;

select 'listo: pagos + contacto' as estado;
