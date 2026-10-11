-- =============================================================================
-- SaaS · Etapa 28 — FIXES de la auditoría (M-04, L-03, L-04)
-- -----------------------------------------------------------------------------
-- M-04: crear_miembro_directiva y crear_cuenta_persona, si el correo YA existe,
--   RESETEABAN su contraseña (rama else). Una secretaría podía así tomar la cuenta
--   de la presidencia del mismo sindicato — o peor, si el correo existente tenía
--   org_id null (p. ej. el ADMIN DE PLATAFORMA), lo metía al sindicato y le fijaba
--   la clave. FIX: rechazar cualquier correo ya existente (solo crear cuentas NUEVAS).
--   Para reasignar el rol de alguien que ya tiene cuenta, se hace por otra vía.
--
-- L-03: set_referencias no validaba rol → un afiliado podía alterar las citas
--   normativas. FIX: exigir presidencia/secretaría.
--
-- L-04: el bucket 'fotos' permitía a cualquier autenticado escribir/sobrescribir
--   CUALQUIER ruta (incluido el logo/foto de otro sindicato). FIX: aislar por
--   carpeta de org (<org_id>/...), igual que 'soportes'; anon solo en 'solicitudes/'.
--   (Requiere el cambio de cliente que sube las fotos bajo <org_id>/ — desplegado junto.)
--
-- Idempotente. Ejecutar en el SQL Editor de Supabase.
-- =============================================================================

-- ---- M-04: crear_miembro_directiva: solo crea cuentas NUEVAS -----------------
create or replace function public.crear_miembro_directiva(
  p_email text, p_password text, p_nombre text, p_rol app_role
) returns uuid
language plpgsql security definer set search_path = public, auth, extensions
as $$
declare v_org uuid := public.current_org(); uid uuid;
begin
  if public.app_role() not in ('presidencia','secretaria') then
    raise exception 'Solo la Presidencia o la Secretaría puede crear miembros de la directiva';
  end if;
  if v_org is null then raise exception 'No se pudo determinar tu sindicato'; end if;
  if p_rol not in ('vicepresidencia','secretaria','tesoreria','fiscal','presidencia') then
    raise exception 'Rol no válido para la directiva';
  end if;

  if exists (select 1 from auth.users where lower(email) = lower(p_email)) then
    raise exception 'Ese correo ya tiene una cuenta en el sistema';
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
  insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (uid::text, uid, jsonb_build_object('sub', uid::text, 'email', lower(p_email)), 'email', now(), now(), now());

  insert into public.profiles (id, full_name, role, org_id)
  values (uid, p_nombre, p_rol, v_org);
  return uid;
end $$;

-- ---- M-04: crear_cuenta_persona: solo crea cuentas NUEVAS --------------------
create or replace function public.crear_cuenta_persona(
  p_email text, p_password text, p_nombre text, p_rol app_role
) returns uuid
language plpgsql security definer set search_path = public, auth, extensions
as $$
declare v_org uuid := public.current_org(); v_caller app_role := public.app_role(); uid uuid;
begin
  if v_org is null then raise exception 'No se pudo determinar tu sindicato'; end if;
  if v_caller = 'presidencia' then
    if p_rol <> 'secretaria' then raise exception 'La Presidencia solo puede crear la cuenta de Secretaría'; end if;
  elsif v_caller = 'secretaria' then
    if p_rol not in ('afiliado','vicepresidencia','tesoreria','fiscal') then raise exception 'La Secretaría no puede asignar ese cargo'; end if;
  else
    raise exception 'Solo la Presidencia o la Secretaría puede crear cuentas';
  end if;

  if exists (select 1 from auth.users where lower(email) = lower(p_email)) then
    raise exception 'Ese correo ya tiene una cuenta en el sistema';
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
  insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (uid::text, uid, jsonb_build_object('sub', uid::text, 'email', lower(p_email)), 'email', now(), now(), now());

  insert into public.profiles (id, full_name, role, org_id)
  values (uid, p_nombre, p_rol, v_org);
  return uid;
end $$;

-- ---- L-03: set_referencias con guard de rol ---------------------------------
create or replace function public.set_referencias(p_refs jsonb)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if public.app_role() not in ('presidencia','secretaria') then
    raise exception 'Solo la Presidencia o la Secretaría puede editar las referencias';
  end if;
  if public.current_org() is null then raise exception 'No hay organización en la sesión'; end if;
  update public.organizations set referencias = coalesce(p_refs, '{}'::jsonb)
   where id = public.current_org();
end $$;

-- ---- L-04: bucket 'fotos' aislado por carpeta de org ------------------------
drop policy if exists fotos_insert on storage.objects;
create policy fotos_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'fotos' and (storage.foldername(name))[1] = public.current_org()::text);
drop policy if exists fotos_update on storage.objects;
create policy fotos_update on storage.objects for update to authenticated
  using (bucket_id = 'fotos' and (storage.foldername(name))[1] = public.current_org()::text);
-- Anónimo (formulario público de afiliación): solo bajo 'solicitudes/'.
drop policy if exists fotos_insert_anon on storage.objects;
create policy fotos_insert_anon on storage.objects for insert to anon
  with check (bucket_id = 'fotos' and (storage.foldername(name))[1] = 'solicitudes');

select 'listo: stage28 (M-04 cuentas, L-03 referencias, L-04 fotos)' as estado;
