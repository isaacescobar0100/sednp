-- =============================================================================
-- ENDURECIMIENTO DE CUENTAS (seguridad).
--
-- Problema: crear una cuenta/afiliado con un correo QUE YA EXISTE reescribía la
-- contraseña de esa cuenta. En el formulario público de auto-afiliación esto
-- permitía, en teoría, resetear la clave de un miembro existente (robo de cuenta).
--
-- Solución: si el correo ya existe, se RECHAZA (nunca se toca una cuenta ya
-- creada). El restablecimiento de contraseña será un flujo aparte y deliberado.
--
-- Idempotente. Ejecutar en el SQL Editor de Supabase.
-- =============================================================================

create extension if not exists pgcrypto;

-- 1) crear_cuenta_persona: rechaza correos existentes ------------------------
create or replace function public.crear_cuenta_persona(
  p_email text, p_password text, p_nombre text, p_rol app_role
) returns uuid
language plpgsql security definer set search_path = public, auth, extensions
as $$
declare v_org uuid := public.current_org(); uid uuid;
begin
  if public.app_role() not in ('presidencia','secretaria') then
    raise exception 'Solo la Presidencia o la Secretaría puede crear cuentas';
  end if;
  if v_org is null then raise exception 'No se pudo determinar tu sindicato'; end if;

  -- Nunca reescribir una cuenta existente.
  if exists (select 1 from auth.users where lower(email) = lower(p_email)) then
    raise exception 'Ese correo ya tiene una cuenta. Usa otro correo (restablecer contraseña es un flujo aparte).';
  end if;

  uid := gen_random_uuid();
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data,
    confirmation_token, recovery_token, email_change_token_new, email_change
  ) values (
    '00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated',
    lower(p_email), crypt(p_password, gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}',
    jsonb_build_object('full_name', p_nombre),
    '', '', '', ''
  );
  insert into auth.identities (
    provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
  ) values (
    uid::text, uid, jsonb_build_object('sub', uid::text, 'email', lower(p_email)),
    'email', now(), now(), now()
  );
  insert into public.profiles (id, full_name, role, org_id)
  values (uid, p_nombre, p_rol, v_org)
  on conflict (id) do nothing;
  return uid;
end $$;
grant execute on function public.crear_cuenta_persona(text,text,text,app_role) to authenticated;

-- 2) solicitar_afiliacion (público): rechaza correos existentes --------------
create or replace function public.solicitar_afiliacion(
  p_slug text, p_nombres text, p_apellidos text, p_doc text, p_email text,
  p_telefono text, p_direccion text, p_password text, p_extra jsonb default '{}'::jsonb
) returns text
language plpgsql security definer set search_path = public, auth, extensions
as $$
declare
  v_org uuid; v_nombre text := trim(coalesce(p_nombres,'') || ' ' || coalesce(p_apellidos,''));
  uid uuid; v_n integer; v_sol text; v_benef text[];
