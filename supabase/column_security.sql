-- Seguridad a nivel de COLUMNA (separación de funciones real, servidor).
-- Aunque RLS permita actualizar la fila, estos triggers impiden que un rol
-- cambie campos que no le corresponden. Ejecutar en el SQL Editor.

-- =============================================================================
-- AFILIADOS: concepto = Fiscal · estado/aprobación = Presidencia · datos = Secretaría/Presidencia
-- =============================================================================
create or replace function public.enforce_affiliate_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare r app_role := public.app_role();
begin
  -- El concepto fiscal solo lo cambia el Fiscal.
  if new.concepto_fiscal is distinct from old.concepto_fiscal and r <> 'fiscal' then
    raise exception 'Solo el Fiscal puede emitir el concepto.';
  end if;

  -- El estado y la aprobación solo los cambia la Presidencia.
  if (new.status is distinct from old.status
      or new.aprobacion_acta is distinct from old.aprobacion_acta
      or new.aprobacion_fecha is distinct from old.aprobacion_fecha)
     and r <> 'presidencia' then
    raise exception 'Solo la Presidencia puede cambiar estado o aprobación.';
  end if;

  -- El Fiscal solo emite concepto: no puede editar los datos del afiliado.
  if r = 'fiscal' then
    if new.name is distinct from old.name
       or new.doc is distinct from old.doc
       or new.role is distinct from old.role
       or new.cargo_titular is distinct from old.cargo_titular
       or new.dependency is distinct from old.dependency
       or new.type is distinct from old.type
       or new.asignacion_basica is distinct from old.asignacion_basica
       or new.email is distinct from old.email
       or new.phone is distinct from old.phone
       or new.address is distinct from old.address then
      raise exception 'El Fiscal solo puede emitir el concepto, no editar datos.';
    end if;
  end if;

  return new;
end $$;

drop trigger if exists trg_affiliate_columns on public.affiliates;
create trigger trg_affiliate_columns
  before update on public.affiliates
  for each row execute function public.enforce_affiliate_columns();

-- =============================================================================
-- MOVIMIENTOS: cada firma la pone su titular · aprobar/rechazar = Presidencia ·
--              pagar = Tesorería
-- =============================================================================
create or replace function public.enforce_movement_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare r app_role := public.app_role();
begin
  -- Cada firma solo la registra su rol.
  if new.firma_presidente is distinct from old.firma_presidente and r <> 'presidencia' then
    raise exception 'Solo la Presidencia firma como Presidente.';
  end if;
  if new.firma_tesorero is distinct from old.firma_tesorero and r <> 'tesoreria' then
    raise exception 'Solo la Tesorería firma como Tesorero.';
  end if;
  if new.firma_fiscal is distinct from old.firma_fiscal and r <> 'fiscal' then
    raise exception 'Solo el Fiscal firma como Fiscal.';
  end if;

  -- Cambios de estado con separación de funciones.
  if new.status is distinct from old.status then
    if new.status in ('Aprobado', 'Rechazado') and r <> 'presidencia' then
      raise exception 'Solo la Presidencia aprueba o rechaza gastos.';
    end if;
    if new.status = 'Pagado' and r <> 'tesoreria' then
      raise exception 'Solo la Tesorería marca como pagado.';
    end if;
  end if;

  return new;
end $$;

drop trigger if exists trg_movement_columns on public.movements;
create trigger trg_movement_columns
  before update on public.movements
  for each row execute function public.enforce_movement_columns();

-- =============================================================================
-- DISCIPLINARIO: instrucción (etapas, interponer recurso) = Fiscal ·
--                fallo (sanción, estado) y resolución de recurso = Presidencia
-- =============================================================================
create or replace function public.enforce_case_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare r app_role := public.app_role();
begin
  -- Avanzar etapas (instrucción) es del Fiscal.
  if (new.stage_index is distinct from old.stage_index
      or new.days_left is distinct from old.days_left)
     and r <> 'fiscal' then
    raise exception 'Solo el Fiscal instruye (avanza etapas).';
  end if;

  -- El fallo (estado, sanción, multa) lo profiere la Presidencia.
  if (new.status is distinct from old.status
      or new.sancion is distinct from old.sancion
      or new.multa_monto is distinct from old.multa_monto)
     and r <> 'presidencia' then
    raise exception 'Solo la Presidencia profiere el fallo.';
  end if;

  -- Interponer recurso (fijar el tipo) es del Fiscal (instrucción/defensa).
  if new.recurso_tipo is distinct from old.recurso_tipo and r <> 'fiscal' then
    raise exception 'El recurso lo interpone el Fiscal.';
  end if;

  -- Resolver el recurso (Confirma/Revoca) es de la Presidencia/Asamblea.
  if new.recurso_resultado is distinct from old.recurso_resultado
     and new.recurso_resultado is not null
     and r <> 'presidencia' then
    raise exception 'Solo la Presidencia/Asamblea resuelve el recurso.';
  end if;

  return new;
end $$;

drop trigger if exists trg_case_columns on public.cases;
create trigger trg_case_columns
  before update on public.cases
  for each row execute function public.enforce_case_columns();
