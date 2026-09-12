-- =============================================================================
-- Mensaje de BIENVENIDA configurable (por sindicato).
--
-- Antes el texto del correo de bienvenida estaba fijo en el código. Ahora cada
-- sindicato edita el suyo desde Parámetros. Se guarda en organizations.
--
-- Placeholders que puedes usar en el texto (se reemplazan al enviar):
--   {nombre}     -> nombre del afiliado
--   {acta}       -> número de acta / resolución de aprobación
--   {sindicato}  -> nombre del sindicato
--
-- Idempotente. Ejecutar en el SQL Editor de Supabase.
-- =============================================================================

alter table public.organizations
  add column if not exists mensaje_bienvenida text;

comment on column public.organizations.mensaje_bienvenida is
  'Cuerpo del correo de bienvenida al aprobar afiliacion. Admite {nombre}, {acta}, {sindicato}. Si es NULL usa el texto por defecto.';

-- RPC para que la Presidencia/Secretaría edite el mensaje de SU sindicato
-- (la tabla organizations solo permite UPDATE al platform_admin; por eso este
--  SECURITY DEFINER controlado, igual que set_logo_sindicato).
create or replace function public.set_mensaje_bienvenida(p_texto text)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if public.app_role() not in ('presidencia','secretaria') then
    raise exception 'Solo la Presidencia o la Secretaría puede editar el mensaje de bienvenida';
  end if;
  update public.organizations
     set mensaje_bienvenida = nullif(btrim(p_texto), '')
   where id = public.current_org();
end $$;
grant execute on function public.set_mensaje_bienvenida(text) to authenticated;

-- Semilla: texto real de bienvenida del SERDNP (adaptado con placeholders).
update public.organizations
set mensaje_bienvenida =
'Hola {nombre}, reciba un cordial saludo.

Desde la Junta Directiva Nacional de la Organización Sindical de Servidores Públicos del Departamento Nacional de Planeación — SERDNP, le damos la bienvenida.

Es grato informarle que su afiliación fue aprobada mediante la Resolución No. {acta}, de la cual se le remitirá copia. Sus datos serán reportados a la Subdirección de Gestión de Talento Humano y sus contactos serán incluidos en el grupo de WhatsApp "Sindicato DNP".

Su llegada a la organización nos ayuda a seguir creciendo, y esperamos que sus expectativas se vean impactadas de manera positiva con las gestiones que estamos adelantando. Desde ahora puede ingresar a su portal con su correo y la contraseña asignada para consultar sus aportes, votaciones, comunicados y documentos.

Junta Directiva Nacional'
where slug = 'serdnp';

select 'listo: mensaje_bienvenida' as estado;
