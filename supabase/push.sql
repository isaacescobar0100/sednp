-- =============================================================================
-- Notificaciones push: suscripciones de dispositivos (Web Push).
-- Cada persona guarda su(s) dispositivo(s); la directiva puede leerlas para
-- enviar avisos. Multi-tenant. Idempotente. Ejecutar en el SQL Editor.
-- =============================================================================

create table if not exists public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid references public.organizations(id),
  user_id    uuid not null default auth.uid(),
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  created_at timestamptz not null default now()
);
create index if not exists push_org_idx on public.push_subscriptions(org_id);
create index if not exists push_user_idx on public.push_subscriptions(user_id);

alter table public.push_subscriptions enable row level security;

-- Cada quien administra sus propias suscripciones; la directiva las lee para enviar.
drop policy if exists push_select on public.push_subscriptions;
create policy push_select on public.push_subscriptions for select
  using (user_id = auth.uid() or public.is_directiva());

drop policy if exists push_insert on public.push_subscriptions;
create policy push_insert on public.push_subscriptions for insert
  with check (user_id = auth.uid());

drop policy if exists push_update on public.push_subscriptions;
create policy push_update on public.push_subscriptions for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists push_delete on public.push_subscriptions;
create policy push_delete on public.push_subscriptions for delete
  using (user_id = auth.uid() or public.is_directiva());

-- Aislamiento por sindicato.
drop trigger if exists set_org_push on public.push_subscriptions;
create trigger set_org_push before insert on public.push_subscriptions
  for each row execute function public.set_org_id();

drop policy if exists org_isolation on public.push_subscriptions;
create policy org_isolation on public.push_subscriptions as restrictive for all
  using (org_id = public.current_org() or public.is_platform_admin())
  with check (org_id = public.current_org() or public.is_platform_admin());

select 'listo: push' as estado;
