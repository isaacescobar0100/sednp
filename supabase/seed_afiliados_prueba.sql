-- Semilla rápida de afiliados de PRUEBA (ya ACTIVOS) para poder generar el corte
-- de aportes sin pasar por todo el flujo manual.
-- Idempotente: borra los de prueba (solicitud TEST-%) y los vuelve a crear.
-- Ejecutar en el SQL Editor de Supabase.

delete from public.affiliates where solicitud_no like 'TEST-%';

insert into public.affiliates
  (name, doc, role, cargo_titular, dependency, type, asignacion_basica, email, phone, address,
   beneficios, medio, motivo, interes_comites, solicitud_no, concepto_fiscal, aprobacion_acta,
   aprobacion_fecha, join_date, status)
values
  ('Carlos Andrés Pardo Rojas',  '1010111', 'Profesional universitario', 'Profesional universitario', 'Oficina de Planeación',        'Carrera Administrativa', 3500000, 'carlos.pardo@dnp.gov.co',   '300 111 2233', 'Bogotá D.C.', '{}', 'Correo', '', '', 'TEST-001', 'Positivo', 'Acta 001', '29/08/2026', '2020-01-15', 'Activo'),
  ('Diana Marcela Ortiz Gómez',  '1010222', 'Profesional especializado', 'Profesional especializado', 'Dirección de Inversiones',     'Carrera Administrativa', 4200000, 'diana.ortiz@dnp.gov.co',    '300 222 3344', 'Bogotá D.C.', '{}', 'Un compañero', '', '', 'TEST-002', 'Positivo', 'Acta 001', '29/08/2026', '2019-03-10', 'Activo'),
  ('Jorge Iván Salcedo Núñez',   '1010333', 'Técnico administrativo',    'Técnico administrativo',    'Secretaría General',           'Provisional',            2968262, 'jorge.salcedo@dnp.gov.co',  '300 333 4455', 'Bogotá D.C.', '{}', 'La Rebeca', '', '', 'TEST-003', 'Positivo', 'Acta 001', '29/08/2026', '2021-07-01', 'Activo'),
  ('Ana Sofía Méndez Torres',    '1010444', 'Asesor',                    'Asesor',                    'Dirección General',            'LNR',                    6300000, 'ana.mendez@dnp.gov.co',     '300 444 5566', 'Bogotá D.C.', '{}', 'Correo', '', '', 'TEST-004', 'Positivo', 'Acta 001', '29/08/2026', '2018-05-20', 'Activo'),
  ('Luis Alberto Ramírez Peña',  '1010555', 'Profesional universitario', 'Profesional universitario', 'Oficina Jurídica',             'Carrera Administrativa', 5100000, 'luis.ramirez@dnp.gov.co',   '300 555 6677', 'Bogotá D.C.', '{}', 'Otros', '', '', 'TEST-005', 'Positivo', 'Acta 001', '29/08/2026', '2022-02-14', 'Activo'),
  ('Paula Andrea Guerrero Díaz', '1010666', 'Gestor',                    'Gestor',                    'Dirección de Regalías',        'Provisional',            3800000, 'paula.guerrero@dnp.gov.co', '300 666 7788', 'Bogotá D.C.', '{}', 'Un compañero', '', '', 'TEST-006', 'Positivo', 'Acta 001', '29/08/2026', '2023-09-01', 'Activo');

-- Verifica cuántos activos quedaron:
select count(*) filter (where status = 'Activo') as activos, count(*) as total
from public.affiliates;
