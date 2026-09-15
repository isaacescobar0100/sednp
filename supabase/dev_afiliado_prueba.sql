-- =============================================================================
-- DEV · Afiliado de prueba para ver el PORTAL DEL AFILIADO  (sin bloque do $$)
-- -----------------------------------------------------------------------------
-- Versión en sentencias sueltas: el SQL Editor de Supabase parte los bloques
-- do $$..$$ en el primer ";" y da "syntax error". Esto evita ese problema.
--
-- Crea (o reutiliza) el login iescobar0100@gmail.com, lo deja como AFILIADO
-- ACTIVO del sindicato con slug 'qq', y acepta a todos los pendientes de ese
-- sindicato. Si tu slug no es 'qq', reemplázalo en TODAS las líneas (usa
-- Buscar/Reemplazar: 'qq'  ->  'tu-slug').
--
-- Primero confirma el slug:   select slug, nombre from public.organizations;
-- =============================================================================

-- 1) Crear el login si no existe --------------------------------------------
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  raw_app_meta_data, raw_user_meta_data
)
select
  '00000000-0000-0000-0000-000000000000', gen_random_uuid(),
  'authenticated', 'authenticated', 'iescobar0100@gmail.com',
  crypt('Sindika2026*', gen_salt('bf')),
  now(), now(), now(),
  '', '', '', '',
  '{"provider":"email","providers":["email"]}'::jsonb,
  jsonb_build_object('full_name', 'Afiliado Prueba')
where not exists (
  select 1 from auth.users where lower(email) = lower('iescobar0100@gmail.com')
);

-- 2) Asegurar contraseña conocida + correo confirmado ------------------------
update auth.users
   set encrypted_password = crypt('Sindika2026*', gen_salt('bf')),
       email_confirmed_at = coalesce(email_confirmed_at, now())
 where lower(email) = lower('iescobar0100@gmail.com');

-- 3) Identidad de email si no existe ----------------------------------------
insert into auth.identities (
  provider_id, user_id, identity_data, provider,
  last_sign_in_at, created_at, updated_at
)
select
  lower('iescobar0100@gmail.com'), u.id,
  jsonb_build_object('sub', u.id::text, 'email', lower('iescobar0100@gmail.com'), 'email_verified', true),
  'email', now(), now(), now()
from auth.users u
where lower(u.email) = lower('iescobar0100@gmail.com')
  and not exists (
    select 1 from auth.identities i where i.user_id = u.id and i.provider = 'email'
  );

-- 4) Perfil: rol afiliado + org del sindicato 'qq' ---------------------------
insert into public.profiles (id, full_name, role, org_id)
select u.id, 'Afiliado Prueba', 'afiliado', o.id
from auth.users u
cross join public.organizations o
where lower(u.email) = lower('iescobar0100@gmail.com')
  and o.slug = 'qq'
on conflict (id) do update set role = 'afiliado', org_id = excluded.org_id;

-- 5a) Si ya tenía ficha en ese sindicato, la activa -------------------------
update public.affiliates a
   set status = 'Activo', user_id = u.id
from auth.users u, public.organizations o
where lower(u.email) = lower('iescobar0100@gmail.com')
  and o.slug = 'qq'
  and a.org_id = o.id
  and lower(a.email) = lower('iescobar0100@gmail.com');

-- 5b) Si no tenía ficha, la crea ACTIVA -------------------------------------
insert into public.affiliates (
  org_id, user_id, name, doc, email, asignacion_basica, status, join_date
)
select o.id, u.id, 'Afiliado Prueba', '1000000000', lower('iescobar0100@gmail.com'),
       1300000, 'Activo', to_char(now(), 'YYYY-MM-DD')
from auth.users u
cross join public.organizations o
where lower(u.email) = lower('iescobar0100@gmail.com')
  and o.slug = 'qq'
  and not exists (
    select 1 from public.affiliates a
    where a.org_id = o.id and lower(a.email) = lower('iescobar0100@gmail.com')
  );

-- 6) Aceptar a TODOS los afiliados pendientes del sindicato 'qq' ------------
update public.affiliates a
   set status = 'Activo'
from public.organizations o
where o.slug = 'qq' and a.org_id = o.id and a.status = 'Pendiente';

-- 7) Verificación: debe salir 1 fila con status Activo ----------------------
select a.name, a.email, a.status, o.slug
from public.affiliates a
join public.organizations o on o.id = a.org_id
where lower(a.email) = lower('iescobar0100@gmail.com');
