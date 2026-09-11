-- =============================================================================
-- Auto-afiliación por link público (FORMULARIO COMPLETO).
--
-- - `org_publica(slug)`       : marca del sindicato (nombre + logo) para la página.
-- - `catalogos_publicos(slug)`: cargos, dependencias, tipos de vinculación,
--   escalas salariales y % de cuota del sindicato, para llenar el formulario.
-- - `solicitar_afiliacion(...)`: crea la SOLICITUD (cuenta + afiliado 'Pendiente')
--   con TODOS los datos (personales + laborales). Sigue el flujo Fiscal → Junta.
--
-- Requiere stage1..stage6. Idempotente. Ejecutar (o re-ejecutar) en el SQL Editor.
-- =============================================================================

create extension if not exists pgcrypto;

-- Marca pública del sindicato --------------------------------------------------
create or replace function public.org_publica(p_slug text)
returns table (nombre text, logo_url text)
language sql stable security definer set search_path = public as $$
  select o.nombre, o.logo_url
  from public.organizations o
  where o.slug = p_slug and o.activo = true
  limit 1
$$;
grant execute on function public.org_publica(text) to anon, authenticated;

-- Catálogos públicos para el formulario ---------------------------------------
create or replace function public.catalogos_publicos(p_slug text)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v_org uuid; result jsonb;
begin
  select id into v_org from public.organizations where slug = p_slug and activo = true limit 1;
  if v_org is null then return '{}'::jsonb; end if;
  select jsonb_build_object(
    'cargos',        coalesce((select jsonb_agg(c.name order by c.name) from public.cargos c where c.org_id = v_org), '[]'::jsonb),
    'dependencias',  coalesce((select jsonb_agg(d.name order by d.name) from public.dependencias d where d.org_id = v_org), '[]'::jsonb),
    'vinculaciones', coalesce((select jsonb_agg(jsonb_build_object('name', v.name, 'color', v.color)) from public.vinculaciones v where v.org_id = v_org), '[]'::jsonb),
    'escalas',       coalesce((select jsonb_agg(jsonb_build_object('nivel', e.nivel, 'grado', e.grado, 'asignacionBasica', e.asignacion_basica)) from public.escalas e where e.org_id = v_org), '[]'::jsonb),
    'porcentajeCuota', coalesce((select p.porcentaje_cuota from public.params p where p.org_id = v_org limit 1), 0.003)
  ) into result;
  return result;
end $$;
grant execute on function public.catalogos_publicos(text) to anon, authenticated;

-- Solicitud de afiliación (datos completos) -----------------------------------
-- Se elimina la versión anterior (8 args) para dejar una sola definición.
drop function if exists public.solicitar_afiliacion(text,text,text,text,text,text,text,text);
drop function if exists public.solicitar_afiliacion(text,text,text,text,text,text,text,text,jsonb);

create function public.solicitar_afiliacion(
  p_slug text,
  p_nombres text,
  p_apellidos text,
  p_doc text,
  p_email text,
  p_telefono text,
  p_direccion text,
  p_password text,
  p_extra jsonb default '{}'::jsonb
) returns text
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_org    uuid;
  v_nombre text := trim(coalesce(p_nombres,'') || ' ' || coalesce(p_apellidos,''));
  uid      uuid;
  v_n      integer;
  v_sol    text;
  v_benef  text[];
begin
  -- 1) Sindicato válido y activo.
  select id into v_org from public.organizations where slug = p_slug and activo = true limit 1;
  if v_org is null then
    raise exception 'El enlace de afiliación no es válido o el sindicato no está activo.';
  end if;

  -- 2) Validaciones básicas.
  if v_nombre = '' or coalesce(trim(p_doc),'') = '' or coalesce(trim(p_email),'') = '' or coalesce(p_password,'') = '' then
    raise exception 'Faltan datos obligatorios (nombre, documento, correo y contraseña).';
  end if;
  if p_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' then
    raise exception 'El correo no es válido.';
  end if;

  -- 3) No duplicar en ESTE sindicato (por documento o correo).
  if exists (select 1 from public.affiliates where org_id = v_org and doc = trim(p_doc)) then
    raise exception 'Ya existe una solicitud o afiliación con ese documento.';
  end if;
  if exists (select 1 from public.affiliates where org_id = v_org and lower(email) = lower(trim(p_email))) then
    raise exception 'Ya existe una solicitud o afiliación con ese correo.';
  end if;

  -- 4) Cuenta de acceso (el portal solo abre cuando la aprueban).
  select id into uid from auth.users where lower(email) = lower(trim(p_email));
  if uid is not null and exists (
    select 1 from public.profiles where id = uid and org_id is not null and org_id <> v_org
  ) then
    raise exception 'Ese correo ya pertenece a otro sindicato.';
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
      lower(trim(p_email)), crypt(p_password, gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}',
      jsonb_build_object('full_name', v_nombre),
      '', '', '', ''
    );
    insert into auth.identities (
      provider_id, user_id, identity_data, provider,
      last_sign_in_at, created_at, updated_at
    ) values (
      uid::text, uid, jsonb_build_object('sub', uid::text, 'email', lower(trim(p_email))),
      'email', now(), now(), now()
    );
  else
    update auth.users set
      encrypted_password = crypt(p_password, gen_salt('bf')),
      email_confirmed_at = coalesce(email_confirmed_at, now())
    where id = uid;
  end if;

  insert into public.profiles (id, full_name, role, org_id)
  values (uid, v_nombre, 'afiliado', v_org)
  on conflict (id) do update set full_name = excluded.full_name, org_id = v_org;

  -- 5) Consecutivo + afiliado PENDIENTE con datos completos.
  select count(*) into v_n from public.affiliates where org_id = v_org;
  v_sol := 'WEB-' || to_char(now(),'YYYY') || '-' || lpad((v_n + 1)::text, 4, '0');

  v_benef := coalesce(array(select jsonb_array_elements_text(p_extra->'beneficios')), '{}'::text[]);

  insert into public.affiliates (
    org_id, user_id, name, doc, email, phone, address, status, solicitud_no,
    type, dependency, cargo_titular, role, asignacion_basica, beneficios,
    medio, motivo, interes_comites, join_date
  ) values (
    v_org, uid, v_nombre, trim(p_doc), lower(trim(p_email)),
    coalesce(p_telefono,''), coalesce(p_direccion,''), 'Pendiente', v_sol,
    nullif(p_extra->>'type',''), nullif(p_extra->>'dependency',''),
    nullif(p_extra->>'cargoTitular',''), nullif(p_extra->>'role',''),
    coalesce((p_extra->>'asignacionBasica')::numeric, 0), v_benef,
    nullif(p_extra->>'medio',''), nullif(p_extra->>'motivo',''),
    nullif(p_extra->>'interesComites',''), nullif(p_extra->>'joinDate','')
  );

  return v_sol;
end $$;

grant execute on function public.solicitar_afiliacion(text,text,text,text,text,text,text,text,jsonb) to anon, authenticated;

select 'listo: solicitar_afiliacion (completo)' as estado;
