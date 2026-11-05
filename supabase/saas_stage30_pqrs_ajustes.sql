-- =============================================================================
-- SaaS · Etapa 30 — PQRS: correcciones tras la revisión del módulo
-- -----------------------------------------------------------------------------
-- 1) BUG integridad: el trigger que protege los datos del solicitante también
--    revertía el ON DELETE SET NULL de affiliate_id / user_id. Al borrar un
--    afiliado o una cuenta, la PQRS quedaba apuntando a un registro inexistente.
-- 2) BUG: eliminar_sindicato fallaba si el sindicato tenía PQRS. El borrado en
--    cascada de pqrs escribía en audit_log DESPUÉS de borrar la organización
--    (violación de llave foránea). Ahora borra las PQRS antes que la auditoría.
-- 3) Archivar exige un MOTIVO (se guarda en `respuesta`) y el solicitante lo ve
--    al consultar. Fecha y autor de cierre también para las archivadas.
-- 4) Cerrada (respondida o archivada), la respuesta ya no se puede editar;
--    hay que reabrirla.
-- 5) Nueva columna correo_enviado_at: deja constancia de si el correo con la
--    respuesta salió y cuándo (la hora la pone el servidor). Permite reenviar.
-- 6) Auditoría: las PQRS nuevas aparecen con su radicado en vez del id interno.
-- 7) Borradores: la directiva puede guardar la respuesta antes de enviarla. Para
--    que el afiliado no vea un borrador, ya no lee la tabla directo sino la RPC
--    `mis_pqrs()`, que solo entrega la respuesta cuando la PQRS está cerrada.
--
-- Requiere stage29. Idempotente. Ejecutar en el SQL Editor de Supabase ANTES de
-- desplegar el código que lo usa.
-- =============================================================================

-- 5) Constancia del correo ------------------------------------------------------
alter table public.pqrs add column if not exists correo_enviado_at timestamptz;

-- 1) 3) 4) 5) Reglas al gestionar -----------------------------------------------
create or replace function public.pqrs_antes_update()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_cerrada_antes boolean := old.estado in ('respondida','archivada');
  v_cerrada       boolean := new.estado in ('respondida','archivada');
begin
  -- Lo que radicó el solicitante no se altera.
  new.id           := old.id;
  new.org_id       := old.org_id;
  new.radicado     := old.radicado;
  new.canal        := old.canal;
  new.nombre       := old.nombre;
  new.documento    := old.documento;
  new.email        := old.email;
  new.telefono     := old.telefono;
  new.asunto       := old.asunto;
  new.descripcion  := old.descripcion;
  new.acepta_datos := old.acepta_datos;
  new.vence_at     := old.vence_at;
  new.created_at   := old.created_at;
  -- Vínculos: se conservan, pero SÍ pueden quedar en NULL (lo hace el
  -- ON DELETE SET NULL cuando se borra el afiliado o la cuenta).
  new.affiliate_id := case when new.affiliate_id is null then null else old.affiliate_id end;
  new.user_id      := case when new.user_id is null then null else old.user_id end;
  new.updated_at   := now();

  if v_cerrada and v_cerrada_antes and new.estado = old.estado then
    -- Sigue cerrada: la respuesta y los datos de cierre quedan fijos.
    new.respuesta      := old.respuesta;
    new.respondida_at  := old.respondida_at;
    new.respondida_por := old.respondida_por;
    -- El cliente avisa que el correo salió; la hora la fija el servidor.
    if new.correo_enviado_at is not null and new.correo_enviado_at is distinct from old.correo_enviado_at then
      new.correo_enviado_at := now();
    end if;
  elsif v_cerrada then
    -- Se cierra ahora (responder o archivar).
    if coalesce(trim(new.respuesta), '') = '' then
      if new.estado = 'archivada' then
        raise exception 'Para archivar la PQRS hay que escribir el motivo.';
      end if;
      raise exception 'Para marcar la PQRS como respondida hay que escribir la respuesta.';
    end if;
    new.respondida_at     := now();
    new.respondida_por    := (select nullif(trim(full_name), '') from public.profiles where id = auth.uid());
    new.correo_enviado_at := null;
  else
    -- Abierta (radicada / en trámite): sin datos de cierre.
    new.respondida_at     := null;
    new.respondida_por    := null;
    new.correo_enviado_at := null;
  end if;
  return new;
end $$;

-- 3) Consulta pública: también muestra el motivo de las archivadas ---------------
create or replace function public.consultar_pqrs(p_slug text, p_radicado text, p_email text)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v_org uuid; result jsonb;
begin
  select id into v_org from public.organizations where slug = p_slug and activo = true limit 1;
  if v_org is null or coalesce(trim(p_radicado),'') = '' or coalesce(trim(p_email),'') = '' then
    return '{}'::jsonb;
  end if;
  select jsonb_build_object(
    'radicado', radicado, 'tipo', tipo, 'asunto', asunto, 'estado', estado,
    'createdAt', created_at, 'venceAt', vence_at,
    'respuesta', case when estado in ('respondida','archivada') then respuesta end,
    'respondidaAt', respondida_at
  ) into result
  from public.pqrs
  where org_id = v_org
    and upper(radicado) = upper(trim(p_radicado))
    and email = lower(trim(p_email))
  limit 1;
  return coalesce(result, '{}'::jsonb);
