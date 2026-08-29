-- =============================================================================
-- SIG-SERDNP · Esquema de base de datos (Supabase / PostgreSQL)
-- Ejecutar en el editor SQL de Supabase. Idempotente en lo posible.
-- Modela los módulos del sistema y aplica RLS por rol (separación de funciones).
-- =============================================================================

-- Extensiones -----------------------------------------------------------------
create extension if not exists "pgcrypto";

-- =============================================================================
-- 1. PERFILES Y ROLES
-- =============================================================================
-- Rol de la persona dentro del sistema. 'afiliado' es el usuario del portal.
do $$ begin
  create type app_role as enum (
    'presidencia','vicepresidencia','secretaria','tesoreria','fiscal','afiliado'
  );
exception when duplicate_object then null; end $$;

-- Un perfil por cada cuenta de auth.users.
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text not null default '',
  role        app_role not null default 'afiliado',
  initials    text default '',
  created_at  timestamptz not null default now()
);

-- Rol del usuario autenticado (para políticas). SECURITY DEFINER evita recursión RLS.
create or replace function public.app_role()
returns app_role
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid()
$$;

-- ¿El usuario pertenece a la Junta Directiva (no es afiliado)?
create or replace function public.is_directiva()
returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.app_role() <> 'afiliado', false)
$$;

-- Al crear una cuenta de auth, se crea su perfil automáticamente.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce((new.raw_user_meta_data->>'role')::app_role, 'afiliado')
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =============================================================================
-- 2. AFILIADOS
-- =============================================================================
create table if not exists public.affiliates (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid references auth.users(id) on delete set null, -- cuenta del portal
  name              text not null,
  doc               text not null,
  role              text default '',            -- cargo que ocupa
  cargo_titular     text default '',
  dependency        text default '',
  type              text default '',            -- tipo de vinculación
  asignacion_basica numeric(15,2) not null default 0,
  email             text default '',
  phone             text default '',
  address           text default '',
  beneficios        text[] not null default '{}',
  medio             text default '',
  motivo            text default '',
  interes_comites   text default '',
  solicitud_no      text default '',
  concepto_fiscal   text check (concepto_fiscal in ('Positivo','Negativo')),
  aprobacion_acta   text,
  aprobacion_fecha  text,
  join_date         text default '',
  status            text not null default 'Pendiente'
                      check (status in ('Pendiente','Activo','Suspendido','Retirado')),
  created_at        timestamptz not null default now()
);
create index if not exists affiliates_status_idx on public.affiliates(status);
create index if not exists affiliates_user_idx on public.affiliates(user_id);

-- =============================================================================
-- 3. FINANCIERO
-- =============================================================================
create table if not exists public.movements (
  id            uuid primary key default gen_random_uuid(),
  date          text not null,
  concept       text not null,
  category      text not null,
  kind          text not null check (kind in ('Ingreso','Egreso')),
  amount        numeric(15,2) not null,
  status        text not null check (status in ('Confirmado','Por aprobar','Aprobado','Pagado','Rechazado')),
  nivel         text check (nivel in ('tesoreria','junta','jd_asamblea','asamblea')),
  firma_presidente boolean not null default false,
  firma_tesorero   boolean not null default false,
  firma_fiscal     boolean not null default false,
  orden_pago    text,
  acta_asamblea text,
  created_at    timestamptz not null default now()
);

create table if not exists public.presupuestos (
  category text primary key,
  anual    numeric(15,2) not null default 0
);

create table if not exists public.cuentas (
  codigo     text primary key,
  nombre     text not null,
  tipo       text not null check (tipo in ('Activo','Ingreso','Gasto')),
  naturaleza text not null check (naturaleza in ('Débito','Crédito')),
  activa     boolean not null default true
);

