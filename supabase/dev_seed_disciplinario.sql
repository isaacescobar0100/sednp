-- =============================================================================
-- DEV · Datos de prueba para el módulo DISCIPLINARIO
-- -----------------------------------------------------------------------------
-- Inserta 6 expedientes en distintos estados/etapas + su bitácora (actuaciones).
-- Nombres FICTICIOS (solo demo). Cambia el slug si tu sindicato no es 'qq'.
-- Correr UNA vez (si lo corres de nuevo, duplica). Ejecutar en el SQL Editor.
--   Ver slugs:  select slug, nombre from public.organizations;
-- =============================================================================

-- 1) Expedientes -------------------------------------------------------------
insert into public.cases (
  org_id, code, subject, person, opened_date, stage_index, days_left,
  status, sancion, multa_monto, recurso_tipo, recurso_estado, recurso_resultado
)
select o.id, v.code, v.subject, v.person, v.opened_date, v.stage_index, v.days_left,
       v.status, v.sancion, v.multa_monto, v.recurso_tipo, v.recurso_estado, v.recurso_resultado
from public.organizations o
cross join (values
  -- code,          asunto,                                        persona (ficticia),  apertura,                               etapa, días, estado,        sanción,          multa,    recurso,     rec_estado,   rec_result
  ('EXP-2026-001', 'Presunta agresión verbal en asamblea',        'Afiliado J. Ramírez', to_char(now()-interval '3 days','DD/MM/YYYY'),  0, 5, 'En trámite', null,            null,     null,        null,         null),
  ('EXP-2026-002', 'Incumplimiento de deberes estatutarios',      'Afiliada M. Torres',  to_char(now()-interval '12 days','DD/MM/YYYY'), 1, 8, 'En trámite', null,            null,     null,        null,         null),
  ('EXP-2026-003', 'Uso indebido de recursos del sindicato',      'Afiliado C. Gómez',   to_char(now()-interval '25 days','DD/MM/YYYY'), 3, 6, 'En trámite', null,            null,     null,        null,         null),
  ('EXP-2026-004', 'Inasistencia reiterada a asambleas',          'Afiliada L. Díaz',    to_char(now()-interval '40 days','DD/MM/YYYY'), 4, 0, 'Con fallo',  'Amonestación',  null,     null,        null,         null),
  ('EXP-2026-005', 'Daño a bienes de la organización',            'Afiliado R. Pardo',   to_char(now()-interval '55 days','DD/MM/YYYY'), 4, 0, 'Con fallo',  'Multa',         1300000,  'Apelación', 'Interpuesto', null),
  ('EXP-2026-006', 'Queja sin mérito disciplinario',              'Afiliada S. Rojas',   to_char(now()-interval '70 days','DD/MM/YYYY'), 4, 0, 'Archivado',  'Absuelto',      null,     null,        null,         null)
) as v(code, subject, person, opened_date, stage_index, days_left, status, sancion, multa_monto, recurso_tipo, recurso_estado, recurso_resultado)
where o.slug = 'qq';

-- 2) Bitácora de actuaciones (2 por expediente) -----------------------------
insert into public.case_events (org_id, case_id, tipo, fecha, actor_role, nota)
select c.org_id, c.id, e.tipo, e.fecha, e.actor_role, e.nota
from public.cases c
join public.organizations o on o.id = c.org_id
cross join (values
  ('Auto de apertura', to_char(now()-interval '3 days','DD/MM/YYYY'), 'fiscal',      'Se ordena la apertura de la investigación disciplinaria.'),
  ('Pliego de cargos', to_char(now()-interval '2 days','DD/MM/YYYY'), 'presidencia', 'Se formulan los cargos y se corre traslado al afiliado.')
) as e(tipo, fecha, actor_role, nota)
where o.slug = 'qq' and c.code like 'EXP-2026-%';

select count(*) || ' expedientes disciplinarios' as resultado
from public.cases c join public.organizations o on o.id = c.org_id
where o.slug = 'qq';
