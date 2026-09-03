-- =============================================================================
-- SIG-SERDNP · SaaS ETAPA 1 — Fundaci&oacute;n multi-sindicato (multi-tenant)
-- Hace que la base de datos separe la informaci&oacute;n POR SINDICATO: cada
-- organizaci&oacute;n ve y maneja SOLO sus propios datos. Los datos actuales quedan
-- asignados a "SERDNP", as&iacute; que el sistema actual SIGUE FUNCIONANDO IGUAL.
--
-- Idempotente. Ejecutar en el SQL Editor de Supabase.
-- Despu&eacute;s de correrlo: inicia sesi&oacute;n como SERDNP y verifica que todo
-- (afiliados, finanzas, votaciones, etc.) siga viéndose normal.
-- =============================================================================

-- 1) Tabla de organizaciones (sindicatos) --------------------------------------
create table if not exists public.organizations (
  id         uuid primary key default gen_random_uuid(),
  nombre     text not null,
  slug       text unique,
  tipo       text default 'sindicato',
  activo     boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.organizations enable row level security;

-- Organizaci&oacute;n por defecto para TODOS los datos actuales: SERDNP.
insert into public.organizations (id, nombre, slug)
values ('11111111-1111-1111-1111-111111111111', 'SERDNP', 'serdnp')
on conflict (id) do nothing;

-- 2) Perfiles: a qu&eacute; sindicato pertenece cada persona + super-admin --------
alter table public.profiles add column if not exists org_id uuid references public.organizations(id);
alter table public.profiles add column if not exists platform_admin boolean not null default false;
-- Todos los usuarios actuales quedan en SERDNP.
update public.profiles set org_id = '11111111-1111-1111-1111-111111111111' where org_id is null;

-- 3) Funciones de apoyo (SECURITY DEFINER evita recursi&oacute;n de RLS) ----------
-- Sindicato del usuario autenticado.
create or replace function public.current_org()
returns uuid language sql stable security definer set search_path = public as $$
  select org_id from public.profiles where id = auth.uid()
$$;

-- &iquest;Es administrador de la plataforma? (puede ver/gestionar todos los sindicatos)
create or replace function public.is_platform_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select platform_admin from public.profiles where id = auth.uid()), false)
$$;

-- Asigna autom&aacute;ticamente el sindicato al insertar (si no viene dado).
create or replace function public.set_org_id()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.org_id is null then new.org_id := public.current_org(); end if;
  return new;
end $$;

-- 4) Agrega el sindicato a cada tabla transaccional y AISLA por organizaci&oacute;n -
-- Se usa una pol&iacute;tica RESTRICTIVA: se suma (AND) a las reglas de rol que ya
-- existen, sin borrarlas. Resultado: la persona debe cumplir su rol Y pertenecer
-- al sindicato del dato. El admin de plataforma puede cruzar organizaciones.
do $$
declare t text;
begin
  foreach t in array array[
    'affiliates','movements','aportes','cases','sessions','ballots','votes',
    'committees','docs','comunicados','caja_gastos'
  ]
  loop
    -- columna org_id + backfill a SERDNP + &iacute;ndice
    execute format('alter table public.%I add column if not exists org_id uuid references public.organizations(id);', t);
    execute format('update public.%I set org_id = %L where org_id is null;', t, '11111111-1111-1111-1111-111111111111');
    execute format('create index if not exists %I_org_idx on public.%I(org_id);', t, t);
    -- asigna el sindicato solo al insertar
    execute format('drop trigger if exists set_org_%1$s on public.%1$s;', t);
    execute format('create trigger set_org_%1$s before insert on public.%1$s for each row execute function public.set_org_id();', t);
    -- aislamiento por organizaci&oacute;n (se suma a las pol&iacute;ticas de rol)
    execute format('drop policy if exists org_isolation on public.%I;', t);
    execute format($p$create policy org_isolation on public.%I as restrictive for all
      using (org_id = public.current_org() or public.is_platform_admin())
      with check (org_id = public.current_org() or public.is_platform_admin());$p$, t);
  end loop;
end $$;

-- 5) RLS de organizations: cada quien ve su sindicato; el admin ve todos ---------
drop policy if exists orgs_select on public.organizations;
create policy orgs_select on public.organizations for select
  using (id = public.current_org() or public.is_platform_admin());
drop policy if exists orgs_admin on public.organizations;
create policy orgs_admin on public.organizations for all
  using (public.is_platform_admin()) with check (public.is_platform_admin());

-- =============================================================================
-- Verificaci&oacute;n:
--   1) Debe existir la organizaci&oacute;n SERDNP y todos los perfiles con su org_id.
--   2) Ninguna fila de negocio debe quedar sin org_id.
-- =============================================================================
select 'perfiles sin org' as chequeo, count(*) as filas from public.profiles where org_id is null
union all select 'afiliados sin org', count(*) from public.affiliates where org_id is null
union all select 'movimientos sin org', count(*) from public.movements where org_id is null;
-- (Todos deben dar 0.)