create table if not exists public.caja_gastos (
  id       uuid primary key default gen_random_uuid(),
  date     text not null,
  concepto text not null,
  monto    numeric(15,2) not null,
  soporte  text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.aportes (
  id           uuid primary key default gen_random_uuid(),
  affiliate_id uuid not null references public.affiliates(id) on delete cascade,
  period       text not null,               -- 'YYYY-MM'
  amount       numeric(15,2) not null,
  tipo         text not null default 'Ordinaria' check (tipo in ('Ordinaria','Extraordinaria')),
  status       text not null default 'Pendiente' check (status in ('Pendiente','Pagado')),
  acta         text,
  anticipada   boolean not null default false,
  paid_date    text,
  method       text check (method in ('Portal','Nómina')),
  created_at   timestamptz not null default now()
);
create index if not exists aportes_affiliate_idx on public.aportes(affiliate_id);
create index if not exists aportes_period_idx on public.aportes(period);

-- =============================================================================
-- 4. DISCIPLINARIO
-- =============================================================================
create table if not exists public.cases (
  id                uuid primary key default gen_random_uuid(),
  code              text not null,
  subject           text not null,
  person            text default '',
  opened_date       text default '',
  stage_index       int not null default 0,
  days_left         int not null default 0,
  status            text not null default 'En trámite' check (status in ('En trámite','Con fallo','Archivado')),
  sancion           text check (sancion in ('Amonestación','Multa','Exclusión','Absuelto')),
  multa_monto       numeric(15,2),
  recurso_tipo      text check (recurso_tipo in ('Reposición','Apelación')),
  recurso_estado    text check (recurso_estado in ('Interpuesto','Resuelto')),
  recurso_resultado text check (recurso_resultado in ('Confirma','Revoca')),
  created_at        timestamptz not null default now()
);

-- =============================================================================
-- 5. GOBERNANZA
-- =============================================================================
create table if not exists public.sessions (
  id         uuid primary key default gen_random_uuid(),
  day        text, month text,
  title      text not null,
  detail     text default '',
  organ      text default '',
  status     text not null default 'Programada' check (status in ('Programada','Realizada','Cancelada')),
  minutes    text,
  asistentes int,
  quorum     boolean,
  created_at timestamptz not null default now()
);

create table if not exists public.ballots (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  closes_at  text default '',
  favor      int not null default 0,
  contra     int not null default 0,
  abstencion int not null default 0,
  status     text not null default 'En curso' check (status in ('En curso','Cerrada')),
  outcome    text check (outcome in ('Aprobada','Rechazada')),
  secreta    boolean not null default false,
  created_at timestamptz not null default now()
);

-- Voto individual: permite evitar doble voto y mantener el secreto (RLS).
create table if not exists public.votes (
  ballot_id uuid not null references public.ballots(id) on delete cascade,
  voter_id  uuid not null references auth.users(id) on delete cascade,
  choice    text not null check (choice in ('favor','contra','abstencion')),
  created_at timestamptz not null default now(),
  primary key (ballot_id, voter_id)
);

-- =============================================================================
-- 6. COMITÉS, DOCUMENTAL, COMUNICACIONES, CATÁLOGOS Y PARÁMETROS
-- =============================================================================
create table if not exists public.committees (
  id       uuid primary key default gen_random_uuid(),
  name     text not null,
  lead     text default 'Por designar',
  members  text[] not null default '{}',
  next     text default 'Por programar',
  activity text default '',
  color    text default 'bg-night',
  tipo     text check (tipo in ('Temático','Estatutario'))
);

create table if not exists public.docs (
  id           uuid primary key default gen_random_uuid(),
  code         text not null,
  title        text not null,
  type         text not null,
  file_name    text default '',
  file_size    bigint not null default 0,
  storage_path text,                          -- ruta en Supabase Storage
  date         text default '',
  created_at   timestamptz not null default now()
);

create table if not exists public.comunicados (
  id        uuid primary key default gen_random_uuid(),
  subject   text not null,
  body      text default '',
  audience  text default '',
  date      text default '',
  status    text not null default 'Entregado',
  created_at timestamptz not null default now()
);

create table if not exists public.cargos        (name text primary key);
create table if not exists public.dependencias  (name text primary key);
create table if not exists public.vinculaciones (
  id    uuid primary key default gen_random_uuid(),
  name  text not null,
  color text default ''
);

-- Escalas salariales (Decreto anual de la Función Pública): nivel/grado → asignación básica.
create table if not exists public.escalas (
  id                uuid primary key default gen_random_uuid(),
  nivel             text not null,
  grado             text not null,
  asignacion_basica numeric(15,2) not null default 0,
  unique (nivel, grado)
);

-- Parámetros del sistema (una sola fila).
create table if not exists public.params (
  id               int primary key default 1 check (id = 1),
  porcentaje_cuota numeric not null default 0.003,
  smmlv            numeric not null default 1423500,
  caucion_vence    text default '',
  junta_desde      text default '',
  caja_fondo       numeric not null default 0
);
insert into public.params (id) values (1) on conflict (id) do nothing;

-- =============================================================================
-- 7. ROW LEVEL SECURITY
-- =============================================================================
-- Habilitar RLS en todas las tablas de negocio.
alter table public.profiles      enable row level security;
alter table public.affiliates    enable row level security;
alter table public.movements     enable row level security;
alter table public.presupuestos  enable row level security;
alter table public.cuentas       enable row level security;
alter table public.caja_gastos   enable row level security;
alter table public.aportes       enable row level security;
alter table public.cases         enable row level security;
alter table public.sessions      enable row level security;
alter table public.ballots       enable row level security;
alter table public.votes         enable row level security;
alter table public.committees    enable row level security;
alter table public.docs          enable row level security;
alter table public.comunicados   enable row level security;
alter table public.cargos        enable row level security;
alter table public.dependencias  enable row level security;
alter table public.vinculaciones enable row level security;
alter table public.escalas       enable row level security;
alter table public.params        enable row level security;

-- PROFILES: cada quien ve su perfil; la directiva ve todos.
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select
  using (id = auth.uid() or public.is_directiva());
drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles for update
  using (id = auth.uid()) with check (id = auth.uid());

-- AFILIADOS: la directiva ve todos; el afiliado ve solo su ficha.
drop policy if exists affiliates_select on public.affiliates;
create policy affiliates_select on public.affiliates for select
  using (public.is_directiva() or user_id = auth.uid());
-- Registro: Secretaría y Presidencia.
drop policy if exists affiliates_insert on public.affiliates;
create policy affiliates_insert on public.affiliates for insert
  with check (public.app_role() in ('secretaria','presidencia'));
-- Gestión: Secretaría (datos), Fiscal (concepto) y Presidencia (aprobación/estado).
drop policy if exists affiliates_update on public.affiliates;
create policy affiliates_update on public.affiliates for update
  using (public.app_role() in ('secretaria','fiscal','presidencia'))
  with check (public.app_role() in ('secretaria','fiscal','presidencia'));

-- MOVIMIENTOS: directiva lee; Tesorería registra; Presidencia/Tesorería/Fiscal gestionan.
drop policy if exists movements_select on public.movements;
create policy movements_select on public.movements for select using (public.is_directiva());
drop policy if exists movements_insert on public.movements;
create policy movements_insert on public.movements for insert
  with check (public.app_role() in ('tesoreria'));
drop policy if exists movements_update on public.movements;
create policy movements_update on public.movements for update
  using (public.app_role() in ('tesoreria','presidencia','fiscal'))
  with check (public.app_role() in ('tesoreria','presidencia','fiscal'));

-- APORTES: directiva y el propio afiliado leen; Tesorería genera; afiliado paga el suyo.
drop policy if exists aportes_select on public.aportes;
create policy aportes_select on public.aportes for select
  using (public.is_directiva() or affiliate_id in (select id from public.affiliates where user_id = auth.uid()));
drop policy if exists aportes_insert on public.aportes;
create policy aportes_insert on public.aportes for insert
  with check (public.app_role() in ('tesoreria','presidencia'));
drop policy if exists aportes_update on public.aportes;
create policy aportes_update on public.aportes for update
  using (public.app_role() = 'tesoreria'
         or affiliate_id in (select id from public.affiliates where user_id = auth.uid()))
  with check (true);

-- CASES: Fiscal instruye; Presidencia falla; directiva lee.
drop policy if exists cases_select on public.cases;
create policy cases_select on public.cases for select using (public.is_directiva());
drop policy if exists cases_insert on public.cases;
create policy cases_insert on public.cases for insert with check (public.app_role() = 'fiscal');
drop policy if exists cases_update on public.cases;
create policy cases_update on public.cases for update
  using (public.app_role() in ('fiscal','presidencia'))
  with check (public.app_role() in ('fiscal','presidencia'));

-- GOBERNANZA: directiva lee; Secretaría/Presidencia gestionan; afiliado ve votaciones.
drop policy if exists sessions_all on public.sessions;
create policy sessions_all on public.sessions for all
  using (public.is_directiva())
  with check (public.app_role() in ('secretaria','presidencia'));

drop policy if exists ballots_select on public.ballots;
create policy ballots_select on public.ballots for select using (true); -- afiliados también votan
drop policy if exists ballots_write on public.ballots;
create policy ballots_write on public.ballots for all
  using (public.app_role() in ('secretaria','presidencia'))
  with check (public.app_role() in ('secretaria','presidencia'));

-- VOTES: cada quien inserta su voto y solo ve el suyo (secreto).
drop policy if exists votes_insert on public.votes;
create policy votes_insert on public.votes for insert with check (voter_id = auth.uid());
drop policy if exists votes_select_own on public.votes;
create policy votes_select_own on public.votes for select using (voter_id = auth.uid());

-- COMITÉS / DOCUMENTAL / COMUNICACIONES: directiva lee; Secretaría/Presidencia gestionan.
drop policy if exists committees_select on public.committees;
create policy committees_select on public.committees for select using (true);
drop policy if exists committees_write on public.committees;
create policy committees_write on public.committees for all
  using (public.app_role() in ('secretaria','presidencia'))
  with check (public.app_role() in ('secretaria','presidencia'));

drop policy if exists docs_select on public.docs;
create policy docs_select on public.docs for select using (true); -- afiliados ven documentos
drop policy if exists docs_write on public.docs;
create policy docs_write on public.docs for all
  using (public.app_role() in ('secretaria','presidencia'))
  with check (public.app_role() in ('secretaria','presidencia'));

drop policy if exists comunicados_select on public.comunicados;
create policy comunicados_select on public.comunicados for select using (true);
drop policy if exists comunicados_write on public.comunicados;
create policy comunicados_write on public.comunicados for all
  using (public.app_role() in ('secretaria','presidencia'))
  with check (public.app_role() in ('secretaria','presidencia'));

-- CATÁLOGOS Y PARÁMETROS Y FINANCIERO AUX: directiva lee; Secretaría/Presidencia/Tesorería gestionan.
do $$
declare t text;
begin
  foreach t in array array['cargos','dependencias','vinculaciones','escalas','presupuestos','cuentas','caja_gastos','params']
  loop
    execute format('drop policy if exists %I_select on public.%I;', t, t);
    execute format('create policy %I_select on public.%I for select using (true);', t, t);
    execute format('drop policy if exists %I_write on public.%I;', t, t);
    execute format($f$create policy %I_write on public.%I for all
      using (public.app_role() in ('secretaria','presidencia','tesoreria'))
      with check (public.app_role() in ('secretaria','presidencia','tesoreria'));$f$, t, t);
  end loop;
end $$;

-- =============================================================================
-- 8. SEMILLAS (catálogos base)
-- =============================================================================
insert into public.cargos(name) values
  ('Profesional especializado'),('Asesor'),('Profesional universitario'),('Gestor'),
  ('Técnico administrativo'),('Auxiliar administrativo'),('Director técnico'),
  ('Coordinador de grupo'),('Analista'),('Contratista de apoyo')
on conflict do nothing;

insert into public.dependencias(name) values
  ('Dirección General'),('Subdirección Territorial'),('Dirección de Inversiones'),
  ('Oficina de Planeación'),('Dirección de Desarrollo Social'),('Secretaría General'),
  ('Oficina Jurídica'),('Dirección de Regalías'),('Oficina de Tecnología'),
  ('Dirección de Seguimiento y Evaluación')
on conflict do nothing;

insert into public.cuentas(codigo,nombre,tipo,naturaleza) values
  ('1110','Bancos (Cuenta Banco Popular)','Activo','Débito'),
  ('1105','Caja menor','Activo','Débito'),
  ('41051001','Cuotas ordinarias (0,3% asignación básica)','Ingreso','Crédito'),
  ('41052001','Cuotas extraordinarias','Ingreso','Crédito'),
  ('41053001','Multas y sanciones pecuniarias','Ingreso','Crédito'),
  ('421010','Intereses y rendimientos financieros','Ingreso','Crédito'),
  ('511010','Asesoría jurídica','Gasto','Débito'),
  ('5155','Gastos de oficina','Gasto','Débito'),
  ('5195','Actividades sindicales / Bienestar','Gasto','Débito'),
  ('530505','Gravamen movimientos financieros (GMF)','Gasto','Débito')
on conflict do nothing;

insert into public.presupuestos(category,anual) values
  ('Bienestar',0),('Formación',0),('Defensa',0),('Operación',0)
on conflict do nothing;
