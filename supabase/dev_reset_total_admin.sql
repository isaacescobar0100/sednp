-- =============================================================================
-- DEV · RESET TOTAL + nuevo administrador de plataforma
-- -----------------------------------------------------------------------------
-- Borra TODAS las cuentas y datos, y crea un único admin de plataforma.
-- DESTRUCTIVO E IRREVERSIBLE. Ejecutar en el SQL Editor de Supabase.
-- Tras correrlo, tu sesión actual queda cerrada: entra con las credenciales nuevas.
-- =============================================================================

-- 1) WIPE: borra todas las cuentas (cascada a profiles e identities) y cualquier
--    organización que quedara. Las demás tablas ya están en 0.
delete from auth.users;
delete from public.organizations;

-- 2) Crea el nuevo administrador de plataforma ------------------------------
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  raw_app_meta_data, raw_user_meta_data
)
select
  '00000000-0000-0000-0000-000000000000', gen_random_uuid(),
  'authenticated', 'authenticated', 'issac10.es@gmail.com',
  crypt('Isaac0100*', gen_salt('bf')),
  now(), now(), now(), '', '', '', '',
  '{"provider":"email","providers":["email"]}'::jsonb,
  jsonb_build_object('full_name', 'Administrador')
where not exists (select 1 from auth.users where lower(email) = lower('issac10.es@gmail.com'));

insert into auth.identities (
  provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
)
select lower('issac10.es@gmail.com'), u.id,
       jsonb_build_object('sub', u.id::text, 'email', lower('issac10.es@gmail.com'), 'email_verified', true),
       'email', now(), now(), now()
from auth.users u
where lower(u.email) = lower('issac10.es@gmail.com')
  and not exists (select 1 from auth.identities i where i.user_id = u.id and i.provider = 'email');

-- Perfil como ADMIN DE PLATAFORMA (platform_admin = true, sin sindicato)
insert into public.profiles (id, full_name, role, platform_admin, org_id)
select u.id, 'Administrador', 'presidencia', true, null
from auth.users u
where lower(u.email) = lower('issac10.es@gmail.com')
on conflict (id) do update set platform_admin = true, org_id = null, role = 'presidencia';

-- 3) Verificación: debe salir SOLO tu admin ---------------------------------
select id, full_name, role, platform_admin, org_id from public.profiles;
