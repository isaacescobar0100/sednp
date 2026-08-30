-- Siembra los tipos de vinculación (Art. 5b) si la tabla está vacía.
-- (Cargos y dependencias ya se sembraron en el schema.sql; escalas se llenan
--  desde Parámetros con los valores del decreto.) Ejecutar en el SQL Editor.
insert into public.vinculaciones (name, color)
select v.name, v.color from (values
  ('Carrera administrativa', '#0F1B3D'),
  ('Provisionalidad', '#C9973B'),
  ('Libre nombramiento y remoción', '#B23A3A'),
  ('Periodo de prueba', '#3D5AAE'),
  ('Planta temporal', '#2E7D5B')
) as v(name, color)
where not exists (select 1 from public.vinculaciones);