begin
  select id into v_org from public.organizations where slug = p_slug and activo = true limit 1;
  if v_org is null then raise exception 'El enlace de afiliación no es válido o el sindicato no está activo.'; end if;

  if v_nombre = '' or coalesce(trim(p_doc),'') = '' or coalesce(trim(p_email),'') = '' or coalesce(p_password,'') = '' then
    raise exception 'Faltan datos obligatorios (nombre, documento, correo y contraseña).';
  end if;
  if p_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' then raise exception 'El correo no es válido.'; end if;

  if exists (select 1 from public.affiliates where org_id = v_org and doc = trim(p_doc)) then
    raise exception 'Ya existe una solicitud o afiliación con ese documento.';
  end if;
  if exists (select 1 from public.affiliates where org_id = v_org and lower(email) = lower(trim(p_email))) then
    raise exception 'Ya existe una solicitud o afiliación con ese correo.';
  end if;

  -- SEGURIDAD: solo se crea si el correo NO existe. Si existe, se rechaza
  -- (nunca se reescribe la contraseña de una cuenta ya creada).
  if exists (select 1 from auth.users where lower(email) = lower(trim(p_email))) then
    raise exception 'Ese correo ya está registrado. Si ya tienes cuenta, inicia sesión; si no, usa otro correo.';
  end if;

  uid := gen_random_uuid();
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data,
    confirmation_token, recovery_token, email_change_token_new, email_change
  ) values (
    '00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated',
    lower(trim(p_email)), crypt(p_password, gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}',
    jsonb_build_object('full_name', v_nombre),
    '', '', '', ''
  );
  insert into auth.identities (
    provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
  ) values (
    uid::text, uid, jsonb_build_object('sub', uid::text, 'email', lower(trim(p_email))),
    'email', now(), now(), now()
  );
  insert into public.profiles (id, full_name, role, org_id)
  values (uid, v_nombre, 'afiliado', v_org) on conflict (id) do nothing;

  select count(*) into v_n from public.affiliates where org_id = v_org;
  v_sol := 'WEB-' || to_char(now(),'YYYY') || '-' || lpad((v_n + 1)::text, 4, '0');
  v_benef := coalesce(array(select jsonb_array_elements_text(p_extra->'beneficios')), '{}'::text[]);

  insert into public.affiliates (
    org_id, user_id, name, doc, email, phone, address, status, solicitud_no,
    type, dependency, cargo_titular, role, asignacion_basica, beneficios,
    medio, motivo, interes_comites, join_date, foto_url
  ) values (
    v_org, uid, v_nombre, trim(p_doc), lower(trim(p_email)),
    coalesce(p_telefono,''), coalesce(p_direccion,''), 'Pendiente', v_sol,
    nullif(p_extra->>'type',''), nullif(p_extra->>'dependency',''),
    nullif(p_extra->>'cargoTitular',''), nullif(p_extra->>'role',''),
    coalesce((p_extra->>'asignacionBasica')::numeric, 0), v_benef,
    nullif(p_extra->>'medio',''), nullif(p_extra->>'motivo',''),
    nullif(p_extra->>'interesComites',''), nullif(p_extra->>'joinDate',''),
    nullif(p_extra->>'fotoUrl','')
  );
  return v_sol;
end $$;
grant execute on function public.solicitar_afiliacion(text,text,text,text,text,text,text,text,jsonb) to anon, authenticated;

select 'listo: hardening_cuentas' as estado;

-- =============================================================================
-- LIMPIEZA: arregla la(s) cuenta(s) de super-admin que quedaron como "afiliado".
-- Detecta solo (no necesitas escribir tu correo). Ejecuta los pasos 1 a 3.
-- =============================================================================

-- 1) Diagnóstico: cuentas super-admin y si quedaron metidas en el padrón.
select u.email, p.role, p.platform_admin,
       exists (select 1 from public.affiliates a where lower(a.email) = lower(u.email)) as en_padron
from public.profiles p
join auth.users u on u.id = p.id
where p.platform_admin = true;

-- 2) Quita del padrón las filas de afiliado de cualquier super-admin (creadas por error).
delete from public.affiliates a
using public.profiles p
join auth.users u on u.id = p.id
where p.platform_admin = true and lower(a.email) = lower(u.email);

-- 3) Verifica que quedó limpio (en_padron debe salir false):
select u.email, p.role, p.platform_admin,
       exists (select 1 from public.affiliates a where lower(a.email) = lower(u.email)) as en_padron
from public.profiles p
join auth.users u on u.id = p.id
where p.platform_admin = true;

-- =============================================================================
-- (OPCIONAL) Restablecer la contraseña de tu super-admin, si te quedó cambiada.
-- Cambia el correo y la NUEVA contraseña, quita los "--" y ejecútalo:
-- =============================================================================
-- update auth.users
-- set encrypted_password = crypt('TU_NUEVA_CONTRASENA', gen_salt('bf')),
--     email_confirmed_at = coalesce(email_confirmed_at, now())
-- where lower(email) = lower('issac10.es@gmail.com');
