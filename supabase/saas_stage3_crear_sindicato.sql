-- =============================================================================
-- SIG-SERDNP (Sindika) · SaaS ETAPA 3 — Dar de alta un sindicato (AUTOMÁTICO)
-- Crea la organización, crea la cuenta de PRESIDENCIA (correo + contraseña),
-- la vincula y le siembra sus catálogos y parámetros base. Todo aislado.
--
-- Requiere saas_stage1.sql y saas_stage2.sql. Ejecutar en el SQL Editor UNA VEZ.
-- Después, todo se hace desde el panel de super-admin (sin tocar la BD).
-- =============================================================================

create extension if not exists pgcrypto;

-- Reemplaza la versión anterior (que exigía crear la cuenta a mano).
drop function if exists public.crear_sindicato(text,text,text,text);

create or replace function public.crear_sindicato(
  p_nombre         text,  -- nombre del sindicato
  p_slug           text,  -- identificador corto sin espacios (ej. 'gob-atlantico')
  p_presi_email    text,  -- correo de la presidencia (se crea automáticamente)
  p_presi_password text,  -- contraseña inicial de la presidencia
  p_presi_nombre   text   -- nombre de la persona de presidencia
) returns uuid
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_org uuid;
  uid   uuid;
begin
  -- Solo el super-admin (o ejecución directa en el SQL Editor, donde auth.uid() es null).
  if auth.uid() is not null and not public.is_platform_admin() then
    raise exception 'Solo el administrador de la plataforma puede crear sindicatos';
  end if;

  -- 1) Organización (si el slug ya existe, la reutiliza)
  select id into v_org from public.organizations where slug = p_slug;
  if v_org is null then
    insert into public.organizations (nombre, slug) values (p_nombre, p_slug) returning id into v_org;
  end if;

  -- 2) Cuenta de presidencia: la crea si no existe (o le actualiza la clave).
  select id into uid from auth.users where lower(email) = lower(p_presi_email);
  if uid is null then
    uid := gen_random_uuid();
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) values (
      '00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated',
      lower(p_presi_email), crypt(p_presi_password, gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}',
      jsonb_build_object('full_name', p_presi_nombre),
      '', '', '', ''
    );
    insert into auth.identities (
      provider_id, user_id, identity_data, provider,
      last_sign_in_at, created_at, updated_at
    ) values (
      uid::text, uid,
      jsonb_build_object('sub', uid::text, 'email', lower(p_presi_email)),
      'email', now(), now(), now()
    );
  else
    update auth.users set
      encrypted_password = crypt(p_presi_password, gen_salt('bf')),
      email_confirmed_at = coalesce(email_confirmed_at, now())
    where id = uid;
  end if;

  -- Perfil de presidencia vinculado a este sindicato.
  insert into public.profiles (id, full_name, role, org_id)
  values (uid, p_presi_nombre, 'presidencia', v_org)
  on conflict (id) do update set role = 'presidencia', org_id = v_org, full_name = excluded.full_name;

  -- 3) Parámetros base (cuota 0,3% y SMMLV; se editan luego en Parámetros)
  insert into public.params (org_id, porcentaje_cuota, smmlv)
  values (v_org, 0.003, 1423500)
  on conflict (org_id) do nothing;

  -- 4) Tipos de vinculación base (solo si no tiene)
  if not exists (select 1 from public.vinculaciones where org_id = v_org) then
    insert into public.vinculaciones (org_id, name, color) values
      (v_org, 'Libre nombramiento y remoción', '#0F1B3D'),
      (v_org, 'Carrera administrativa',        '#C9973B'),
      (v_org, 'Provisional',                   '#B23A3A'),
      (v_org, 'Contratista',                   '#3A5591');
  end if;

  -- 5) Cargos base
  insert into public.cargos (org_id, name)
  select v_org, x from unnest(array[
    'Profesional especializado','Asesor','Profesional universitario','Gestor',
    'Técnico administrativo','Auxiliar administrativo','Director técnico',
    'Coordinador de grupo','Analista','Contratista de apoyo']) as x
  on conflict (org_id, name) do nothing;

  -- 6) Dependencias base (genéricas, editables por el sindicato)
  insert into public.dependencias (org_id, name)
  select v_org, x from unnest(array[
    'Dirección General','Secretaría General','Oficina Jurídica',
    'Oficina de Planeación','Dirección Administrativa y Financiera']) as x
  on conflict (org_id, name) do nothing;

  -- 7) Catálogo de cuentas (PUC) base
  insert into public.cuentas (org_id, codigo, nombre, tipo, naturaleza) values
    (v_org,'1110','Bancos','Activo','Débito'),
    (v_org,'1105','Caja menor','Activo','Débito'),
    (v_org,'41051001','Cuotas ordinarias','Ingreso','Crédito'),
    (v_org,'41052001','Cuotas extraordinarias','Ingreso','Crédito'),
    (v_org,'41053001','Multas y sanciones','Ingreso','Crédito'),
    (v_org,'421010','Rendimientos financieros','Ingreso','Crédito'),
    (v_org,'511010','Asesoría jurídica','Gasto','Débito'),
    (v_org,'5155','Gastos de oficina','Gasto','Débito'),
    (v_org,'5195','Actividades sindicales / Bienestar','Gasto','Débito'),
    (v_org,'530505','Gravamen movimientos financieros (GMF)','Gasto','Débito')
  on conflict (org_id, codigo) do nothing;

  -- 8) Presupuesto por rubro (en cero, listo para diligenciar)
  insert into public.presupuestos (org_id, category, anual)
  select v_org, x, 0 from unnest(array['Bienestar','Formación','Defensa','Operación']) as x
  on conflict (org_id, category) do nothing;

  return v_org;
end $$;

-- El panel de super-admin la usa (la función valida is_platform_admin adentro).
grant execute on function public.crear_sindicato(text,text,text,text,text) to authenticated;

-- Verificación: lista los sindicatos y cuántos afiliados tiene cada uno.
select o.nombre, o.slug,
       (select count(*) from public.affiliates a where a.org_id = o.id) as afiliados
from public.organizations o
order by o.created_at;