end $$;
grant execute on function public.consultar_pqrs(text,text,text) to anon, authenticated;

-- 7) Portal del afiliado: lectura por RPC (sin borradores) ------------------------
drop policy if exists pqrs_select on public.pqrs;
create policy pqrs_select on public.pqrs for select
  using (public.is_directiva());

create or replace function public.mis_pqrs()
returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', id, 'radicado', radicado, 'tipo', tipo, 'asunto', asunto, 'descripcion', descripcion,
    'estado', estado,
    'respuesta', case when estado in ('respondida','archivada') then respuesta end,
    'respondidaAt', respondida_at, 'venceAt', vence_at, 'createdAt', created_at
  ) order by created_at desc), '[]'::jsonb)
  from public.pqrs
  where auth.uid() is not null and user_id = auth.uid() and org_id = public.current_org()
$$;
revoke execute on function public.mis_pqrs() from public, anon;
grant execute on function public.mis_pqrs() to authenticated;

-- 2) Eliminar sindicato: borra las PQRS antes que la auditoría -------------------
-- (Misma función de eliminar_sindicato.sql + la línea de pqrs.)
create or replace function public.eliminar_sindicato(p_org uuid)
returns void
language plpgsql security definer set search_path = public, auth
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'Solo el administrador de la plataforma puede eliminar sindicatos';
  end if;
  if not exists (select 1 from public.organizations where id = p_org) then
    raise exception 'Sindicato no encontrado';
  end if;

  -- Desvincula a los administradores de plataforma de este sindicato (no se borran).
  update public.profiles set org_id = null
   where org_id = p_org and coalesce(platform_admin, false) = true;

  -- Datos de negocio (hijos antes que padres para respetar llaves foráneas).
  delete from public.push_subscriptions where org_id = p_org;
  delete from public.actos where org_id = p_org;
  delete from public.publicaciones where org_id = p_org;
  delete from public.votes where org_id = p_org;
  delete from public.ballots where org_id = p_org;
  delete from public.case_events ce using public.cases c where ce.case_id = c.id and c.org_id = p_org;
  delete from public.aportes where org_id = p_org;
  delete from public.cases where org_id = p_org;
  delete from public.sessions where org_id = p_org;
  delete from public.movements where org_id = p_org;
  delete from public.caja_gastos where org_id = p_org;
  delete from public.comunicados where org_id = p_org;
  delete from public.docs where org_id = p_org;
  delete from public.committees where org_id = p_org;
  delete from public.pqrs where org_id = p_org;
  delete from public.affiliates where org_id = p_org;
  delete from public.audit_log where org_id = p_org;

  -- Catálogos / parámetros.
  delete from public.cargos where org_id = p_org;
  delete from public.dependencias where org_id = p_org;
  delete from public.vinculaciones where org_id = p_org;
  delete from public.escalas where org_id = p_org;
  delete from public.presupuestos where org_id = p_org;
  delete from public.cuentas where org_id = p_org;
  delete from public.params where org_id = p_org;

  -- Cuentas de acceso de ese sindicato (NUNCA los administradores de plataforma).
  delete from auth.users where id in (
    select id from public.profiles where org_id = p_org and coalesce(platform_admin, false) = false
  );
  delete from public.profiles where org_id = p_org and coalesce(platform_admin, false) = false;

  -- La organización. Con stage24 (CASCADE), cualquier tabla hija no listada aquí
  -- se borra en cascada y no bloquea el borrado.
  delete from public.organizations where id = p_org;
end $$;
grant execute on function public.eliminar_sindicato(uuid) to authenticated;

-- 6) Auditoría con el radicado como etiqueta -------------------------------------
-- (Misma función de saas_stage15 + `radicado` en la etiqueta.)
create or replace function public.audit_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_role  text;
  v_name  text;
  v_json  jsonb := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  v_rowid text;
  v_label text;
  v_org   uuid;
begin
  select full_name, role::text into v_name, v_role from public.profiles where id = v_actor;
  v_rowid := coalesce(v_json->>'id', v_json->>'codigo', v_json->>'code');
  v_label := coalesce(
    v_json->>'name', v_json->>'title', v_json->>'subject', v_json->>'concept',
    v_json->>'radicado',
    v_json->>'code', v_json->>'codigo', v_json->>'period', v_rowid
  );
  -- Sindicato del registro auditado (todas las tablas auditadas tienen org_id).
  v_org := coalesce((v_json->>'org_id')::uuid, public.current_org());
  insert into public.audit_log(table_name, row_id, row_label, action, actor_id, actor_role, actor_name, old_data, new_data, org_id)
  values (
    tg_table_name, v_rowid, v_label, tg_op, v_actor,
    coalesce(v_role, 'desconocido'),
    nullif(trim(coalesce(v_name, '')), ''),
    case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) else null end,
    case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) else null end,
    v_org
  );
  return case when tg_op = 'DELETE' then old else new end;
end $$;

-- (Lo ya auditado NO se reescribe: la bitácora es inalterable. Solo los
-- registros nuevos llevan el radicado como etiqueta.)

select 'listo: PQRS ajustes (vínculos, borrado de sindicato, motivo de archivo, constancia de correo, auditoría)' as estado;
