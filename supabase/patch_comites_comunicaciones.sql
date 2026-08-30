-- Comités y Comunicaciones. Ejecutar en el SQL Editor.

-- Comunicaciones: número de destinatarios que usa el modelo.
alter table public.comunicados add column if not exists recipients int not null default 0;

-- Comités: siembra los 5 temáticos (Art. 27) + 2 órganos estatutarios de
-- quejas y reclamos, solo si la tabla está vacía.
insert into public.committees (name, lead, members, next, activity, color, tipo)
select v.name, 'Por designar', '{}'::text[], 'Por programar', v.activity, v.color, v.tipo
from (values
  ('Educación y Desarrollo Humano', 'Comité temático estatutario', 'bg-night', 'Temático'),
  ('Promoción y Fomento del Desarrollo Laboral y Profesional', 'Comité temático estatutario', 'bg-gold', 'Temático'),
  ('Planeación e Innovación', 'Comité temático estatutario', 'bg-brick', 'Temático'),
  ('Divulgación y Relaciones Públicas', 'Comité temático estatutario', 'bg-emerald-600', 'Temático'),
  ('Bienestar, Fomento Cultural y de Seguridad y Salud en el Trabajo', 'Comité temático estatutario', 'bg-night', 'Temático'),
  ('Comité de Quejas y Reclamos', 'Instruye el procedimiento disciplinario (Art. 43)', 'bg-brick', 'Estatutario'),
  ('Comisión Estatutaria de Reclamos', 'Atiende reclamos estatutarios de los afiliados', 'bg-night', 'Estatutario')
) as v(name, activity, color, tipo)
where not exists (select 1 from public.committees);
