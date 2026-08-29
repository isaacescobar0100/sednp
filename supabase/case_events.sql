-- Bitácora de actuaciones disciplinarias (historial inmutable por expediente).
-- Cada avance, fallo, recurso o actuación manual queda como un registro nuevo,
-- con fecha, responsable y documento adjunto (en Storage). Ejecutar en SQL Editor.

create table if not exists public.case_events (
  id           uuid primary key default gen_random_uuid(),
  case_id      uuid not null references public.cases(id) on delete cascade,
  tipo         text not null,              -- etapa/tipo de actuación
  fecha        text not null default '',
  actor_role   text default '',            -- rol que la realizó
  nota         text default '',
  soporte_path text,                        -- documento adjunto (bucket 'soportes')
  created_at   timestamptz not null default now()
);
create index if not exists case_events_case_idx on public.case_events(case_id);

alter table public.case_events enable row level security;

-- La directiva lee la bitácora; Fiscal y Presidencia registran actuaciones.
drop policy if exists case_events_select on public.case_events;
create policy case_events_select on public.case_events for select
  using (public.is_directiva());

drop policy if exists case_events_insert on public.case_events;
create policy case_events_insert on public.case_events for insert
  with check (public.app_role() in ('fiscal', 'presidencia'));
