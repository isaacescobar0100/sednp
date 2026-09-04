-- =============================================================================
-- SIG-SERDNP (Sindika) · SaaS ETAPA 7
--   A) Foto propia (self-service): cada usuario sube su foto a su perfil.
--   B) Jerarquía: Presidencia solo crea la Secretaría; la Secretaría crea el
--      resto de la directiva y los afiliados.
-- Requiere stage1..stage6. Idempotente. Ejecutar en el SQL Editor UNA VEZ.
-- =============================================================================

create extension if not exists pgcrypto;

-- A) Foto en el perfil (self-service)
alter table public.profiles add column if not exists foto_url text;

-- Cualquier usuario logueado puede subir/actualizar su foto en el bucket 'fotos'.
drop policy if exists fotos_insert on storage.objects;
create policy fotos_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'fotos');
drop policy if exists fotos_update on storage.objects;
create policy fotos_update on storage.objects for update to authenticated
  using (bucket_id = 'fotos');

-- B) Jerarquía de creación de cuentas
create or replace function public.crear_cuenta_persona(
  p_email text, p_password text, p_nombre text, p_rol app_role
) returns uuid
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_org    uuid := public.current_org();
  v_caller app_role := public.app_role();
  uid      uuid;
begin
  if v_org is null then
    raise exception 'No se pudo determinar tu sindicato';
  end if;

  -- Reglas de jerarquía:
  if v_caller = 'presidencia' then
    if p_rol <> 'secretaria' then
      raise exception 'La Presidencia solo puede crear la cuenta de Secretaría';
    end if;
  elsif v_caller = 'secretaria' then
    if p_rol not in ('afiliado','vicepresidencia','tesoreria','fiscal') then
      raise exception 'La Secretaría no puede asignar ese cargo';
    end if;
  else
    raise exception 'Solo la Presidencia o la Secretaría puede crear cuentas';
  end if;

  select id into uid from auth.users where lower(email) = lower(p_email);
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

select 'listo: foto propia + jerarquia' as estado;
