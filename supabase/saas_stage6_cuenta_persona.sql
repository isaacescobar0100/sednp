-- =============================================================================
-- SIG-SERDNP (Sindika) · SaaS ETAPA 6 — Cuenta al registrar afiliado
-- Al dar de alta una persona en el padrón, se le crea su cuenta de acceso con el
-- rol elegido: 'afiliado' (portal) o un cargo de directiva (opera el sistema).
-- Un solo flujo, sin doble trabajo. La llama la Secretaría/Presidencia.
-- Requiere stage1..stage5. Idempotente. Ejecutar en el SQL Editor UNA VEZ.
-- =============================================================================

create extension if not exists pgcrypto;

create or replace function public.crear_cuenta_persona(
  p_email text, p_password text, p_nombre text, p_rol app_role
) returns uuid
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_org uuid := public.current_org();
  uid   uuid;
begin
  -- Solo Presidencia o Secretaría registra personas.
  if public.app_role() not in ('presidencia','secretaria') then
    raise exception 'Solo la Presidencia o la Secretaría puede crear cuentas';
  end if;
  if v_org is null then
    raise exception 'No se pudo determinar tu sindicato';
  end if;

  select id into uid from auth.users where lower(email) = lower(p_email);

  -- No permitir tomar un correo que ya es de otro sindicato.
  if uid is not null and exists (
    select 1 from public.profiles where id = uid and org_id is not null and org_id <> v_org
  ) then
    raise exception 'Ese correo ya pertenece a otro sindicato';
  end if;

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
      uid::text, uid, jsonb_build_object('sub', uid::text, 'email', lower(p_email)),
      'email', now(), now(), now()
    );
  else
    update auth.users set
      encrypted_password = crypt(p_password, gen_salt('bf')),
      email_confirmed_at = coalesce(email_confirmed_at, now())
    where id = uid;
  end if;

  insert into public.profiles (id, full_name, role, org_id)
  values (uid, p_nombre, p_rol, v_org)
  on conflict (id) do update set role = p_rol, full_name = excluded.full_name, org_id = v_org;

  return uid;
end $$;

grant execute on function public.crear_cuenta_persona(text,text,text,app_role) to authenticated;

select 'listo: cuenta_persona' as estado;
