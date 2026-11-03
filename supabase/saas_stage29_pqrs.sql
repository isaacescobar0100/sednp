-- =============================================================================
-- SaaS · Etapa 29 — PQRS (Peticiones, Quejas, Reclamos y Sugerencias)
-- -----------------------------------------------------------------------------
-- Radicación por TRES canales y gestión en la app de la directiva:
--   · 'web'    → página pública del sindicato (cualquier persona, sin sesión),
--                RPC `radicar_pqrs(slug, …)`.
--   · 'portal' → portal del afiliado (sesión iniciada),
--                RPC `radicar_pqrs_afiliado(…)`.
--   · 'presencial' | 'correo' | 'telefono' | 'whatsapp' → la directiva registra
--                una PQRS recibida por otro medio (insert directo, con RLS).
-- Consulta pública del estado: `consultar_pqrs(slug, radicado, correo)`.
--
-- Plazo: 15 días HÁBILES (Ley 1755 de 2015, art. 14), contados desde el día
-- siguiente a la radicación. Solo se excluyen sábados y domingos (no festivos),
-- así que la fecha calculada nunca queda DESPUÉS del plazo legal.
--
-- Gestionan: Presidencia y Secretaría (y el cargo al que se asigne la PQRS).
-- El resto de la directiva la ve en solo lectura. Nadie borra PQRS (trazabilidad).
--
-- Requiere stage1 (current_org, set_org_id, is_platform_admin) y audit_log.sql.
-- Idempotente. Ejecutar en el SQL Editor de Supabase.
-- =============================================================================

-- 1) Tabla --------------------------------------------------------------------
create table if not exists public.pqrs (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid references public.organizations(id) on delete cascade,
  radicado       text not null default '',      -- lo asigna el trigger (PQRS-AAAA-0001)
  tipo           text not null check (tipo in ('peticion','queja','reclamo','sugerencia')),
  canal          text not null default 'web'
                 check (canal in ('web','portal','presencial','correo','telefono','whatsapp')),
  nombre         text not null,
  documento      text,
  email          text not null default '',
  telefono       text,
  asunto         text not null,
  descripcion    text not null,
  acepta_datos   boolean,                       -- autorización de tratamiento de datos (Ley 1581)
  affiliate_id   uuid references public.affiliates(id) on delete set null,
  user_id        uuid references auth.users(id) on delete set null, -- cuenta que radicó (portal)
  estado         text not null default 'radicada'
                 check (estado in ('radicada','en_tramite','respondida','archivada')),
  responsable    text not null default 'secretaria'
                 check (responsable in ('presidencia','vicepresidencia','secretaria','tesoreria','fiscal')),
  respuesta      text,
  respondida_at  timestamptz,
  respondida_por text,
  vence_at       date,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create unique index if not exists pqrs_org_radicado_uq on public.pqrs(org_id, radicado);
create index if not exists pqrs_org_idx on public.pqrs(org_id);
create index if not exists pqrs_org_estado_idx on public.pqrs(org_id, estado);
create index if not exists pqrs_user_idx on public.pqrs(user_id);

alter table public.pqrs enable row level security;

-- 2) Días hábiles (lunes a viernes) --------------------------------------------
create or replace function public.pqrs_sumar_habiles(p_desde date, p_dias integer)
returns date
language plpgsql immutable set search_path = public as $$
declare d date := p_desde; n integer := 0;
begin
  while n < p_dias loop
    d := d + 1;
    if extract(isodow from d) < 6 then n := n + 1; end if;
  end loop;
  return d;
end $$;

-- 3) Al radicar: consecutivo, plazo y estado inicial (lo decide el servidor) ---
create or replace function public.pqrs_antes_insert()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_hoy  date := (now() at time zone 'America/Bogota')::date;
  v_anio text := to_char(now() at time zone 'America/Bogota', 'YYYY');
  v_n    integer;
begin
  if new.org_id is null then new.org_id := public.current_org(); end if;
  if new.org_id is null then raise exception 'No se pudo determinar el sindicato de la PQRS.'; end if;

  -- Un radicado a la vez por sindicato (evita números repetidos en paralelo).
  perform pg_advisory_xact_lock(hashtext('pqrs:' || new.org_id::text));
  select coalesce(max(nullif(split_part(radicado, '-', 3), '')::integer), 0) + 1
    into v_n
    from public.pqrs
   where org_id = new.org_id and radicado like 'PQRS-' || v_anio || '-%';

  new.radicado       := 'PQRS-' || v_anio || '-' || lpad(v_n::text, 4, '0');
  new.vence_at       := public.pqrs_sumar_habiles(v_hoy, 15);
  new.estado         := 'radicada';
  new.respuesta      := null;
  new.respondida_at  := null;
  new.respondida_por := null;
  new.created_at     := now();
  new.updated_at     := now();
  new.email          := lower(trim(coalesce(new.email, '')));
  if coalesce(trim(new.responsable), '') = '' then new.responsable := 'secretaria'; end if;
  return new;
end $$;

