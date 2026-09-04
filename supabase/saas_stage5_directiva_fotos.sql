-- =============================================================================
-- SIG-SERDNP (Sindika) · SaaS ETAPA 5
--   A) Gestión de la directiva: el Presidente/Secretaría crea las demás cuentas
--      de su sindicato (vice, secretaría, tesorería, fiscalía) desde la app.
--   B) Fotos de afiliados: columna + bucket público 'fotos'.
--   + Aísla la tabla de perfiles por sindicato (seguridad multi-tenant).
-- Requiere stage1..stage4. Idempotente. Ejecutar en el SQL Editor.
-- =============================================================================

create extension if not exists pgcrypto;

-- --- Aislar PERFILES por sindicato (que un sindicato no vea perfiles de otro) ---
drop policy if exists profiles_org_isolation on public.profiles;
create policy profiles_org_isolation on public.profiles as restrictive for all
  using (id = auth.uid() or org_id = public.current_org() or public.is_platform_admin())
  with check (id = auth.uid() or org_id = public.current_org() or public.is_platform_admin());

-- =============================================================================
-- A) Crear un miembro de la directiva del PROPIO sindicato del que llama.
-- =============================================================================
create or replace function public.crear_miembro_directiva(
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
  -- Solo Presidencia o Secretaría gestionan la directiva.
  if public.app_role() not in ('presidencia','secretaria') then
    raise exception 'Solo la Presidencia o la Secretaría puede crear miembros de la directiva';
  end if;
  if v_org is null then
    raise exception 'No se pudo determinar tu sindicato';
  end if;
  if p_rol not in ('vicepresidencia','secretaria','tesoreria','fiscal','presidencia') then
    raise exception 'Rol no válido para la directiva';
  end if;

  select id into uid from auth.users where lower(email) = lower(p_email);

  -- Si el correo ya pertenece a OTRO sindicato, no permitir (evita robar cuentas).
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

grant execute on function public.crear_miembro_directiva(text,text,text,app_role) to authenticated;

-- =============================================================================
-- B) Fotos de afiliados
-- =============================================================================
alter table public.affiliates add column if not exists foto_url text;

-- Bucket público para las fotos (se muestran directo por URL).
insert into storage.buckets (id, name, public) values ('fotos', 'fotos', true)
on conflict (id) do nothing;

-- Lectura pública; solo la directiva (logueada) puede subir/editar/borrar.
drop policy if exists fotos_read on storage.objects;
create policy fotos_read on storage.objects for select using (bucket_id = 'fotos');
drop policy if exists fotos_insert on storage.objects;
create policy fotos_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'fotos' and public.is_directiva());
drop policy if exists fotos_update on storage.objects;
create policy fotos_update on storage.objects for update to authenticated
  using (bucket_id = 'fotos' and public.is_directiva());
drop policy if exists fotos_delete on storage.objects;
create policy fotos_delete on storage.objects for delete to authenticated
  using (bucket_id = 'fotos' and public.is_directiva());

select 'listo: directiva + fotos' as estado;
