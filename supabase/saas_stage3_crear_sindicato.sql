-- =============================================================================
-- SIG-SERDNP (Sindika) · SaaS ETAPA 3 — Dar de alta un sindicato nuevo
-- Crea la organizacion, conecta su cuenta de PRESIDENCIA y le siembra sus
-- catalogos y parametros base. Todo aislado: no toca a los demas sindicatos.
--
-- Requiere saas_stage1.sql y saas_stage2.sql. Ejecutar en el SQL Editor.
--
-- FLUJO (2 pasos, confiable):
--   1) En Authentication -> Add user, crea la cuenta de presidencia del nuevo
--      sindicato (con Auto Confirm). Ej: presidencia@gobatlantico.gov.co
--   2) Corre:  select public.crear_sindicato('Nombre', 'slug', 'ese-correo', 'Nombre Presidente');
-- =============================================================================

create or replace function public.crear_sindicato(
  p_nombre       text,   -- nombre del sindicato
  p_slug         text,   -- identificador corto sin espacios (ej. 'gob-atlantico')
  p_presi_email  text,   -- correo de la cuenta de presidencia (ya creada en Add user)
  p_presi_nombre text    -- nombre de la persona de presidencia
) returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_org uuid;
  uid   uuid;
begin
  -- Solo el super-admin (o ejecucion directa en el SQL Editor, donde auth.uid() es null).
  if auth.uid() is not null and not public.is_platform_admin() then
    raise exception 'Solo el administrador de la plataforma puede crear sindicatos';
  end if;

  -- 1) Organizacion (si el slug ya existe, la reutiliza)
  select id into v_org from public.organizations where slug = p_slug;
  if v_org is null then
    insert into public.organizations (nombre, slug) values (p_nombre, p_slug) returning id into v_org;
  end if;

  -- 2) Conecta la cuenta de presidencia (debe existir ya en Authentication)
  select id into uid from auth.users where lower(email) = lower(p_presi_email);
  if uid is null then
    raise exception 'Primero crea la cuenta % en Authentication -> Add user (Auto Confirm).', p_presi_email;
  end if;
  insert into public.profiles (id, full_name, role, org_id)
  values (uid, p_presi_nombre, 'presidencia', v_org)
  on conflict (id) do update set role = 'presidencia', org_id = v_org, full_name = excluded.full_name;

  -- 3) Parametros base (cuota 0,3% y SMMLV; se editan luego en Parametros)
  insert into public.params (org_id, porcentaje_cuota, smmlv)
  values (v_org, 0.003, 1423500)
  on conflict (org_id) do nothing;

  -- 4) Tipos de vinculacion base (solo si no tiene)
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

  -- 6) Dependencias base (genericas, editables por el sindicato)
  insert into public.dependencias (org_id, name)
  select v_org, x from unnest(array[
    'Dirección General','Secretaría General','Oficina Jurídica',
    'Oficina de Planeación','Dirección Administrativa y Financiera']) as x
  on conflict (org_id, name) do nothing;

  -- 7) Catalogo de cuentas (PUC) base
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

-- NOTA: no se concede a 'authenticated' a proposito: por ahora solo se usa desde el
-- SQL Editor. Cuando exista el panel de super-admin, se concedera con su control.

-- =============================================================================
-- EJEMPLO — dar de alta el sindicato de la Gobernacion del Atlantico
-- (1o crea la cuenta presidencia@... en Add user; 2o descomenta y corre esto)
-- =============================================================================
-- select public.crear_sindicato(
--   'Sindicato de la Gobernación del Atlántico',
--   'gob-atlantico',
--   'presidencia@gobatlantico.gov.co',
--   'Nombre del Presidente'
-- );

-- Verificacion: lista los sindicatos y cuantos afiliados tiene cada uno.
select o.nombre, o.slug,
       (select count(*) from public.affiliates a where a.org_id = o.id) as afiliados
from public.organizations o
order by o.created_at;
