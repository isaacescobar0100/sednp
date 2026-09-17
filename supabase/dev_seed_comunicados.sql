-- =============================================================================
-- DEV · Simular 50 comunicados enviados (solo módulo Comunicaciones)
-- -----------------------------------------------------------------------------
-- Inserta 50 comunicados "Entregado" en el sindicato indicado, con asuntos,
-- audiencia y fechas variadas (últimos 50 días). Solo datos de prueba.
-- Cambia el slug si tu sindicato no es 'qq'. Ejecutar en el SQL Editor.
--   Ver slugs:  select slug, nombre from public.organizations;
-- =============================================================================

insert into public.comunicados (org_id, subject, body, audience, recipients, date, status, created_at)
select
  o.id,
  (array[
    'Convocatoria a Asamblea General Ordinaria',
    'Actualización de datos de afiliados',
    'Nuevo convenio de bienestar para afiliados',
    'Recordatorio: pago de cuota sindical',
    'Informe de gestión de la Junta Directiva',
    'Jornada de salud y bienestar',
    'Invitación a capacitación sindical',
    'Boletín informativo mensual',
    'Resultados de la última votación',
    'Comunicado oficial de la Presidencia'
  ])[1 + ((g - 1) % 10)] || ' — N° ' || g,
  'Estimados afiliados, les compartimos la información correspondiente a este comunicado. Agradecemos su atención y participación. Cordialmente, la Junta Directiva.',
  (array['Todos los afiliados','Afiliados activos','Junta Directiva','Delegados'])[1 + ((g - 1) % 4)],
  200 + (g * 2),
  to_char((now() - (g || ' days')::interval), 'DD/MM/YYYY'),
  'Entregado',
  now() - (g || ' days')::interval
from public.organizations o
cross join generate_series(1, 50) as g
where o.slug = 'qq';   -- <<< cambia por el slug de tu sindicato

select count(*) || ' comunicados en el sindicato' as resultado
from public.comunicados c join public.organizations o on o.id = c.org_id
where o.slug = 'qq';
