-- =============================================================================
-- SERDNP · Escalas salariales del DNP (Decreto 0312 de 2026)
-- Carga la tabla nivel/grado -> asignación básica para SERDNP. Al afiliar, el
-- desplegable "Escala salarial" autocompleta la asignación (y la cuota del 0,3%).
-- Idempotente: reemplaza las escalas de SERDNP. Ejecutar en el SQL Editor.
--
-- ⚠️ VERIFICA los valores contra el decreto oficial (transcritos de una imagen);
--    si alguno quedó mal, se edita en Parámetros → Escalas salariales.
-- =============================================================================
do $$
declare v_org uuid := '11111111-1111-1111-1111-111111111111';
begin
  delete from public.escalas where org_id = v_org;

  insert into public.escalas (org_id, nivel, grado, asignacion_basica) values
  -- DIRECTIVO (grados 1–28)
  (v_org,'Directivo','1',5293582),(v_org,'Directivo','2',5919856),(v_org,'Directivo','3',6250865),
  (v_org,'Directivo','4',6643885),(v_org,'Directivo','5',6814857),(v_org,'Directivo','6',7117080),
  (v_org,'Directivo','7',7542646),(v_org,'Directivo','8',7708993),(v_org,'Directivo','9',7994734),
  (v_org,'Directivo','10',8588629),(v_org,'Directivo','11',8721841),(v_org,'Directivo','12',8997052),
  (v_org,'Directivo','13',9386531),(v_org,'Directivo','14',9892195),(v_org,'Directivo','15',10097999),
  (v_org,'Directivo','16',10237627),(v_org,'Directivo','17',10797415),(v_org,'Directivo','18',11693971),
  (v_org,'Directivo','19',12592536),(v_org,'Directivo','20',13847347),(v_org,'Directivo','21',14037005),
  (v_org,'Directivo','22',15532733),(v_org,'Directivo','23',17060240),(v_org,'Directivo','24',18409015),
  (v_org,'Directivo','25',19848984),(v_org,'Directivo','26',20881130),(v_org,'Directivo','27',21916397),
  (v_org,'Directivo','28',23137521),
  -- ASESOR (grados 1–18)
  (v_org,'Asesor','1',5166213),(v_org,'Asesor','2',5586678),(v_org,'Asesor','3',6096859),
  (v_org,'Asesor','4',6938944),(v_org,'Asesor','5',7117080),(v_org,'Asesor','6',8058630),
  (v_org,'Asesor','7',8997052),(v_org,'Asesor','8',9846004),(v_org,'Asesor','9',10347470),
  (v_org,'Asesor','10',10760056),(v_org,'Asesor','11',11313850),(v_org,'Asesor','12',11882975),
  (v_org,'Asesor','13',13028467),(v_org,'Asesor','14',13752254),(v_org,'Asesor','15',14035182),
  (v_org,'Asesor','16',15422174),(v_org,'Asesor','17',17038830),(v_org,'Asesor','18',18494549),
  -- PROFESIONAL (grados 1–24)
  (v_org,'Profesional','1',3119094),(v_org,'Profesional','2',3447756),(v_org,'Profesional','3',3603330),
  (v_org,'Profesional','4',3794233),(v_org,'Profesional','5',4013578),(v_org,'Profesional','6',4153336),
  (v_org,'Profesional','7',4358947),(v_org,'Profesional','8',4575014),(v_org,'Profesional','9',4772636),
  (v_org,'Profesional','10',4935489),(v_org,'Profesional','11',5143281),(v_org,'Profesional','12',5456748),
  (v_org,'Profesional','13',5912155),(v_org,'Profesional','14',6326832),(v_org,'Profesional','15',6994971),
  (v_org,'Profesional','16',7541568),(v_org,'Profesional','17',7932387),(v_org,'Profesional','18',8542781),
  (v_org,'Profesional','19',9189073),(v_org,'Profesional','20',9891820),(v_org,'Profesional','21',10543046),
  (v_org,'Profesional','22',11339380),(v_org,'Profesional','23',11981391),(v_org,'Profesional','24',12919932),
  -- TÉCNICO (grados 4–18)
  (v_org,'Técnico','4',1750905),(v_org,'Técnico','5',1842350),(v_org,'Técnico','6',2217402),
  (v_org,'Técnico','7',2362843),(v_org,'Técnico','8',2422734),(v_org,'Técnico','9',2666265),
  (v_org,'Técnico','10',2790104),(v_org,'Técnico','11',2941402),(v_org,'Técnico','12',3119094),
  (v_org,'Técnico','13',3326260),(v_org,'Técnico','14',3447756),(v_org,'Técnico','15',3603330),
  (v_org,'Técnico','16',4071270),(v_org,'Técnico','17',4358391),(v_org,'Técnico','18',4789503),
  -- ASISTENCIAL (grados 8–26)
  (v_org,'Asistencial','8',1750905),(v_org,'Asistencial','9',1842350),(v_org,'Asistencial','10',2024954),
  (v_org,'Asistencial','11',2185702),(v_org,'Asistencial','12',2346870),(v_org,'Asistencial','13',2422734),
  (v_org,'Asistencial','14',2475809),(v_org,'Asistencial','15',2552762),(v_org,'Asistencial','16',2666265),
  (v_org,'Asistencial','17',2722571),(v_org,'Asistencial','18',2790104),(v_org,'Asistencial','19',2862077),
  (v_org,'Asistencial','20',2951001),(v_org,'Asistencial','21',3075194),(v_org,'Asistencial','22',3263351),
  (v_org,'Asistencial','23',3603330),(v_org,'Asistencial','24',3930192),(v_org,'Asistencial','25',4358947),
  (v_org,'Asistencial','26',4741982);
end $$;

-- Verificación: cuántas escalas por nivel.
select nivel, count(*) as grados, min(asignacion_basica) as min, max(asignacion_basica) as max
from public.escalas where org_id = '11111111-1111-1111-1111-111111111111'
group by nivel order by min(asignacion_basica);