drop trigger if exists pqrs_antes_insert on public.pqrs;
create trigger pqrs_antes_insert before insert on public.pqrs
  for each row execute function public.pqrs_antes_insert();

-- 4) Al gestionar: lo que radicó el ciudadano NO se puede alterar --------------
create or replace function public.pqrs_antes_update()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.id           := old.id;
  new.org_id       := old.org_id;
  new.radicado     := old.radicado;
  new.canal        := old.canal;
  new.nombre       := old.nombre;
  new.documento    := old.documento;
  new.email        := old.email;
  new.telefono     := old.telefono;
  new.asunto       := old.asunto;
  new.descripcion  := old.descripcion;
  new.acepta_datos := old.acepta_datos;
  new.affiliate_id := old.affiliate_id;
  new.user_id      := old.user_id;
  new.vence_at     := old.vence_at;
  new.created_at   := old.created_at;
  new.updated_at   := now();

  if new.estado = 'respondida' then
    if coalesce(trim(new.respuesta), '') = '' then
      raise exception 'Para marcar la PQRS como respondida hay que escribir la respuesta.';
    end if;
    if old.estado is distinct from 'respondida' then
      new.respondida_at  := now();
      new.respondida_por := (select nullif(trim(full_name), '') from public.profiles where id = auth.uid());
    else
      new.respondida_at  := old.respondida_at;
      new.respondida_por := old.respondida_por;
    end if;
  else
    new.respondida_at  := null;
    new.respondida_por := null;
  end if;
  return new;
end $$;

drop trigger if exists pqrs_antes_update on public.pqrs;
create trigger pqrs_antes_update before update on public.pqrs
  for each row execute function public.pqrs_antes_update();

-- 5) Permisos (RLS) -------------------------------------------------------------
-- Ve: toda la directiva; el afiliado, solo las suyas.
drop policy if exists pqrs_select on public.pqrs;
create policy pqrs_select on public.pqrs for select
  using (public.is_directiva() or user_id = auth.uid());

-- Registra (recibida por otro medio): Presidencia / Secretaría. Los canales web
-- y portal solo entran por sus RPCs.
drop policy if exists pqrs_insert on public.pqrs;
create policy pqrs_insert on public.pqrs for insert
  with check (
    public.app_role() in ('presidencia','secretaria')
    and canal in ('presencial','correo','telefono','whatsapp')
    and user_id is null
  );

-- Gestiona: Presidencia / Secretaría, o el cargo al que esté asignada.
drop policy if exists pqrs_update on public.pqrs;
create policy pqrs_update on public.pqrs for update
  using (public.app_role() in ('presidencia','secretaria') or public.app_role()::text = responsable)
  with check (public.app_role() in ('presidencia','secretaria') or public.app_role()::text = responsable);

-- (Sin política de DELETE: las PQRS no se borran.)

-- Aislamiento por sindicato (RESTRICTIVA: se suma a las reglas anteriores).
drop policy if exists org_isolation on public.pqrs;
create policy org_isolation on public.pqrs as restrictive for all
  using (org_id = public.current_org() or public.is_platform_admin())
  with check (org_id = public.current_org() or public.is_platform_admin());

-- Auditoría (misma bitácora que el resto de módulos).
drop trigger if exists audit_pqrs on public.pqrs;
create trigger audit_pqrs after insert or update or delete on public.pqrs
  for each row execute function public.audit_trigger();

-- 6) Anti-abuso compartido por las RPCs de radicación ---------------------------
create or replace function public.pqrs_validar_limites(p_org uuid, p_email text)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.pqrs
       where org_id = p_org and email = lower(trim(p_email))
         and created_at > now() - interval '24 hours') >= 5 then
    raise exception 'Ya radicaste varias PQRS hoy con este correo. Espera la respuesta o intenta mañana.';
  end if;
  if (select count(*) from public.pqrs
       where org_id = p_org and canal in ('web','portal')
         and created_at > now() - interval '10 minutes') >= 30 then
    raise exception 'Estamos recibiendo muchas solicitudes en este momento. Intenta de nuevo en unos minutos.';
  end if;
end $$;
revoke execute on function public.pqrs_validar_limites(uuid, text) from public, anon, authenticated;

