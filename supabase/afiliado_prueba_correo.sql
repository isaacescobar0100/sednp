-- =============================================================================
-- Crear un AFILIADO DE PRUEBA (para probar el correo real, fuera de Parámetros).
--
-- Crea: cuenta de acceso (auth) + perfil + fila de afiliado en estado "Pendiente".
-- Luego, desde el sistema, APRUEBA esa afiliación -> se dispara el correo de
-- bienvenida al correo del afiliado (prueba del flujo real, remitente/nombre).
--
-- Cambia v_slug si quieres crearlo en el sindicato de prueba (no en SERDNP).
-- =============================================================================

set search_path = public, auth, extensions;

do $$
declare
  v_slug   text := 'serdnp';                 -- <-- slug del sindicato donde crearlo
  v_email  text := 'issac010113@gmail.com';  -- correo del afiliado de prueba
  v_pass   text := 'Isaac0100*';             -- contraseña de acceso
  v_nombre text := 'Isaac Prueba Correo';
  v_doc    text := 'PRB-CORREO-001';         -- documento (único por sindicato)
  v_org    uuid;
  uid      uuid := gen_random_uuid();
  v_n      integer;
  v_sol    text;
begin
  select id into v_org from public.organizations where slug = v_slug limit 1;
  if v_org is null then
    raise exception 'No existe un sindicato con slug %', v_slug;
  end if;

  -- Seguridad: nunca reescribir una cuenta existente.
  if exists (select 1 from auth.users where lower(email) = lower(v_email)) then
    raise exception 'Ese correo YA tiene cuenta. Usa otro correo o bórralo antes.';
  end if;

  -- Cuenta de acceso (auth.users + identidad).
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data,
    confirmation_token, recovery_token, email_change_token_new, email_change
  ) values (
    '00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated',
    lower(v_email), crypt(v_pass, gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}',
    jsonb_build_object('full_name', v_nombre),
    '', '', '', ''
  );
  insert into auth.identities (
    provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
  ) values (
    uid::text, uid, jsonb_build_object('sub', uid::text, 'email', lower(v_email)),
    'email', now(), now(), now()
  );

  -- Perfil (rol afiliado) en el sindicato elegido.
  insert into public.profiles (id, full_name, role, org_id)
  values (uid, v_nombre, 'afiliado', v_org)
  on conflict (id) do nothing;

  -- Fila de afiliado en estado "Pendiente" (para poder aprobarla y disparar correo).
  select count(*) into v_n from public.affiliates where org_id = v_org;
  v_sol := 'PRB-' || to_char(now(),'YYYY') || '-' || lpad((v_n + 1)::text, 4, '0');

  insert into public.affiliates (
    org_id, user_id, name, doc, email, phone, address, status, solicitud_no,
    asignacion_basica, beneficios, join_date
  ) values (
    v_org, uid, v_nombre, v_doc, lower(v_email), '', '', 'Pendiente', v_sol,
    0, '{}'::text[], to_char(now(),'YYYY-MM-DD')
  );

  raise notice 'OK: afiliado de prueba creado. Correo=% Solicitud=% Org=%', v_email, v_sol, v_slug;
end $$;

-- Verifica que quedó creado:
select a.name, a.email, a.status, a.solicitud_no, o.slug as sindicato
from public.affiliates a
join public.organizations o on o.id = a.org_id
where lower(a.email) = lower('issac010113@gmail.com');

-- =============================================================================
-- (OPCIONAL) BORRAR el afiliado de prueba cuando termines. Quita los "--":
-- =============================================================================
-- delete from public.affiliates where lower(email) = lower('issac010113@gmail.com');
-- delete from public.profiles  where id in (select id from auth.users where lower(email) = lower('issac010113@gmail.com'));
-- delete from auth.identities  where user_id in (select id from auth.users where lower(email) = lower('issac010113@gmail.com'));
-- delete from auth.users       where lower(email) = lower('issac010113@gmail.com');
