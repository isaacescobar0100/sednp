-- =============================================================================
-- Libro de Actas y Resoluciones + Concepto del Fiscal (tipo acta, con evidencia)
-- + Asistencia a sesiones (se anexa al acta).
--
-- - Tabla `actos`: registros institucionales INMUTABLES (concepto del Fiscal,
--   resolución de afiliación, etc.). No se pueden editar ni borrar (append-only).
-- - Columna `asistentes_lista` en `sessions`: la lista de asistentes que queda
--   anexa al acta.
--
-- Multi-tenant: usa current_org()/set_org_id()/is_platform_admin() de la Etapa 1.
-- Idempotente. Ejecutar en el SQL Editor de Supabase.
-- =============================================================================

-- 1) LIBRO DE ACTAS Y RESOLUCIONES --------------------------------------------
create table if not exists public.actos (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid references public.organizations(id),
  tipo         text not null,              -- 'Concepto del Fiscal' | 'Resolución de afiliación' | ...
  numero       text default '',            -- consecutivo: CF-2026-001, RA-2026-001
  titulo       text not null default '',
  cuerpo       text default '',            -- desarrollo / motivación
  referencia   text default '',            -- p. ej. nombre y documento del afiliado
  affiliate_id uuid references public.affiliates(id) on delete set null,
  resultado    text default '',            -- p. ej. 'Positivo'/'Negativo' en conceptos
  actor_role   text default '',            -- rol de quien lo emitió
  soporte_path text,                        -- evidencia (bucket privado 'soportes')
  fecha        text not null default '',
  created_at   timestamptz not null default now()
);
create index if not exists actos_created_idx on public.actos(created_at desc);
create index if not exists actos_affiliate_idx on public.actos(affiliate_id);
create index if not exists actos_org_idx on public.actos(org_id);

alter table public.actos enable row level security;

-- La directiva lee el libro. Cualquier cargo de la directiva puede registrar un
-- acto (el frontend expone cada tipo al rol que corresponde). SIN políticas de
-- update/delete: los registros quedan inmutables (como un libro de actas).
drop policy if exists actos_select on public.actos;
create policy actos_select on public.actos for select
  using (public.is_directiva());

drop policy if exists actos_insert on public.actos;
create policy actos_insert on public.actos for insert
  with check (public.is_directiva());

-- Aislamiento por sindicato (se suma a lo anterior).
drop trigger if exists set_org_actos on public.actos;
create trigger set_org_actos before insert on public.actos
  for each row execute function public.set_org_id();

drop policy if exists org_isolation on public.actos;
create policy org_isolation on public.actos as restrictive for all
  using (org_id = public.current_org() or public.is_platform_admin())
  with check (org_id = public.current_org() or public.is_platform_admin());

-- 2) ASISTENCIA A SESIONES (se anexa al acta) ---------------------------------
alter table public.sessions add column if not exists asistentes_lista jsonb not null default '[]'::jsonb;

-- =============================================================================
-- Verificación
-- =============================================================================
select 'actos' as tabla, count(*) as filas from public.actos;
