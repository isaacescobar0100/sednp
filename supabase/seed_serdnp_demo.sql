-- =============================================================================
-- SIG-SERDNP · Datos de demostración (1 año) para SERDNP
-- Puebla el sindicato SERDNP con afiliados, cuotas, finanzas, gobernanza,
-- disciplinario, comités, comunicaciones y documental — para ver todo con datos.
-- NO toca cuentas de login ni otros sindicatos. Idempotente (borra y recarga
-- solo los datos de negocio de SERDNP). Ejecutar en el SQL Editor.
-- =============================================================================
do $$
declare
  v_org uuid := '11111111-1111-1111-1111-111111111111';
  firsts text[] := array['María Fernanda','Carlos Andrés','Diana Marcela','Jorge Iván','Ana Sofía','Luis Alberto','Paula Andrea','Andrés Felipe','Laura Camila','Miguel Ángel','Sofía','Julián David','Camila','Ricardo','Valentina','Óscar Mauricio','Daniela','Fernando José','Natalia','Héctor','Lucía','Sergio','Ángela María','Mateo','Isabella','Nicolás','Adriana','Gustavo','Carolina','Esteban'];
  lasts text[] := array['Rojas','Pardo','Ortiz','Salcedo','Méndez','Gómez','Torres','Ramírez','Castro','Núñez','Vargas','Moreno','Jiménez','Herrera','Guerrero','Cárdenas','Ospina','Beltrán','Quintero','Rincón','Salazar','Peña','Acosta','Duarte','Camargo','Forero','Mejía','Suárez','Villamil','Bautista'];
  cargos text[] := array['Profesional especializado','Asesor','Profesional universitario','Gestor','Técnico administrativo','Auxiliar administrativo','Director técnico','Coordinador de grupo','Analista','Contratista de apoyo'];
  deps text[] := array['Dirección General','Subdirección Territorial','Dirección de Inversiones','Oficina de Planeación','Dirección de Desarrollo Social','Secretaría General','Oficina Jurídica','Dirección de Regalías','Oficina de Tecnología','Dirección de Seguimiento y Evaluación'];
  tipos text[] := array['LNR','Carrera administrativa','Provisional','Contratista'];
  medios text[] := array['La Rebeca','Un compañero','Correo','Otros'];
  meses text[] := array['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  mesesab text[] := array['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  v_base date := date '2025-09-01';  -- primer mes de los 12
  i int; m int;
  v_name text; v_asig numeric; v_status text; v_type text; v_aff uuid;
  v_mdate date; v_period text; v_sum numeric;
begin
  -- Limpia SOLO los datos de negocio de SERDNP (no toca cuentas ni la organización).
  delete from public.aportes where org_id = v_org;
  delete from public.movements where org_id = v_org;
  delete from public.affiliates where org_id = v_org;
  delete from public.cases where org_id = v_org;
  delete from public.sessions where org_id = v_org;
  delete from public.ballots where org_id = v_org;
  delete from public.comunicados where org_id = v_org;
  delete from public.committees where org_id = v_org;
  delete from public.docs where org_id = v_org;

  -- 1) AFILIADOS (50) + 2) CUOTAS mensuales (12 meses) para los activos
  for i in 1..50 loop
    v_name := firsts[1 + (i*7) % 30] || ' ' || lasts[1 + (i*3) % 30] || ' ' || lasts[1 + (i*5 + 5) % 30];
    v_asig := 2800000 + (i % 8) * 600000;
    v_type := tipos[1 + i % 4];
    v_status := case when i % 17 = 0 then 'Retirado' when i % 13 = 0 then 'Suspendido' when i % 11 = 0 then 'Pendiente' else 'Activo' end;

    insert into public.affiliates (org_id, name, doc, role, cargo_titular, dependency, type, asignacion_basica, email, phone, address, beneficios, medio, solicitud_no, concepto_fiscal, aprobacion_acta, aprobacion_fecha, join_date, status)
    values (
      v_org, v_name,
      (20000000 + (i*733337) % 79000000)::text,
      cargos[1 + (i*5) % 10], cargos[1 + (i*7) % 10], deps[1 + (i*3) % 10], v_type, v_asig,
      'afiliado' || i || '@dnp.gov.co',
      '3' || lpad(((i*987659) % 999999999)::text, 9, '0'),
      'Bogotá D.C.', '{}', medios[1 + i % 4],
      'SOL-2026-' || lpad(i::text,3,'0'),
      case when v_status='Activo' then 'Positivo' else null end,
      case when v_status='Activo' then 'ACTA-JD-' || (10 + i % 20) else null end,
      case when v_status='Activo' then to_char(v_base + ((i%12)||' month')::interval,'YYYY-MM-DD') else null end,
      to_char(date '2018-01-01' + ((i*37) % 2900), 'DD/MM/YYYY'),
      v_status
    ) returning id into v_aff;

    if v_status = 'Activo' then
      for m in 0..11 loop
        v_mdate := (v_base + (m || ' month')::interval)::date;
        insert into public.aportes (org_id, affiliate_id, period, amount, tipo, status, paid_date, method)
        values (v_org, v_aff, to_char(v_mdate,'YYYY-MM'), round(v_asig*0.003), 'Ordinaria', 'Pagado', to_char(v_mdate + 4,'YYYY-MM-DD'), 'Nómina');
      end loop;
    end if;
  end loop;

  -- 3) MOVIMIENTOS: ingreso mensual por cuotas
  for m in 0..11 loop
    v_mdate := (v_base + (m || ' month')::interval)::date;
    v_period := to_char(v_mdate,'YYYY-MM');
    select coalesce(sum(amount),0) into v_sum from public.aportes where org_id = v_org and period = v_period;
    insert into public.movements (org_id, date, concept, category, kind, amount, status, nivel, firma_tesorero, firma_presidente)
    values (v_org, to_char(v_mdate + 4,'DD') || ' ' || mesesab[extract(month from v_mdate + 4)::int] || ' ' || to_char(v_mdate + 4,'YYYY'), 'Recaudo de cuotas ordinarias — ' || meses[extract(month from v_mdate)::int], 'Cuotas ordinarias', 'Ingreso', v_sum, 'Confirmado', 'tesoreria', true, true);
  end loop;

  -- Egresos y otros ingresos del año
  insert into public.movements (org_id, date, concept, category, kind, amount, status, nivel, firma_tesorero, firma_presidente, firma_fiscal, orden_pago) values
    (v_org,'15 oct 2025','Asesoría jurídica — retención sindical','Defensa','Egreso',2200000,'Pagado','junta',true,true,true,'OP-2025-014'),
    (v_org,'20 nov 2025','Papelería y gastos de oficina','Operación','Egreso',680000,'Pagado','tesoreria',true,false,false,'OP-2025-021'),
    (v_org,'05 dic 2025','Actividad de bienestar de fin de año','Bienestar','Egreso',3500000,'Pagado','junta',true,true,true,'OP-2025-030'),
    (v_org,'18 feb 2026','Capacitación en negociación colectiva','Formación','Egreso',1900000,'Pagado','junta',true,true,true,'OP-2026-006'),
    (v_org,'10 abr 2026','Gravamen a los movimientos financieros (GMF)','Operación','Egreso',145000,'Pagado','tesoreria',true,false,false,'OP-2026-012'),
    (v_org,'22 jun 2026','Apoyo jurídico caso disciplinario','Defensa','Egreso',1200000,'Aprobado','junta',false,true,true,null),
    (v_org,'08 ago 2026','Jornada deportiva y de integración','Bienestar','Egreso',900000,'Por aprobar','tesoreria',false,false,false,null);
  insert into public.movements (org_id, date, concept, category, kind, amount, status, nivel, firma_tesorero, firma_presidente) values
    (v_org,'14 mar 2026','Multa disciplinaria — Resolución 003','Multas y sanciones','Ingreso',426000,'Confirmado','junta',true,true),
    (v_org,'30 may 2026','Rendimientos financieros cuenta de ahorros','Rendimientos financieros','Ingreso',312000,'Confirmado','tesoreria',true,false);

  -- 4) GOBERNANZA: sesiones y votaciones
  insert into public.sessions (org_id, day, month, title, detail, organ, status, minutes, asistentes, quorum) values
    (v_org,'12','Oct','Junta Directiva ordinaria','Aprobación de presupuesto y plan de trabajo','Junta Directiva','Realizada','Acta JD-011',7,true),
    (v_org,'20','Ene','Asamblea General ordinaria','Rendición de cuentas de la vigencia','Asamblea','Realizada','Acta AG-001',186,true),
    (v_org,'15','Abr','Junta Directiva ordinaria','Seguimiento financiero y disciplinario','Junta Directiva','Realizada','Acta JD-014',6,true),
    (v_org,'18','Sep','Junta Directiva ordinaria','Preparación de asamblea extraordinaria','Junta Directiva','Programada',null,null,null);

  insert into public.ballots (org_id, title, closes_at, favor, contra, abstencion, status, outcome, secreta) values
    (v_org,'Aprobación del presupuesto 2026','2025-10-12',6,1,0,'Cerrada','Aprobada',false),
    (v_org,'Cuota extraordinaria para defensa jurídica','2026-02-15',148,22,16,'Cerrada','Aprobada',true),
    (v_org,'Reforma parcial de estatutos','',0,0,0,'En curso',null,false);

  -- 5) COMUNICACIONES
  insert into public.comunicados (org_id, subject, body, audience, date, status) values
    (v_org,'Convocatoria a Asamblea General','Se convoca a todos los afiliados a la Asamblea General ordinaria para la rendición de cuentas y aprobación del plan de trabajo.','Todos los afiliados','2026-01-10','Entregado'),
    (v_org,'Resultados de la votación de presupuesto','El presupuesto 2026 fue aprobado por mayoría en la Junta Directiva. Gracias por su participación.','Todos los afiliados','2025-10-13','Entregado'),
    (v_org,'Nuevo convenio de bienestar','Se firmó un convenio para descuentos en actividades recreativas y educativas para los afiliados y sus familias.','Todos los afiliados','2026-03-02','Entregado'),
    (v_org,'Recordatorio de cuota sindical','Recuerde que la cuota ordinaria del 0,3% se descuenta por nómina. Ante cualquier novedad, contacte a la Tesorería.','Todos los afiliados','2026-05-20','Entregado'),
    (v_org,'Jornada deportiva y de integración','Invitamos a la jornada deportiva del mes. Habrá actividades para toda la familia.','Todos los afiliados','2026-08-01','Entregado');

  -- 6) COMITÉS
  insert into public.committees (org_id, name, lead, members, next, activity, color, tipo) values
    (v_org,'Comité de Bienestar','Lina María Ocampo Palacio','{"Zulay Olarte Bermúdez","Ludy Maritza Montoya"}','2026-09-20','Organización de la jornada deportiva','bg-gold','Temático'),
    (v_org,'Comité de Convivencia Laboral','Nini Dahyana Idarraga Garay','{"Carlos Andrés Rojas","Ana Sofía Gómez"}','2026-09-15','Revisión de casos de convivencia','bg-night','Estatutario'),
    (v_org,'Comité de Formación','Ludy Maritza Montoya','{"Sergio Peña"}','2026-10-05','Plan anual de capacitaciones','bg-brick','Temático');

  -- 7) DOCUMENTAL
  insert into public.docs (org_id, code, title, type, file_name, file_size, date) values
    (v_org,'EST-001','Estatutos vigentes','Estatuto','estatutos.pdf',480000,'2025-09-01'),
    (v_org,'ACT-JD-011','Acta Junta Directiva — octubre','Acta','acta-jd-011.pdf',120000,'2025-10-12'),
    (v_org,'ACT-AG-001','Acta Asamblea General','Acta','acta-ag-001.pdf',260000,'2026-01-20'),
    (v_org,'PRE-2026','Presupuesto aprobado 2026','Presupuesto','presupuesto-2026.pdf',95000,'2025-10-13'),
    (v_org,'RES-003','Resolución de sanción disciplinaria','Resolución','res-003.pdf',88000,'2026-03-14');

  -- 8) DISCIPLINARIO
  insert into public.cases (org_id, code, subject, person, opened_date, stage_index, days_left, status, sancion, multa_monto, recurso_tipo, recurso_estado, recurso_resultado) values
    (v_org,'DIS-2026-001','Incumplimiento de deberes estatutarios','Afiliado 12','2026-02-10',4,0,'Con fallo','Multa',426000,'Reposición','Resuelto','Confirma'),
    (v_org,'DIS-2026-002','Conducta contraria a los estatutos','Afiliado 27','2026-05-18',2,15,'En trámite',null,null,null,null,null),
    (v_org,'DIS-2026-003','Falta leve — llamado de atención','Afiliado 5','2026-07-03',5,0,'Archivado','Absuelto',null,null,null,null);

  -- 9) PRESUPUESTO por rubro (montos aprobados)
  update public.presupuestos set anual = case category
    when 'Bienestar' then 40000000
    when 'Formación' then 18000000
    when 'Defensa'   then 25000000
    when 'Operación' then 12000000
    else anual end
  where org_id = v_org;

end $$;

-- Verificación: cuántos datos quedaron en SERDNP.
select 'afiliados' as tabla, count(*) from public.affiliates where org_id='11111111-1111-1111-1111-111111111111'
union all select 'cuotas', count(*) from public.aportes where org_id='11111111-1111-1111-1111-111111111111'
union all select 'movimientos', count(*) from public.movements where org_id='11111111-1111-1111-1111-111111111111'
union all select 'sesiones', count(*) from public.sessions where org_id='11111111-1111-1111-1111-111111111111'
union all select 'votaciones', count(*) from public.ballots where org_id='11111111-1111-1111-1111-111111111111'
union all select 'comunicados', count(*) from public.comunicados where org_id='11111111-1111-1111-1111-111111111111'
union all select 'comites', count(*) from public.committees where org_id='11111111-1111-1111-1111-111111111111'
union all select 'documentos', count(*) from public.docs where org_id='11111111-1111-1111-1111-111111111111'
union all select 'casos', count(*) from public.cases where org_id='11111111-1111-1111-1111-111111111111';