-- 7) Radicar desde la PÁGINA WEB (anónimo) --------------------------------------
create or replace function public.radicar_pqrs(
  p_slug         text,
  p_tipo         text,
  p_nombre       text,
  p_documento    text,
  p_email        text,
  p_telefono     text,
  p_asunto       text,
  p_descripcion  text,
  p_acepta_datos boolean
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_org uuid;
  v_row public.pqrs;
begin
  select id into v_org from public.organizations where slug = p_slug and activo = true limit 1;
  if v_org is null then raise exception 'El sindicato no está disponible.'; end if;

  if coalesce(p_tipo,'') not in ('peticion','queja','reclamo','sugerencia') then
    raise exception 'Tipo de PQRS no válido.';
  end if;
  if coalesce(trim(p_nombre),'') = '' or coalesce(trim(p_email),'') = ''
     or coalesce(trim(p_asunto),'') = '' or coalesce(trim(p_descripcion),'') = '' then
    raise exception 'Faltan datos obligatorios (nombre, correo, asunto y descripción).';
  end if;
  if trim(p_email) !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' then raise exception 'El correo no es válido.'; end if;
  if length(p_nombre) > 150 or length(coalesce(p_documento,'')) > 30 or length(p_email) > 200
     or length(coalesce(p_telefono,'')) > 30 or length(p_asunto) > 200 or length(p_descripcion) > 5000 then
    raise exception 'Algún campo supera la longitud permitida.';
  end if;
  if coalesce(p_acepta_datos, false) = false then
    raise exception 'Debes autorizar el tratamiento de tus datos personales para radicar la PQRS.';
  end if;

  perform public.pqrs_validar_limites(v_org, p_email);

  insert into public.pqrs (org_id, radicado, tipo, canal, nombre, documento, email, telefono, asunto, descripcion, acepta_datos)
  values (v_org, '', p_tipo, 'web', trim(p_nombre), nullif(trim(coalesce(p_documento,'')),''), p_email,
          nullif(trim(coalesce(p_telefono,'')),''), trim(p_asunto), trim(p_descripcion), true)
  returning * into v_row;

  return jsonb_build_object('radicado', v_row.radicado, 'venceAt', v_row.vence_at);
end $$;
grant execute on function public.radicar_pqrs(text,text,text,text,text,text,text,text,boolean) to anon, authenticated;

-- 8) Radicar desde el PORTAL DEL AFILIADO (con sesión) --------------------------
create or replace function public.radicar_pqrs_afiliado(
  p_tipo        text,
  p_asunto      text,
  p_descripcion text
) returns jsonb
language plpgsql security definer set search_path = public, auth as $$
declare
  v_uid   uuid := auth.uid();
  v_org   uuid := public.current_org();
  v_email text;
  v_af    public.affiliates;
  v_row   public.pqrs;
begin
  if v_uid is null or v_org is null then raise exception 'Debes iniciar sesión.'; end if;
  select lower(email) into v_email from auth.users where id = v_uid;

  select * into v_af from public.affiliates
   where org_id = v_org and status = 'Activo'
     and (user_id = v_uid or lower(trim(email)) = v_email)
   order by (user_id = v_uid) desc nulls last
   limit 1;
  if v_af.id is null then raise exception 'Tu cuenta no está vinculada a una afiliación activa.'; end if;

  if coalesce(p_tipo,'') not in ('peticion','queja','reclamo','sugerencia') then
    raise exception 'Tipo de PQRS no válido.';
  end if;
  if coalesce(trim(p_asunto),'') = '' or coalesce(trim(p_descripcion),'') = '' then
    raise exception 'Escribe el asunto y la descripción.';
  end if;
  if length(p_asunto) > 200 or length(p_descripcion) > 5000 then
    raise exception 'Algún campo supera la longitud permitida.';
  end if;

  perform public.pqrs_validar_limites(v_org, coalesce(nullif(v_af.email,''), v_email));

  insert into public.pqrs (org_id, radicado, tipo, canal, nombre, documento, email, telefono, asunto, descripcion, affiliate_id, user_id)
  values (v_org, '', p_tipo, 'portal', v_af.name, nullif(v_af.doc,''), coalesce(nullif(v_af.email,''), v_email),
          nullif(v_af.phone,''), trim(p_asunto), trim(p_descripcion), v_af.id, v_uid)
  returning * into v_row;

  return jsonb_build_object('radicado', v_row.radicado, 'venceAt', v_row.vence_at);
end $$;
revoke execute on function public.radicar_pqrs_afiliado(text,text,text) from public, anon;
grant execute on function public.radicar_pqrs_afiliado(text,text,text) to authenticated;

-- 9) Consulta pública del estado (radicado + correo) ---------------------------
create or replace function public.consultar_pqrs(p_slug text, p_radicado text, p_email text)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v_org uuid; result jsonb;
begin
  select id into v_org from public.organizations where slug = p_slug and activo = true limit 1;
  if v_org is null or coalesce(trim(p_radicado),'') = '' or coalesce(trim(p_email),'') = '' then
    return '{}'::jsonb;
  end if;
  select jsonb_build_object(
    'radicado', radicado, 'tipo', tipo, 'asunto', asunto, 'estado', estado,
    'createdAt', created_at, 'venceAt', vence_at,
    'respuesta', case when estado = 'respondida' then respuesta end,
    'respondidaAt', respondida_at
  ) into result
  from public.pqrs
  where org_id = v_org
    and upper(radicado) = upper(trim(p_radicado))
    and email = lower(trim(p_email))
  limit 1;
  return coalesce(result, '{}'::jsonb);
end $$;
grant execute on function public.consultar_pqrs(text,text,text) to anon, authenticated;

select 'listo: PQRS (tabla, RLS, radicación web/portal, consulta pública)' as estado;
