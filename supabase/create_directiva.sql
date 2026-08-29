-- Crea (o actualiza) cuentas de la Junta Directiva por SQL: cuenta de login
-- + identidad de correo + perfil con su rol. Ejecutar en el SQL Editor.
-- Si una cuenta ya existe, solo le resetea la clave y le fija el rol.
--
-- NOTA: crear usuarios de auth por SQL depende de la versión de Supabase.
-- Si al iniciar sesión con estas cuentas sale "Invalid login credentials",
-- bórralas (Authentication -> Users) y créalas con "Add user" (+ Auto Confirm),
-- luego corre set_roles.sql. Esa vía es la más segura.

create extension if not exists pgcrypto;

create or replace function public.crear_directiva(
  p_email    text,
  p_password text,
  p_nombre   text,
  p_rol      app_role
) returns uuid
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare uid uuid;
begin
  select id into uid from auth.users where lower(email) = lower(p_email);

  if uid is null then
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
      provider_id, user_id, identity_data, provider,
      last_sign_in_at, created_at, updated_at
    ) values (
      uid::text, uid,
      jsonb_build_object('sub', uid::text, 'email', lower(p_email)),
      'email', now(), now(), now()
    );
  else
    -- Ya existe: resetea clave y confirma correo.
    update auth.users set
      encrypted_password = crypt(p_password, gen_salt('bf')),
      email_confirmed_at = coalesce(email_confirmed_at, now())
    where id = uid;
  end if;

  -- Perfil con el rol (sobrescribe el 'afiliado' que pone el trigger).
  insert into public.profiles (id, full_name, role)
  values (uid, p_nombre, p_rol)
  on conflict (id) do update set role = excluded.role, full_name = excluded.full_name;

  return uid;
end $$;

-- ===== Crea las cuentas faltantes (cambia correos y claves si quieres) =====
select public.crear_directiva('vicepresidencia@dnp.gov.co', 'Vicepresidencia#2026', 'Zulay Olarte Bermúdez',        'vicepresidencia');
select public.crear_directiva('secretaria@dnp.gov.co',      'Secretaria#2026',      'Ludy Maritza Montoya Roberto', 'secretaria');
select public.crear_directiva('tesoreria@dnp.gov.co',       'Tesoreria#2026',       'Lina María Ocampo Palacio',    'tesoreria');
select public.crear_directiva('fiscal@dnp.gov.co',          'Fiscal#2026',          'Nini Dahyana Idarraga Garay',  'fiscal');

-- Verificación:
select u.email, p.full_name, p.role
from public.profiles p
join auth.users u on u.id = p.id
order by p.role;
