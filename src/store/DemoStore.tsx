import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { useAuth } from './auth'
import { hasSupabase, supabase } from '../lib/supabase'
import { fetchAffiliates, insertAffiliate, patchAffiliate } from './affiliatesApi'
import { fetchAportes, insertAportes, patchAporte } from './aportesApi'
import { fetchMovements, insertMovement, patchMovement, deleteMovementRow } from './movementsApi'
import { Params, clearCajaGastos, deletePresupuesto as deletePresupuestoRow, fetchCajaGastos, fetchCuentas, fetchParams, fetchPresupuestos, insertCajaGasto, replaceCuentas, upsertParams, upsertPresupuesto } from './configApi'
import { deleteCaseRow, fetchCases, insertCase, patchCase } from './casesApi'
import { CaseEvent, fetchCaseEvents, insertCaseEvent } from './caseEventsApi'
import { cerrarVencidas, deleteBallotRow, deleteSessionRow, emitirVoto, fetchBallots, fetchMyVotes, fetchSessions, insertBallot, insertSession, patchBallot, patchSession } from './governanceApi'
import { deleteComunicadoRow, fetchComunicados, insertComunicado } from './commsApi'
import { deleteCommitteeRow, fetchCommittees, insertCommittee, patchCommittee } from './committeesApi'
import { deleteDocRow, fetchDocs, insertDoc, patchDoc } from './docsApi'
import { fetchCargos, fetchDependencias, fetchEscalas, fetchVinculaciones, replaceCargos, replaceDependencias, replaceEscalas, replaceVinculaciones } from './catalogsApi'
import {
  Affiliate,
  AffiliateStatus,
  AffiliateType,
  nextSolicitud,
  seedAffiliates,
} from './affiliates'
import {
  VinculacionType,
  seedCargos,
  seedDependencias,
  seedVinculaciones,
} from './catalogs'
import {
  Aporte,
  AporteMethod,
  DEFAULT_PORCENTAJE_CUOTA,
  TOPE_EXTRAORDINARIA,
  calcularCuota,
  currentPeriod,
  periodLabel,
} from './contributions'
import { Escala, seedEscalas } from './payscale'
import {
  CajaGasto,
  Cuenta,
  DEFAULT_SMMLV,
  FirmaKey,
  Movement,
  MovementKind,
  MovementStatus,
  Presupuesto,
  formatCop,
  nextOrdenPago,
  nivelGasto,
  seedCuentas,
  seedMovements,
  seedPresupuestos,
  todayLabel,
} from './finance'
import {
  DisciplineCase,
  RecursoResultado,
  RecursoTipo,
  Sancion,
  nextCaseCode,
  seedCases,
  stages,
  termOf,
  todayLabel as caseTodayLabel,
} from './discipline'
import {
  Ballot,
  GovSession,
  seedBallots,
  seedSessions,
  totalVotes,
} from './governance'
import {
  Doc,
  DocType,
  nextDocCode,
  seedDocs,
  todayLabel as docTodayLabel,
} from './documents'
import {
  Comunicado,
  nowLabel as commNowLabel,
  seedComunicados,
} from './comms'
import {
  Committee,
  committeeColor,
  seedCommittees,
} from './committees'

// Almacén de la demo. Guarda todo en localStorage para que lo que el usuario
// crea/edita sobreviva a recargas durante una presentación. "Reiniciar demo"
// vuelve al estado inicial.

const STORAGE_KEY = 'serdnp-demo-v3'

type DemoState = {
  affiliates: Affiliate[]
  movements: Movement[]
  cases: DisciplineCase[]
  caseEvents: CaseEvent[]
  sessions: GovSession[]
  ballots: Ballot[]
  myVotes: string[]
  docs: Doc[]
  comunicados: Comunicado[]
  committees: Committee[]
  cargos: string[]
  dependencias: string[]
  vinculaciones: VinculacionType[]
  aportes: Aporte[]
  porcentajeCuota: number
  smmlv: number
  presupuestos: Presupuesto[]
  escalas: Escala[]
  cuentas: Cuenta[]
  cajaFondo: number
  cajaGastos: CajaGasto[]
  caucionVence: string
  juntaDesde: string
}

function seedState(): DemoState {
  return {
    affiliates: seedAffiliates(),
    movements: seedMovements(),
    cases: seedCases(),
    caseEvents: [],
    sessions: seedSessions(),
    ballots: seedBallots(),
    myVotes: [],
    docs: seedDocs(),
    comunicados: seedComunicados(),
    committees: seedCommittees(),
    cargos: seedCargos(),
    dependencias: seedDependencias(),
    vinculaciones: seedVinculaciones(),
    aportes: [],
    porcentajeCuota: DEFAULT_PORCENTAJE_CUOTA,
    smmlv: DEFAULT_SMMLV,
    presupuestos: seedPresupuestos(),
    escalas: seedEscalas(),
    cuentas: seedCuentas(),
    cajaFondo: 0,
    cajaGastos: [],
    caucionVence: '',
    juntaDesde: '',
  }
}

type VoteChoice = 'favor' | 'contra' | 'abstencion'

type Action =
  | { type: 'setAffiliates'; list: Affiliate[] }
  | { type: 'setAportes'; list: Aporte[] }
  | { type: 'add'; affiliate: Affiliate }
  | { type: 'setStatus'; id: string; status: AffiliateStatus }
  | { type: 'conceptAffiliate'; id: string; concepto: 'Positivo' | 'Negativo' }
  | { type: 'approveAffiliate'; id: string; acta: string; fecha: string }
  | { type: 'updateAffiliate'; id: string; changes: Partial<Affiliate> }
  | { type: 'setMovements'; list: Movement[] }
  | { type: 'addMovement'; movement: Movement }
  | { type: 'setMovementStatus'; id: string; status: MovementStatus }
  | { type: 'updateMovement'; id: string; changes: Partial<Movement> }
  | { type: 'deleteMovement'; id: string }
  | { type: 'signMovement'; id: string; who: FirmaKey }
  | { type: 'setSmmlv'; value: number }
  | { type: 'setCases'; list: DisciplineCase[] }
  | { type: 'setCaseEvents'; list: CaseEvent[] }
  | { type: 'addCaseEvent'; event: CaseEvent }
  | { type: 'addCase'; case: DisciplineCase }
  | { type: 'advanceCase'; id: string }
  | { type: 'ruleCase'; id: string; resultado: Sancion | 'Archivado'; monto?: number }
  | { type: 'interponerRecurso'; id: string; tipo: RecursoTipo }
  | { type: 'resolverRecurso'; id: string; resultado: RecursoResultado }
  | { type: 'deleteCase'; id: string }
  | { type: 'setSessions'; list: GovSession[] }
  | { type: 'setBallots'; list: Ballot[] }
  | { type: 'setMyVotes'; list: string[] }
  | { type: 'addMyVote'; id: string }
  | { type: 'addSession'; session: GovSession }
  | { type: 'publishMinutes'; id: string; minutes: string; asistentes?: number; quorum?: boolean }
  | { type: 'deleteSession'; id: string }
  | { type: 'addBallot'; ballot: Ballot }
  | { type: 'castVote'; id: string; choice: VoteChoice }
  | { type: 'castAffiliateVote'; id: string; choice: VoteChoice; affiliateId: string }
  | { type: 'closeBallot'; id: string }
  | { type: 'deleteBallot'; id: string }
  | { type: 'setDocs'; list: Doc[] }
  | { type: 'addDoc'; doc: Doc }
  | { type: 'updateDoc'; id: string; changes: Partial<Doc> }
  | { type: 'deleteDoc'; id: string }
  | { type: 'setComunicados'; list: Comunicado[] }
  | { type: 'addComunicado'; comunicado: Comunicado }
  | { type: 'deleteComunicado'; id: string }
  | { type: 'setCommittees'; list: Committee[] }
  | { type: 'addCommittee'; committee: Committee }
  | { type: 'updateCommittee'; id: string; changes: Partial<Committee> }
  | { type: 'deleteCommittee'; id: string }
  | { type: 'setCargos'; list: string[] }
  | { type: 'setDependencias'; list: string[] }
  | { type: 'setVinculaciones'; list: VinculacionType[] }
  | { type: 'setEscalas'; list: Escala[] }
  | { type: 'generateAportes'; period: string }
  | { type: 'decretarExtraordinaria'; period: string; pct: number; acta: string }
  | { type: 'payAporte'; id: string; method: AporteMethod; date: string }
  | { type: 'anticiparAporte'; id: string }
  | { type: 'setPorcentajeCuota'; value: number }
  | { type: 'setPresupuesto'; category: string; anual: number }
  | { type: 'deletePresupuesto'; category: string }
  | { type: 'setCuentas'; list: Cuenta[] }
  | { type: 'setParams'; value: Params }
  | { type: 'setPresupuestos'; list: Presupuesto[] }
  | { type: 'setCajaGastos'; list: CajaGasto[] }
  | { type: 'aperturaCaja'; monto: number }
  | { type: 'addCajaGasto'; gasto: CajaGasto }
  | { type: 'reembolsoCaja' }
  | { type: 'setCaucion'; fecha: string }
  | { type: 'setJuntaDesde'; fecha: string }
  | { type: 'reset' }

// Al activar un afiliado, si ya se generó el corte del mes se le crea su aporte
// pendiente para no quedar fuera del periodo.
// Devuelve el aporte pendiente a crear al activar un afiliado (o null): solo si
// ya se generó el corte del mes y el afiliado aún no tiene aporte en él.
function aporteParaActivar(aportes: Aporte[], target: Affiliate | undefined, porcentaje: number): Aporte | null {
  if (!target) return null
  const period = currentPeriod()
  const corteExists = aportes.some((a) => a.period === period)
  const yaTiene = aportes.some((a) => a.period === period && a.affiliateId === target.id)
  if (corteExists && !yaTiene) {
    return { id: '', affiliateId: target.id, period, amount: calcularCuota(target.asignacionBasica, porcentaje), tipo: 'Ordinaria', status: 'Pendiente' }
  }
  return null
}

function reducer(state: DemoState, action: Action): DemoState {
  switch (action.type) {
    case 'setAffiliates':
      return { ...state, affiliates: action.list }
    case 'add':
      return { ...state, affiliates: [action.affiliate, ...state.affiliates] }
    case 'setAportes':
      return { ...state, aportes: action.list }
    case 'setStatus': {
      const affiliates = state.affiliates.map((a) => (a.id === action.id ? { ...a, status: action.status } : a))
      return { ...state, affiliates }
    }
    case 'conceptAffiliate':
      return {
        ...state,
        affiliates: state.affiliates.map((a) => (a.id === action.id ? { ...a, conceptoFiscal: action.concepto } : a)),
      }
    case 'approveAffiliate': {
      // La Junta Directiva aprueba con acta (Art. 5d): queda Activo.
      const affiliates = state.affiliates.map((a) => (a.id === action.id ? { ...a, status: 'Activo' as AffiliateStatus, aprobacionActa: action.acta, aprobacionFecha: action.fecha } : a))
      return { ...state, affiliates }
    }
    case 'updateAffiliate':
      return {
        ...state,
        affiliates: state.affiliates.map((a) => (a.id === action.id ? { ...a, ...action.changes } : a)),
      }
    case 'setMovements':
      return { ...state, movements: action.list }
    case 'addMovement':
      return { ...state, movements: [action.movement, ...state.movements] }
    case 'setMovementStatus': {
      // Al pagarse un egreso se le asigna la orden de pago consecutiva (Art. 26).
      const target = state.movements.find((m) => m.id === action.id)
      const asignaOP = action.status === 'Pagado' && target?.kind === 'Egreso' && !target?.ordenPago
      const op = asignaOP ? nextOrdenPago(state.movements) : undefined
      return {
        ...state,
        movements: state.movements.map((m) => (m.id === action.id ? { ...m, status: action.status, ...(op ? { ordenPago: op } : {}) } : m)),
      }
    }
    case 'updateMovement':
      return {
        ...state,
        movements: state.movements.map((m) => (m.id === action.id ? { ...m, ...action.changes } : m)),
      }
    case 'deleteMovement':
      return { ...state, movements: state.movements.filter((m) => m.id !== action.id) }
    case 'signMovement':
      return {
        ...state,
        movements: state.movements.map((m) => (m.id === action.id ? { ...m, firmas: { ...m.firmas, [action.who]: true } } : m)),
      }
    case 'setSmmlv':
      return { ...state, smmlv: Math.max(0, action.value) }
    case 'setCases':
      return { ...state, cases: action.list }
    case 'setCaseEvents':
      return { ...state, caseEvents: action.list }
    case 'addCaseEvent':
      return { ...state, caseEvents: [...state.caseEvents, action.event] }
    case 'addCase':
      return { ...state, cases: [action.case, ...state.cases] }
    case 'advanceCase':
      return {
        ...state,
        cases: state.cases.map((c) => {
          if (c.id !== action.id) return c
          const stageIndex = Math.min(stages.length - 1, c.stageIndex + 1)
          return { ...c, stageIndex, daysLeft: termOf(stageIndex) }
        }),
      }
    case 'ruleCase': {
      // La multa ingresa al libro contable; ese movimiento lo inserta el callback.
      return {
        ...state,
        cases: state.cases.map((c) =>
          c.id === action.id
            ? action.resultado === 'Archivado'
              ? { ...c, status: 'Archivado', sancion: undefined }
              : { ...c, status: 'Con fallo', sancion: action.resultado, multaMonto: action.resultado === 'Multa' ? action.monto : undefined }
            : c,
        ),
      }
    }
    case 'interponerRecurso':
      return {
        ...state,
        cases: state.cases.map((c) => (c.id === action.id ? { ...c, recursoTipo: action.tipo, recursoEstado: 'Interpuesto', recursoResultado: undefined } : c)),
      }
    case 'resolverRecurso':
      return {
        ...state,
        cases: state.cases.map((c) => {
          if (c.id !== action.id) return c
          // Si el recurso revoca, el fallo queda sin sanción (absolutorio).
          return { ...c, recursoEstado: 'Resuelto', recursoResultado: action.resultado, sancion: action.resultado === 'Revoca' ? 'Absuelto' : c.sancion }
        }),
      }
    case 'deleteCase':
      return { ...state, cases: state.cases.filter((c) => c.id !== action.id) }
    case 'setSessions':
      return { ...state, sessions: action.list }
    case 'setBallots':
      return { ...state, ballots: action.list }
    case 'setMyVotes':
      return { ...state, myVotes: action.list }
    case 'addMyVote':
      return { ...state, myVotes: [...state.myVotes, action.id] }
    case 'addSession':
      return { ...state, sessions: [action.session, ...state.sessions] }
    case 'publishMinutes': {
      const target = state.sessions.find((s) => s.id === action.id)
      if (!target) return state
      const updated: GovSession = { ...target, status: 'Realizada', minutes: action.minutes, asistentes: action.asistentes, quorum: action.quorum }
      // La sesión con acta recién publicada pasa al frente (última acta).
      return { ...state, sessions: [updated, ...state.sessions.filter((s) => s.id !== action.id)] }
    }
    case 'deleteSession':
      return { ...state, sessions: state.sessions.filter((s) => s.id !== action.id) }
    case 'addBallot':
      return { ...state, ballots: [action.ballot, ...state.ballots] }
    case 'castVote':
      return {
        ...state,
        ballots: state.ballots.map((b) => (b.id === action.id ? { ...b, [action.choice]: b[action.choice] + 1 } : b)),
      }
    case 'castAffiliateVote':
      return {
        ...state,
        ballots: state.ballots.map((b) =>
          b.id === action.id ? { ...b, [action.choice]: b[action.choice] + 1, votedBy: [...(b.votedBy ?? []), action.affiliateId] } : b,
        ),
      }
    case 'closeBallot':
      return {
        ...state,
        ballots: state.ballots.map((b) =>
          b.id === action.id ? { ...b, status: 'Cerrada', outcome: b.favor > b.contra ? 'Aprobada' : 'Rechazada' } : b,
        ),
      }
    case 'deleteBallot':
      return { ...state, ballots: state.ballots.filter((b) => b.id !== action.id) }
    case 'setDocs':
      return { ...state, docs: action.list }
    case 'addDoc':
      return { ...state, docs: [action.doc, ...state.docs] }
    case 'updateDoc':
      return {
        ...state,
        docs: state.docs.map((d) => (d.id === action.id ? { ...d, ...action.changes } : d)),
      }
    case 'deleteDoc':
      return { ...state, docs: state.docs.filter((d) => d.id !== action.id) }
    case 'setComunicados':
      return { ...state, comunicados: action.list }
    case 'addComunicado':
      return { ...state, comunicados: [action.comunicado, ...state.comunicados] }
    case 'deleteComunicado':
      return { ...state, comunicados: state.comunicados.filter((c) => c.id !== action.id) }
    case 'setCommittees':
      return { ...state, committees: action.list }
    case 'addCommittee':
      return { ...state, committees: [...state.committees, action.committee] }
    case 'updateCommittee':
      return {
        ...state,
        committees: state.committees.map((c) => (c.id === action.id ? { ...c, ...action.changes } : c)),
      }
    case 'deleteCommittee':
      return { ...state, committees: state.committees.filter((c) => c.id !== action.id) }
    case 'setCargos':
      return { ...state, cargos: action.list }
    case 'setDependencias':
      return { ...state, dependencias: action.list }
    case 'setVinculaciones':
      return { ...state, vinculaciones: action.list }
    case 'setEscalas':
      return { ...state, escalas: action.list }
    case 'generateAportes': {
      // Genera un aporte pendiente por cada afiliado ACTIVO que aún no lo tenga
      // en ese periodo (idempotente: no duplica).
      const active = state.affiliates.filter((a) => a.status === 'Activo')
      const existing = new Set(state.aportes.filter((a) => a.period === action.period).map((a) => a.affiliateId))
      const nuevos: Aporte[] = active
        .filter((a) => !existing.has(a.id))
        .map((a) => ({ id: `apt-${action.period}-${a.id}`, affiliateId: a.id, period: action.period, amount: calcularCuota(a.asignacionBasica, state.porcentajeCuota), tipo: 'Ordinaria', status: 'Pendiente' }))
      return { ...state, aportes: [...nuevos, ...state.aportes] }
    }
    case 'payAporte': {
      const aporte = state.aportes.find((a) => a.id === action.id)
      if (!aporte || aporte.status === 'Pagado') return state
      // Marca el aporte pagado; el ingreso al libro contable lo inserta el callback.
      return {
        ...state,
        aportes: state.aportes.map((a) => (a.id === action.id ? { ...a, status: 'Pagado', paidDate: action.date, method: action.method } : a)),
      }
    }
    case 'decretarExtraordinaria': {
      // La Asamblea decreta una cuota extraordinaria (Art. 33), con tope del 3%
      // y respaldada en acta. Se genera un aporte extraordinario por afiliado
      // activo del periodo indicado; no se duplica si ya existe con esa acta.
      const pct = Math.min(TOPE_EXTRAORDINARIA, Math.max(0, action.pct))
      const active = state.affiliates.filter((a) => a.status === 'Activo')
      const yaCon = new Set(state.aportes.filter((a) => a.tipo === 'Extraordinaria' && a.period === action.period && a.acta === action.acta).map((a) => a.affiliateId))
      const nuevos: Aporte[] = active
        .filter((a) => !yaCon.has(a.id))
        .map((a) => ({ id: `aptx-${action.period}-${action.acta}-${a.id}`, affiliateId: a.id, period: action.period, amount: calcularCuota(a.asignacionBasica, pct), tipo: 'Extraordinaria', acta: action.acta, status: 'Pendiente' }))
      return { ...state, aportes: [...nuevos, ...state.aportes] }
    }
    case 'anticiparAporte':
      return {
        ...state,
        aportes: state.aportes.map((a) => (a.id === action.id ? { ...a, anticipada: true } : a)),
      }
    case 'setPorcentajeCuota':
      return { ...state, porcentajeCuota: Math.max(0, action.value) }
    case 'setPresupuesto': {
      const exists = state.presupuestos.some((p) => p.category === action.category)
      const anual = Math.max(0, action.anual)
      const presupuestos = exists
        ? state.presupuestos.map((p) => (p.category === action.category ? { ...p, anual } : p))
        : [...state.presupuestos, { category: action.category, anual }]
      return { ...state, presupuestos }
    }
    case 'deletePresupuesto':
      return { ...state, presupuestos: state.presupuestos.filter((p) => p.category !== action.category) }
    case 'setCuentas':
      return { ...state, cuentas: action.list }
    case 'setParams':
      return { ...state, porcentajeCuota: action.value.porcentajeCuota, smmlv: action.value.smmlv, caucionVence: action.value.caucionVence, juntaDesde: action.value.juntaDesde, cajaFondo: action.value.cajaFondo }
    case 'setPresupuestos':
      return { ...state, presupuestos: action.list }
    case 'setCajaGastos':
      return { ...state, cajaGastos: action.list }
    case 'aperturaCaja':
      // Abrir/ajustar el fondo de caja menor (tope 1 SMMLV) y limpiar gastos.
      return { ...state, cajaFondo: Math.max(0, action.monto), cajaGastos: [] }
    case 'addCajaGasto':
      return { ...state, cajaGastos: [action.gasto, ...state.cajaGastos] }
    case 'reembolsoCaja':
      // El reembolso repone el fondo (limpia gastos); el egreso lo inserta el callback.
      return { ...state, cajaGastos: [] }
    case 'setCaucion':
      return { ...state, caucionVence: action.fecha }
    case 'setJuntaDesde':
      return { ...state, juntaDesde: action.fecha }
    case 'reset':
      return seedState()
    default:
      return state
  }
}

// Fusiona lo guardado con las semillas: al agregar un slice nuevo (p. ej. cases)
// no se borran los datos existentes de la demo; solo se rellena lo que falte.
function loadInitial(): DemoState {
  const seeded = seedState()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<DemoState>
      return {
        affiliates: seeded.affiliates, // los afiliados se cargan desde Supabase, no de localStorage
        movements: seeded.movements, // los movimientos se cargan desde Supabase
        cases: seeded.cases, // los expedientes se cargan desde Supabase
        caseEvents: seeded.caseEvents,
        sessions: seeded.sessions, // se cargan desde Supabase
        ballots: seeded.ballots,   // se cargan desde Supabase
        myVotes: seeded.myVotes,
        docs: seeded.docs, // se cargan desde Supabase
        comunicados: seeded.comunicados, // se cargan desde Supabase
        committees: seeded.committees,   // se cargan desde Supabase
        cargos: Array.isArray(parsed.cargos) ? parsed.cargos : seeded.cargos,
        dependencias: Array.isArray(parsed.dependencias) ? parsed.dependencias : seeded.dependencias,
        vinculaciones: Array.isArray(parsed.vinculaciones) ? parsed.vinculaciones : seeded.vinculaciones,
        aportes: seeded.aportes, // los aportes se cargan desde Supabase
        porcentajeCuota: typeof parsed.porcentajeCuota === 'number' ? parsed.porcentajeCuota : seeded.porcentajeCuota,
        smmlv: typeof parsed.smmlv === 'number' ? parsed.smmlv : seeded.smmlv,
        presupuestos: Array.isArray(parsed.presupuestos) ? parsed.presupuestos : seeded.presupuestos,
        escalas: Array.isArray(parsed.escalas) ? parsed.escalas : seeded.escalas,
        cuentas: Array.isArray(parsed.cuentas) ? parsed.cuentas : seeded.cuentas,
        cajaFondo: typeof parsed.cajaFondo === 'number' ? parsed.cajaFondo : seeded.cajaFondo,
        cajaGastos: Array.isArray(parsed.cajaGastos) ? parsed.cajaGastos : seeded.cajaGastos,
        caucionVence: typeof parsed.caucionVence === 'string' ? parsed.caucionVence : seeded.caucionVence,
        juntaDesde: typeof parsed.juntaDesde === 'string' ? parsed.juntaDesde : seeded.juntaDesde,
      }
    }
  } catch {
    // localStorage no disponible o dato corrupto: se usan las semillas.
  }
  return seeded
}

export type AffiliateStats = {
  total: number
  active: number
  pending: number
  suspended: number
  retired: number
  distribution: Array<{ name: AffiliateType; value: number; color: string }>
}

type NewAffiliateInput = {
  name: string
  doc: string
  role: string
  cargoTitular: string
  dependency: string
  type: AffiliateType
  asignacionBasica: number
  email: string
  phone: string
  address: string
  password: string
  rolSindicato: string
  fotoUrl: string
  beneficios: string[]
  medio: string
  motivo: string
  interesComites: string
  joinDate: string
}

export type FinanceStats = {
  income: number
  expensesPaid: number
  pendingAmount: number
  pendingCount: number
  balance: number
}

type NewMovementInput = {
  concept: string
  category: string
  kind: MovementKind
  amount: number
  date?: string
}

export type DisciplineStats = {
  active: number
  nearDue: number
}

type NewCaseInput = {
  subject: string
  person: string
  daysLeft: number
}

type NewSessionInput = {
  day: string
  month: string
  title: string
  detail: string
  organ: string
}

type NewBallotInput = {
  title: string
  closesAt: string
  closesAtTs?: string
  secreta?: boolean
}

type NewDocInput = {
  title: string
  type: DocType
  fileName: string
  fileSize: number
  storagePath?: string
}

type NewComunicadoInput = {
  subject: string
  body: string
  audience: string
  recipients: number
}

type NewCommitteeInput = {
  name: string
  lead: string
  members: string[]
  next: string
}

type Toast = { id: number; message: string; tone: 'success' | 'info' | 'warning' }

type DemoContextValue = {
  affiliates: Affiliate[]
  stats: AffiliateStats
  addAffiliate: (input: NewAffiliateInput) => void
  setAffiliateStatus: (id: string, status: AffiliateStatus) => void
  conceptAffiliate: (id: string, concepto: 'Positivo' | 'Negativo') => void
  approveAffiliate: (id: string, acta: string) => void
  updateAffiliate: (id: string, changes: Partial<Affiliate>) => void
  movements: Movement[]
  financeStats: FinanceStats
  addMovement: (input: NewMovementInput) => void
  setMovementStatus: (id: string, status: MovementStatus) => void
  updateMovement: (id: string, changes: Partial<Movement>) => void
  deleteMovement: (id: string, concept: string) => void
  signMovement: (id: string, who: FirmaKey) => void
  smmlv: number
  setSmmlv: (value: number) => void
  cases: DisciplineCase[]
  disciplineStats: DisciplineStats
  addCase: (input: NewCaseInput) => void
  advanceCase: (id: string) => void
  ruleCase: (id: string, resultado: Sancion | 'Archivado', monto?: number) => void
  interponerRecurso: (id: string, tipo: RecursoTipo) => void
  resolverRecurso: (id: string, resultado: RecursoResultado) => void
  deleteCase: (id: string, code: string) => void
  caseEvents: CaseEvent[]
  addCaseEvent: (caseId: string, tipo: string, nota?: string, soportePath?: string) => void
  sessions: GovSession[]
  ballots: Ballot[]
  myVotes: string[]
  addSession: (input: NewSessionInput) => void
  publishMinutes: (id: string, minutes: string, asistentes?: number, quorum?: boolean) => void
  deleteSession: (id: string, title: string) => void
  addBallot: (input: NewBallotInput) => void
  castVote: (id: string, choice: VoteChoice) => void
  castAffiliateVote: (id: string, choice: VoteChoice, affiliateId: string) => void
  closeBallot: (id: string) => void
  deleteBallot: (id: string, title: string) => void
  docs: Doc[]
  addDoc: (input: NewDocInput) => void
  updateDoc: (id: string, changes: Partial<Doc>) => void
  deleteDoc: (id: string, code: string) => void
  comunicados: Comunicado[]
  sendComunicado: (input: NewComunicadoInput) => void
  deleteComunicado: (id: string) => void
  committees: Committee[]
  addCommittee: (input: NewCommitteeInput) => void
  updateCommittee: (id: string, input: NewCommitteeInput) => void
  deleteCommittee: (id: string, name: string) => void
  cargos: string[]
  dependencias: string[]
  vinculaciones: VinculacionType[]
  setCargos: (list: string[]) => void
  setDependencias: (list: string[]) => void
  setVinculaciones: (list: VinculacionType[]) => void
  escalas: Escala[]
  setEscalas: (list: Escala[]) => void
  aportes: Aporte[]
  porcentajeCuota: number
  generateAportes: (period: string) => void
  payAporte: (id: string, method: AporteMethod) => void
  decretarExtraordinaria: (period: string, pct: number, acta: string) => void
  anticiparAporte: (id: string) => void
  setPorcentajeCuota: (value: number) => void
  presupuestos: Presupuesto[]
  setPresupuesto: (category: string, anual: number) => void
  deletePresupuesto: (category: string) => void
  cuentas: Cuenta[]
  setCuentas: (list: Cuenta[]) => void
  cajaFondo: number
  cajaGastos: CajaGasto[]
  aperturaCaja: (monto: number) => void
  addCajaGasto: (concepto: string, monto: number, soporte: string) => void
  reembolsoCaja: (total: number) => void
  caucionVence: string
  setCaucion: (fecha: string) => void
  juntaDesde: string
  setJuntaDesde: (fecha: string) => void
  resetDemo: () => void
  notify: (message: string, tone?: Toast['tone']) => void
}

const DemoContext = createContext<DemoContextValue | null>(null)

export function DemoProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadInitial)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [toastSeq, setToastSeq] = useState(0)
  const { session, profile } = useAuth()
  const roleRef = useRef(profile?.role ?? '')
  roleRef.current = profile?.role ?? ''

  // Afiliados: fuente de verdad en Supabase. Se cargan al iniciar sesión y se
  // limpian al salir. Las demás tablas se migran en fases posteriores.
  useEffect(() => {
    if (!hasSupabase) return
    if (!session) {
      dispatch({ type: 'setAffiliates', list: [] })
      dispatch({ type: 'setAportes', list: [] })
      dispatch({ type: 'setMovements', list: [] })
      return
    }
    let active = true
    fetchAffiliates()
      .then((list) => { if (active) dispatch({ type: 'setAffiliates', list }) })
      .catch(() => { /* RLS o red: se conserva lo que haya */ })
    fetchAportes()
      .then((list) => { if (active) dispatch({ type: 'setAportes', list }) })
      .catch(() => {})
    fetchMovements()
      .then((list) => { if (active) dispatch({ type: 'setMovements', list }) })
      .catch(() => {})
    fetchParams()
      .then((p) => { if (active && p) dispatch({ type: 'setParams', value: p }) })
      .catch(() => {})
    fetchPresupuestos()
      .then((list) => { if (active && list.length) dispatch({ type: 'setPresupuestos', list }) })
      .catch(() => {})
    fetchCuentas()
      .then((list) => { if (active && list.length) dispatch({ type: 'setCuentas', list }) })
      .catch(() => {})
    fetchCajaGastos()
      .then((list) => { if (active) dispatch({ type: 'setCajaGastos', list }) })
      .catch(() => {})
    fetchCases()
      .then((list) => { if (active) dispatch({ type: 'setCases', list }) })
      .catch(() => {})
    fetchCaseEvents()
      .then((list) => { if (active) dispatch({ type: 'setCaseEvents', list }) })
      .catch(() => {})
    fetchSessions()
      .then((list) => { if (active) dispatch({ type: 'setSessions', list }) })
      .catch(() => {})
    // Cierra las vencidas en el servidor y luego carga el estado ya actualizado.
    cerrarVencidas().catch(() => {}).finally(() => {
      fetchBallots()
        .then((list) => { if (active) dispatch({ type: 'setBallots', list }) })
        .catch(() => {})
    })
    fetchMyVotes()
      .then((list) => { if (active) dispatch({ type: 'setMyVotes', list }) })
      .catch(() => {})
    fetchCommittees()
      .then((list) => { if (active) dispatch({ type: 'setCommittees', list }) })
      .catch(() => {})
    fetchComunicados()
      .then((list) => { if (active) dispatch({ type: 'setComunicados', list }) })
      .catch(() => {})
    fetchDocs()
      .then((list) => { if (active) dispatch({ type: 'setDocs', list }) })
      .catch(() => {})
    fetchCargos()
      .then((list) => { if (active && list.length) dispatch({ type: 'setCargos', list }) })
      .catch(() => {})
    fetchDependencias()
      .then((list) => { if (active && list.length) dispatch({ type: 'setDependencias', list }) })
      .catch(() => {})
    fetchVinculaciones()
      .then((list) => { if (active && list.length) dispatch({ type: 'setVinculaciones', list }) })
      .catch(() => {})
    fetchEscalas()
      .then((list) => { if (active) dispatch({ type: 'setEscalas', list }) })
      .catch(() => {})
    return () => { active = false }
  }, [session])

  // Realtime: cuando otra persona cambia datos, esta sesión se actualiza en vivo
  // (votaciones, dashboard, padrón…). Refetch por tabla con anti-rebote.
  useEffect(() => {
    if (!hasSupabase || !session) return
    const timers: Record<string, number> = {}
    const debounced = (key: string, fn: () => void) => {
      window.clearTimeout(timers[key])
      timers[key] = window.setTimeout(fn, 400)
    }
    const handlers: Record<string, () => void> = {
      affiliates: () => fetchAffiliates().then((list) => dispatch({ type: 'setAffiliates', list })).catch(() => {}),
      aportes: () => fetchAportes().then((list) => dispatch({ type: 'setAportes', list })).catch(() => {}),
      movements: () => fetchMovements().then((list) => dispatch({ type: 'setMovements', list })).catch(() => {}),
      cases: () => fetchCases().then((list) => dispatch({ type: 'setCases', list })).catch(() => {}),
      ballots: () => fetchBallots().then((list) => dispatch({ type: 'setBallots', list })).catch(() => {}),
      sessions: () => fetchSessions().then((list) => dispatch({ type: 'setSessions', list })).catch(() => {}),
      comunicados: () => fetchComunicados().then((list) => dispatch({ type: 'setComunicados', list })).catch(() => {}),
      committees: () => fetchCommittees().then((list) => dispatch({ type: 'setCommittees', list })).catch(() => {}),
      docs: () => fetchDocs().then((list) => dispatch({ type: 'setDocs', list })).catch(() => {}),
    }
    const channel = supabase.channel('serdnp-live')
    Object.keys(handlers).forEach((table) => {
      channel.on('postgres_changes' as never, { event: '*', schema: 'public', table } as never, () => debounced(table, handlers[table]))
    })
    channel.subscribe()
    return () => {
      Object.values(timers).forEach((t) => window.clearTimeout(t))
      supabase.removeChannel(channel)
    }
  }, [session])

  // Refs con los datos actuales, para generar códigos consecutivos sin recrear
  // los callbacks en cada cambio de estado.
  const casesRef = useRef(state.cases)
  casesRef.current = state.cases
  const docsRef = useRef(state.docs)
  docsRef.current = state.docs
  const committeesRef = useRef(state.committees)
  committeesRef.current = state.committees
  const smmlvRef = useRef(state.smmlv)
  smmlvRef.current = state.smmlv
  const affiliatesRef = useRef(state.affiliates)
  affiliatesRef.current = state.affiliates
  const movementsRef = useRef(state.movements)
  movementsRef.current = state.movements
  const aportesRef = useRef(state.aportes)
  aportesRef.current = state.aportes
  const ballotsRef = useRef(state.ballots)
  ballotsRef.current = state.ballots
  const porcentajeRef = useRef(state.porcentajeCuota)
  porcentajeRef.current = state.porcentajeCuota

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // Sin persistencia disponible: la demo sigue funcionando en memoria.
    }
  }, [state])

  const notify = useCallback((message: string, tone: Toast['tone'] = 'success') => {
    setToastSeq((seq) => {
      const id = seq + 1
      setToasts((prev) => [...prev, { id, message, tone }])
      window.setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3200)
      return id
    })
  }, [])

  const addAffiliate = useCallback((input: NewAffiliateInput) => {
    const draft: Affiliate = {
      ...input,
      id: '',
      solicitudNo: nextSolicitud(affiliatesRef.current),
      status: 'Pendiente',
    }
    insertAffiliate(draft)
      .then((saved) => {
        dispatch({ type: 'add', affiliate: saved })
        // Crea la cuenta de acceso con el rol elegido (afiliado o cargo de directiva).
        if (input.email.trim() && input.password.trim()) {
          supabase.rpc('crear_cuenta_persona', {
            p_email: input.email.trim().toLowerCase(),
            p_password: input.password,
            p_nombre: saved.name,
            p_rol: input.rolSindicato,
          }).then(({ error }) => {
            if (error) notify(`Afiliado guardado, pero no se pudo crear su acceso: ${error.message}`, 'warning')
          })
        }
        notify(`${saved.name || 'Nuevo afiliado'} (${saved.solicitudNo}) quedó en revisión.`, 'info')
      })
      .catch(() => notify('No se pudo registrar el afiliado. Verifica tu sesión y permisos.', 'warning'))
  }, [notify])


  // Al activar un afiliado, si ya hay corte del mes, se le crea su aporte
  // pendiente en Supabase.
  const crearAporteAlActivar = useCallback((id: string) => {
    const target = affiliatesRef.current.find((a) => a.id === id)
    const draft = aporteParaActivar(aportesRef.current, target, porcentajeRef.current)
    if (!draft) return
    insertAportes([draft])
      .then((saved) => dispatch({ type: 'setAportes', list: [...saved, ...aportesRef.current] }))
      .catch(() => {})
  }, [])

  const setAffiliateStatus = useCallback((id: string, status: AffiliateStatus) => {
    dispatch({ type: 'setStatus', id, status })
    patchAffiliate(id, { status }).catch(() => notify('No se pudo guardar el estado en el servidor.', 'warning'))
    if (status === 'Activo') crearAporteAlActivar(id)
  }, [notify, crearAporteAlActivar])

  const conceptAffiliate = useCallback((id: string, concepto: 'Positivo' | 'Negativo') => {
    dispatch({ type: 'conceptAffiliate', id, concepto })
    patchAffiliate(id, { conceptoFiscal: concepto }).catch(() => notify('No se pudo guardar el concepto en el servidor.', 'warning'))
    notify(`Concepto del Fiscal registrado: ${concepto}.`, concepto === 'Positivo' ? 'success' : 'warning')
  }, [notify])

  const approveAffiliate = useCallback((id: string, acta: string) => {
    const fecha = commNowLabel()
    dispatch({ type: 'approveAffiliate', id, acta, fecha })
    patchAffiliate(id, { status: 'Activo', aprobacionActa: acta, aprobacionFecha: fecha })
      .catch(() => notify('No se pudo guardar la aprobación en el servidor.', 'warning'))
    crearAporteAlActivar(id)
    notify('Afiliación aprobada por la Junta Directiva.', 'success')
  }, [notify, crearAporteAlActivar])

  const updateAffiliate = useCallback((id: string, changes: Partial<Affiliate>) => {
    dispatch({ type: 'updateAffiliate', id, changes })
    patchAffiliate(id, changes).catch(() => notify('No se pudieron guardar los cambios en el servidor.', 'warning'))
    notify('Datos del afiliado actualizados.', 'success')
  }, [notify])

  const addMovement = useCallback((input: NewMovementInput) => {
    const esEgreso = input.kind === 'Egreso'
    const nivel = esEgreso ? nivelGasto(input.amount, smmlvRef.current) : undefined
    // Gasto ≤ 1 SMMLV: Tesorería lo aprueba de una; el resto queda 'Por aprobar'.
    const status: MovementStatus = !esEgreso ? 'Confirmado' : nivel === 'tesoreria' ? 'Aprobado' : 'Por aprobar'
    const movement: Movement = {
      id: '',
      date: input.date || todayLabel(),
      concept: input.concept,
      category: input.category,
      kind: input.kind,
      amount: input.amount,
      status,
      nivel,
      firmas: esEgreso ? {} : undefined,
    }
    insertMovement(movement)
      .then((saved) => {
        dispatch({ type: 'addMovement', movement: saved })
        notify(
          !esEgreso
            ? `Ingreso registrado y confirmado: ${input.concept}.`
            : status === 'Aprobado'
              ? `Gasto registrado (≤ 1 SMMLV): pendiente de firmas.`
              : `Gasto registrado, queda por aprobar: ${input.concept}.`,
          'info',
        )
      })
      .catch(() => notify('No se pudo registrar el movimiento en el servidor.', 'warning'))
  }, [notify])

  const setMovementStatus = useCallback((id: string, status: MovementStatus) => {
    const target = movementsRef.current.find((m) => m.id === id)
    const asignaOP = status === 'Pagado' && target?.kind === 'Egreso' && !target?.ordenPago
    const op = asignaOP ? nextOrdenPago(movementsRef.current) : undefined
    dispatch({ type: 'setMovementStatus', id, status })
    patchMovement(id, { status, ...(op ? { ordenPago: op } : {}) }).catch(() => notify('No se pudo guardar el cambio en el servidor.', 'warning'))
  }, [notify])

  const signMovement = useCallback((id: string, who: FirmaKey) => {
    const target = movementsRef.current.find((m) => m.id === id)
    const firmas = { ...(target?.firmas ?? {}), [who]: true }
    dispatch({ type: 'signMovement', id, who })
    patchMovement(id, { firmas }).catch(() => notify('No se pudo guardar la firma en el servidor.', 'warning'))
    notify('Firma registrada en la orden de pago.', 'success')
  }, [notify])

  const setSmmlv = useCallback((value: number) => {
    dispatch({ type: 'setSmmlv', value })
    upsertParams({ smmlv: value }).catch(() => notify('No se pudo guardar el SMMLV en el servidor.', 'warning'))
    notify('SMMLV actualizado.', 'success')
  }, [notify])

  const updateMovement = useCallback((id: string, changes: Partial<Movement>) => {
    dispatch({ type: 'updateMovement', id, changes })
    patchMovement(id, changes).catch(() => notify('No se pudo guardar el movimiento en el servidor.', 'warning'))
    notify('Movimiento actualizado.', 'success')
  }, [notify])

  const deleteMovement = useCallback((id: string, concept: string) => {
    dispatch({ type: 'deleteMovement', id })
    deleteMovementRow(id).catch(() => notify('No se pudo eliminar en el servidor.', 'warning'))
    notify(`Movimiento eliminado: ${concept}.`, 'warning')
  }, [notify])

  // Registra una actuación en la bitácora (append-only) de un expediente.
  const logCaseEvent = useCallback((caseId: string, tipo: string, nota = '', soportePath?: string) => {
    insertCaseEvent({ caseId, tipo, fecha: caseTodayLabel(), actorRole: roleRef.current, nota, soportePath })
      .then((ev) => dispatch({ type: 'addCaseEvent', event: ev }))
      .catch(() => {})
  }, [])

  // Actuación registrada manualmente (con documento adjunto opcional).
  const addCaseEvent = useCallback((caseId: string, tipo: string, nota?: string, soportePath?: string) => {
    insertCaseEvent({ caseId, tipo, fecha: caseTodayLabel(), actorRole: roleRef.current, nota, soportePath })
      .then((ev) => { dispatch({ type: 'addCaseEvent', event: ev }); notify('Actuación registrada en la bitácora.', 'success') })
      .catch(() => notify('No se pudo registrar la actuación en el servidor.', 'warning'))
  }, [notify])

  const addCase = useCallback((input: NewCaseInput) => {
    const draft: DisciplineCase = {
      id: '',
      code: nextCaseCode(casesRef.current),
      subject: input.subject,
      person: input.person || 'Funcionario vinculado',
      openedDate: caseTodayLabel(),
      stageIndex: 0,
      daysLeft: input.daysLeft,
      status: 'En trámite',
    }
    insertCase(draft)
      .then((saved) => {
        dispatch({ type: 'addCase', case: saved })
        logCaseEvent(saved.id, 'Auto de apertura', input.subject)
        notify(`Expediente ${saved.code} abierto en etapa de Apertura.`, 'info')
      })
      .catch(() => notify('No se pudo abrir el expediente en el servidor.', 'warning'))
  }, [notify, logCaseEvent])

  const advanceCase = useCallback((id: string) => {
    const target = casesRef.current.find((c) => c.id === id)
    if (!target) return
    const stageIndex = Math.min(stages.length - 1, target.stageIndex + 1)
    dispatch({ type: 'advanceCase', id })
    patchCase(id, { stageIndex, daysLeft: termOf(stageIndex) }).catch(() => notify('No se pudo guardar el avance en el servidor.', 'warning'))
    logCaseEvent(id, stages[stageIndex])
  }, [notify, logCaseEvent])

  const ruleCase = useCallback((id: string, resultado: Sancion | 'Archivado', monto?: number) => {
    dispatch({ type: 'ruleCase', id, resultado, monto })
    const changes: Partial<DisciplineCase> = resultado === 'Archivado'
      ? { status: 'Archivado', sancion: undefined }
      : { status: 'Con fallo', sancion: resultado, multaMonto: resultado === 'Multa' ? monto : undefined }
    patchCase(id, changes).catch(() => notify('No se pudo guardar el fallo en el servidor.', 'warning'))
    logCaseEvent(id, resultado === 'Archivado' ? 'Archivo del expediente' : `Fallo: ${resultado}`, resultado === 'Multa' && monto ? `Multa por ${formatCop(monto)}` : '')
    // La multa ingresa al libro contable (Supabase) para cobro por nómina.
    if (resultado === 'Multa' && (monto ?? 0) > 0) {
      const target = casesRef.current.find((c) => c.id === id)
      const mov: Movement = {
        id: '', date: todayLabel(),
        concept: `Multa disciplinaria ${target?.code ?? ''} — ${target?.person ?? ''} (cobro por nómina)`,
        category: 'Ingresos varios', kind: 'Ingreso', amount: monto as number, status: 'Confirmado',
      }
      insertMovement(mov).then((saved) => dispatch({ type: 'addMovement', movement: saved })).catch(() => {})
    }
  }, [notify, logCaseEvent])

  const interponerRecurso = useCallback((id: string, tipo: RecursoTipo) => {
    dispatch({ type: 'interponerRecurso', id, tipo })
    patchCase(id, { recursoTipo: tipo, recursoEstado: 'Interpuesto', recursoResultado: undefined }).catch(() => notify('No se pudo guardar el recurso en el servidor.', 'warning'))
    logCaseEvent(id, `Recurso de ${tipo.toLowerCase()} interpuesto`)
    notify(`Recurso de ${tipo.toLowerCase()} interpuesto.`, 'info')
  }, [notify, logCaseEvent])

  const resolverRecurso = useCallback((id: string, resultado: RecursoResultado) => {
    dispatch({ type: 'resolverRecurso', id, resultado })
    const changes: Partial<DisciplineCase> = { recursoEstado: 'Resuelto', recursoResultado: resultado }
    if (resultado === 'Revoca') changes.sancion = 'Absuelto'
    patchCase(id, changes).catch(() => notify('No se pudo guardar la resolución en el servidor.', 'warning'))
    logCaseEvent(id, `Resolución de recurso: ${resultado === 'Revoca' ? 'revoca el fallo' : 'confirma el fallo'}`)
    notify(`Recurso resuelto: ${resultado === 'Revoca' ? 'revoca el fallo' : 'confirma el fallo'}.`, resultado === 'Revoca' ? 'success' : 'warning')
  }, [notify, logCaseEvent])

  const deleteCase = useCallback((id: string, code: string) => {
    dispatch({ type: 'deleteCase', id })
    deleteCaseRow(id).catch(() => notify('No se pudo eliminar en el servidor.', 'warning'))
    notify(`Expediente eliminado: ${code}.`, 'warning')
  }, [notify])

  const addSession = useCallback((input: NewSessionInput) => {
    const draft: GovSession = { ...input, id: '', status: 'Programada' }
    insertSession(draft)
      .then((saved) => { dispatch({ type: 'addSession', session: saved }); notify(`Sesión "${input.title}" agendada.`, 'info') })
      .catch(() => notify('No se pudo agendar la sesión en el servidor.', 'warning'))
  }, [notify])

  const publishMinutes = useCallback((id: string, minutes: string, asistentes?: number, quorum?: boolean) => {
    dispatch({ type: 'publishMinutes', id, minutes, asistentes, quorum })
    patchSession(id, { status: 'Realizada', minutes, asistentes, quorum }).catch(() => notify('No se pudo publicar el acta en el servidor.', 'warning'))
    notify('Acta registrada y publicada.', 'success')
  }, [notify])

  const deleteSession = useCallback((id: string, title: string) => {
    dispatch({ type: 'deleteSession', id })
    deleteSessionRow(id).catch(() => notify('No se pudo eliminar en el servidor.', 'warning'))
    notify(`Sesión eliminada: ${title}.`, 'warning')
  }, [notify])

  const addBallot = useCallback((input: NewBallotInput) => {
    insertBallot({ title: input.title, closesAt: input.closesAt, closesAtTs: input.closesAtTs, secreta: input.secreta })
      .then((saved) => { dispatch({ type: 'addBallot', ballot: saved }); notify(`Votación abierta: "${input.title}".`, 'info') })
      .catch(() => notify('No se pudo abrir la votación en el servidor.', 'warning'))
  }, [notify])

  // Voto atómico en Supabase (una vez por usuario). Optimista solo si se contó.
  const votar = useCallback((id: string, choice: VoteChoice) => {
    emitirVoto(id, choice)
      .then((contado) => {
        if (contado) {
          dispatch({ type: 'castVote', id, choice })
          dispatch({ type: 'addMyVote', id })
          notify('Tu voto quedó registrado.', 'success')
        } else {
          notify('Ya habías votado en esta consulta (o está cerrada).', 'info')
        }
      })
      .catch(() => notify('No se pudo registrar tu voto.', 'warning'))
  }, [notify])

  const castVote = useCallback((id: string, choice: VoteChoice) => { votar(id, choice) }, [votar])
  const castAffiliateVote = useCallback((id: string, choice: VoteChoice, _affiliateId?: string) => { votar(id, choice) }, [votar])

  const closeBallot = useCallback((id: string) => {
    const b = ballotsRef.current.find((x) => x.id === id)
    const outcome = (b?.favor ?? 0) > (b?.contra ?? 0) ? 'Aprobada' : 'Rechazada'
    dispatch({ type: 'closeBallot', id })
    patchBallot(id, { status: 'Cerrada', outcome }).catch(() => notify('No se pudo cerrar la votación en el servidor.', 'warning'))
  }, [notify])

  const deleteBallot = useCallback((id: string, title: string) => {
    dispatch({ type: 'deleteBallot', id })
    deleteBallotRow(id).catch(() => notify('No se pudo eliminar en el servidor.', 'warning'))
    notify(`Votación eliminada: ${title}.`, 'warning')
  }, [notify])

  const addDoc = useCallback((input: NewDocInput) => {
    const draft: Doc = {
      id: '',
      title: input.title,
      type: input.type,
      code: nextDocCode(docsRef.current, input.type),
      date: docTodayLabel(),
      fileName: input.fileName,
      fileSize: input.fileSize,
      storagePath: input.storagePath,
    }
    insertDoc(draft)
      .then((saved) => { dispatch({ type: 'addDoc', doc: saved }); notify(`Documento cargado: ${saved.code}.`, 'success') })
      .catch(() => notify('No se pudo registrar el documento en el servidor.', 'warning'))
  }, [notify])

  const updateDoc = useCallback((id: string, changes: Partial<Doc>) => {
    dispatch({ type: 'updateDoc', id, changes })
    patchDoc(id, changes).catch(() => notify('No se pudo guardar el documento en el servidor.', 'warning'))
    notify('Documento actualizado.', 'success')
  }, [notify])

  const deleteDoc = useCallback((id: string, code: string) => {
    dispatch({ type: 'deleteDoc', id })
    deleteDocRow(id).catch(() => notify('No se pudo eliminar en el servidor.', 'warning'))
    notify(`Documento eliminado: ${code}.`, 'warning')
  }, [notify])

  const sendComunicado = useCallback((input: NewComunicadoInput) => {
    const draft: Omit<Comunicado, 'id'> = {
      subject: input.subject,
      body: input.body,
      audience: input.audience,
      recipients: input.recipients,
      date: commNowLabel(),
      status: 'Entregado',
    }
    insertComunicado(draft)
      .then((saved) => { dispatch({ type: 'addComunicado', comunicado: saved }); notify(`Comunicado enviado a ${input.recipients} destinatario(s).`, 'success') })
      .catch(() => notify('No se pudo enviar el comunicado en el servidor.', 'warning'))
  }, [notify])

  const deleteComunicado = useCallback((id: string) => {
    dispatch({ type: 'deleteComunicado', id })
    deleteComunicadoRow(id).catch(() => notify('No se pudo eliminar en el servidor.', 'warning'))
    notify('Comunicado eliminado del historial.', 'warning')
  }, [notify])

  const addCommittee = useCallback((input: NewCommitteeInput) => {
    const draft: Committee = {
      id: '',
      name: input.name,
      lead: input.lead || 'Por designar',
      members: input.members,
      next: input.next || 'Por programar',
      activity: 'Comité recién creado',
      color: committeeColor(committeesRef.current.length),
    }
    insertCommittee(draft)
      .then((saved) => { dispatch({ type: 'addCommittee', committee: saved }); notify(`Comité "${input.name}" creado.`, 'success') })
      .catch(() => notify('No se pudo crear el comité en el servidor.', 'warning'))
  }, [notify])

  const updateCommittee = useCallback((id: string, input: NewCommitteeInput) => {
    const changes = { name: input.name, lead: input.lead || 'Por designar', members: input.members, next: input.next || 'Por programar' }
    dispatch({ type: 'updateCommittee', id, changes })
    patchCommittee(id, changes).catch(() => notify('No se pudo guardar el comité en el servidor.', 'warning'))
    notify(`Comité "${input.name}" actualizado.`, 'success')
  }, [notify])

  const deleteCommittee = useCallback((id: string, name: string) => {
    dispatch({ type: 'deleteCommittee', id })
    deleteCommitteeRow(id).catch(() => notify('No se pudo eliminar en el servidor.', 'warning'))
    notify(`Comité "${name}" eliminado.`, 'warning')
  }, [notify])

  const setCargos = useCallback((list: string[]) => {
    dispatch({ type: 'setCargos', list })
    replaceCargos(list).catch(() => notify('No se pudo guardar los cargos en el servidor.', 'warning'))
  }, [notify])
  const setDependencias = useCallback((list: string[]) => {
    dispatch({ type: 'setDependencias', list })
    replaceDependencias(list).catch(() => notify('No se pudo guardar las dependencias en el servidor.', 'warning'))
  }, [notify])
  const setVinculaciones = useCallback((list: VinculacionType[]) => {
    dispatch({ type: 'setVinculaciones', list })
    replaceVinculaciones(list).catch(() => notify('No se pudo guardar los tipos de vinculación en el servidor.', 'warning'))
  }, [notify])
  const setEscalas = useCallback((list: Escala[]) => {
    dispatch({ type: 'setEscalas', list })
    replaceEscalas(list).catch(() => notify('No se pudo guardar las escalas en el servidor.', 'warning'))
  }, [notify])

  const generateAportes = useCallback((period: string) => {
    // Un aporte pendiente por afiliado activo que aún no lo tenga en el periodo.
    const existing = new Set(aportesRef.current.filter((a) => a.period === period).map((a) => a.affiliateId))
    const nuevos: Aporte[] = affiliatesRef.current
      .filter((a) => a.status === 'Activo' && !existing.has(a.id))
      .map((a) => ({ id: '', affiliateId: a.id, period, amount: calcularCuota(a.asignacionBasica, porcentajeRef.current), tipo: 'Ordinaria', status: 'Pendiente' }))
    if (nuevos.length === 0) { notify('No hay afiliados activos sin aporte en el periodo.', 'info'); return }
    insertAportes(nuevos)
      .then((saved) => { dispatch({ type: 'setAportes', list: [...saved, ...aportesRef.current] }); notify('Corte de aportes generado para el periodo.', 'success') })
      .catch(() => notify('No se pudo generar el corte en el servidor.', 'warning'))
  }, [notify])

  const payAporte = useCallback((id: string, method: AporteMethod) => {
    const date = commNowLabel()
    const aporte = aportesRef.current.find((a) => a.id === id)
    dispatch({ type: 'payAporte', id, method, date })
    patchAporte(id, { status: 'Pagado', paidDate: date, method }).catch(() => notify('No se pudo guardar el pago en el servidor.', 'warning'))
    // El ingreso al libro contable lo registra Tesorería (Nómina); en el portal
    // el afiliado no tiene permiso de insertar movimientos (lo concilia Tesorería).
    if (method === 'Nómina' && aporte) {
      const affiliate = affiliatesRef.current.find((a) => a.id === aporte.affiliateId)
      const mov: Movement = {
        id: '', date,
        concept: `Aporte ${aporte.tipo === 'Extraordinaria' ? 'extraordinario' : 'ordinario'} ${periodLabel(aporte.period)} — ${affiliate?.name ?? 'Afiliado'}`,
        category: 'Recaudo', kind: 'Ingreso', amount: aporte.amount, status: 'Confirmado',
      }
      insertMovement(mov).then((saved) => dispatch({ type: 'addMovement', movement: saved })).catch(() => {})
    }
    notify(method === 'Portal' ? 'Pago de aporte registrado. ¡Gracias!' : 'Aporte marcado como pagado.', 'success')
  }, [notify])

  const decretarExtraordinaria = useCallback((period: string, pct: number, acta: string) => {
    const p = Math.min(TOPE_EXTRAORDINARIA, Math.max(0, pct))
    const yaCon = new Set(aportesRef.current.filter((a) => a.tipo === 'Extraordinaria' && a.period === period && a.acta === acta).map((a) => a.affiliateId))
    const nuevos: Aporte[] = affiliatesRef.current
      .filter((a) => a.status === 'Activo' && !yaCon.has(a.id))
      .map((a) => ({ id: '', affiliateId: a.id, period, amount: calcularCuota(a.asignacionBasica, p), tipo: 'Extraordinaria', acta, status: 'Pendiente' }))
    if (nuevos.length === 0) { notify('No hay afiliados activos para la cuota extraordinaria.', 'info'); return }
    insertAportes(nuevos)
      .then((saved) => { dispatch({ type: 'setAportes', list: [...saved, ...aportesRef.current] }); notify('Cuota extraordinaria decretada por la Asamblea.', 'success') })
      .catch(() => notify('No se pudo decretar la cuota extraordinaria en el servidor.', 'warning'))
  }, [notify])

  const anticiparAporte = useCallback((id: string) => {
    dispatch({ type: 'anticiparAporte', id })
    patchAporte(id, { anticipada: true }).catch(() => notify('No se pudo guardar en el servidor.', 'warning'))
    notify('Cuota marcada como descuento anticipado por vacaciones.', 'info')
  }, [notify])

  const setPorcentajeCuota = useCallback((value: number) => {
    dispatch({ type: 'setPorcentajeCuota', value })
    upsertParams({ porcentajeCuota: value }).catch(() => notify('No se pudo guardar la cuota en el servidor.', 'warning'))
    notify('Porcentaje de cuota actualizado.', 'success')
  }, [notify])

  const setPresupuesto = useCallback((category: string, anual: number) => {
    dispatch({ type: 'setPresupuesto', category, anual })
    upsertPresupuesto(category, Math.max(0, anual)).catch(() => notify('No se pudo guardar el presupuesto en el servidor.', 'warning'))
    notify('Presupuesto del rubro actualizado.', 'success')
  }, [notify])

  const deletePresupuesto = useCallback((category: string) => {
    dispatch({ type: 'deletePresupuesto', category })
    deletePresupuestoRow(category).catch(() => notify('No se pudo eliminar el rubro en el servidor.', 'warning'))
    notify('Rubro de presupuesto eliminado.', 'info')
  }, [notify])

  const setCuentas = useCallback((list: Cuenta[]) => {
    dispatch({ type: 'setCuentas', list })
    replaceCuentas(list).catch(() => notify('No se pudo guardar el catálogo en el servidor.', 'warning'))
  }, [notify])

  const aperturaCaja = useCallback((monto: number) => {
    dispatch({ type: 'aperturaCaja', monto })
    upsertParams({ cajaFondo: Math.max(0, monto) }).catch(() => {})
    clearCajaGastos().catch(() => {})
    notify('Fondo de caja menor actualizado.', 'success')
  }, [notify])

  const addCajaGasto = useCallback((concepto: string, monto: number, soporte: string) => {
    const gasto: CajaGasto = { id: '', date: commNowLabel(), concepto, monto, soporte }
    insertCajaGasto(gasto)
      .then((saved) => { dispatch({ type: 'addCajaGasto', gasto: saved }); notify('Gasto de caja menor registrado.', 'success') })
      .catch(() => notify('No se pudo registrar el gasto de caja en el servidor.', 'warning'))
  }, [notify])

  const reembolsoCaja = useCallback((total: number) => {
    const movement: Movement = {
      id: '',
      date: commNowLabel(),
      concept: 'Reembolso de caja menor (reposición del fondo)',
      category: 'Operación',
      kind: 'Egreso',
      amount: total,
      status: 'Pagado',
      firmas: { presidente: true, tesorero: true, fiscal: true },
      ordenPago: nextOrdenPago(movementsRef.current),
    }
    dispatch({ type: 'reembolsoCaja' })
    clearCajaGastos().catch(() => {})
    insertMovement(movement)
      .then((saved) => dispatch({ type: 'addMovement', movement: saved }))
      .catch(() => notify('No se pudo registrar el reembolso en el servidor.', 'warning'))
    notify('Caja menor reembolsada; fondo repuesto.', 'success')
  }, [notify])

  const setCaucion = useCallback((fecha: string) => {
    dispatch({ type: 'setCaucion', fecha })
    upsertParams({ caucionVence: fecha }).catch(() => notify('No se pudo guardar la caución en el servidor.', 'warning'))
    notify('Caución del Tesorero actualizada.', 'success')
  }, [notify])

  const setJuntaDesde = useCallback((fecha: string) => {
    dispatch({ type: 'setJuntaDesde', fecha })
    upsertParams({ juntaDesde: fecha }).catch(() => notify('No se pudo guardar el periodo en el servidor.', 'warning'))
    notify('Periodo de la Junta actualizado.', 'success')
  }, [notify])

  const resetDemo = useCallback(() => {
    dispatch({ type: 'reset' })
    notify('Demo reiniciada al estado inicial.', 'warning')
  }, [notify])

  const stats = useMemo<AffiliateStats>(() => {
    const active = state.affiliates.filter((a) => a.status === 'Activo')
    return {
      total: state.affiliates.length,
      active: active.length,
      pending: state.affiliates.filter((a) => a.status === 'Pendiente').length,
      suspended: state.affiliates.filter((a) => a.status === 'Suspendido').length,
      retired: state.affiliates.filter((a) => a.status === 'Retirado').length,
      distribution: state.vinculaciones.map((v) => ({
        name: v.name,
        value: active.filter((a) => a.type === v.name).length,
        color: v.color,
      })),
    }
  }, [state.affiliates, state.vinculaciones])

  const financeStats = useMemo<FinanceStats>(() => {
    const sum = (f: (m: Movement) => boolean) =>
      state.movements.filter(f).reduce((acc, m) => acc + m.amount, 0)
    const income = sum((m) => m.kind === 'Ingreso' && m.status === 'Confirmado')
    const expensesPaid = sum((m) => m.kind === 'Egreso' && m.status === 'Pagado')
    const pending = state.movements.filter((m) => m.kind === 'Egreso' && m.status === 'Por aprobar')
    return {
      income,
      expensesPaid,
      pendingAmount: pending.reduce((acc, m) => acc + m.amount, 0),
      pendingCount: pending.length,
      balance: income - expensesPaid,
    }
  }, [state.movements])

  const disciplineStats = useMemo<DisciplineStats>(() => {
    const active = state.cases.filter((c) => c.status === 'En trámite')
    return {
      active: active.length,
      nearDue: active.filter((c) => c.daysLeft <= 5).length,
    }
  }, [state.cases])

  const value = useMemo<DemoContextValue>(
    () => ({
      affiliates: state.affiliates,
      stats,
      addAffiliate,
      setAffiliateStatus,
      conceptAffiliate,
      approveAffiliate,
      updateAffiliate,
      movements: state.movements,
      financeStats,
      addMovement,
      setMovementStatus,
      updateMovement,
      deleteMovement,
      signMovement,
      smmlv: state.smmlv,
      setSmmlv,
      cases: state.cases,
      disciplineStats,
      addCase,
      advanceCase,
      ruleCase,
      interponerRecurso,
      resolverRecurso,
      deleteCase,
      caseEvents: state.caseEvents,
      addCaseEvent,
      sessions: state.sessions,
      ballots: state.ballots,
      myVotes: state.myVotes,
      addSession,
      publishMinutes,
      deleteSession,
      addBallot,
      castVote,
      castAffiliateVote,
      closeBallot,
      deleteBallot,
      docs: state.docs,
      addDoc,
      updateDoc,
      deleteDoc,
      comunicados: state.comunicados,
      sendComunicado,
      deleteComunicado,
      committees: state.committees,
      addCommittee,
      updateCommittee,
      deleteCommittee,
      cargos: state.cargos,
      dependencias: state.dependencias,
      vinculaciones: state.vinculaciones,
      setCargos,
      setDependencias,
      setVinculaciones,
      escalas: state.escalas,
      setEscalas,
      aportes: state.aportes,
      porcentajeCuota: state.porcentajeCuota,
      generateAportes,
      payAporte,
      decretarExtraordinaria,
      anticiparAporte,
      setPorcentajeCuota,
      presupuestos: state.presupuestos,
      setPresupuesto,
      deletePresupuesto,
      cuentas: state.cuentas,
      setCuentas,
      cajaFondo: state.cajaFondo,
      cajaGastos: state.cajaGastos,
      aperturaCaja,
      addCajaGasto,
      reembolsoCaja,
      caucionVence: state.caucionVence,
      setCaucion,
      juntaDesde: state.juntaDesde,
      setJuntaDesde,
      resetDemo,
      notify,
    }),
    [state.affiliates, stats, state.movements, financeStats, state.cases, disciplineStats, state.sessions, state.ballots, state.docs, state.comunicados, state.committees, state.cargos, state.dependencias, state.vinculaciones, addAffiliate, setAffiliateStatus, conceptAffiliate, approveAffiliate, updateAffiliate, addMovement, setMovementStatus, updateMovement, deleteMovement, signMovement, state.smmlv, setSmmlv, addCase, advanceCase, ruleCase, interponerRecurso, resolverRecurso, deleteCase, state.caseEvents, addCaseEvent, state.myVotes, addSession, publishMinutes, deleteSession, addBallot, castVote, castAffiliateVote, closeBallot, deleteBallot, addDoc, updateDoc, deleteDoc, sendComunicado, deleteComunicado, addCommittee, updateCommittee, deleteCommittee, setCargos, setDependencias, setVinculaciones, state.escalas, setEscalas, state.aportes, state.porcentajeCuota, generateAportes, payAporte, decretarExtraordinaria, anticiparAporte, setPorcentajeCuota, state.presupuestos, setPresupuesto, state.cuentas, setCuentas, state.cajaFondo, state.cajaGastos, aperturaCaja, addCajaGasto, reembolsoCaja, state.caucionVence, setCaucion, state.juntaDesde, setJuntaDesde, resetDemo, notify],
  )

  return (
    <DemoContext.Provider value={value}>
      {children}
      <ToastStack toasts={toasts} />
    </DemoContext.Provider>
  )
}

export function useDemo(): DemoContextValue {
  const ctx = useContext(DemoContext)
  if (!ctx) throw new Error('useDemo debe usarse dentro de <DemoProvider>')
  return ctx
}

const toastStyles: Record<Toast['tone'], string> = {
  success: 'border-emerald-600/20 bg-emerald-50 text-emerald-800',
  info: 'border-night/15 bg-white text-night',
  warning: 'border-amber-500/25 bg-amber-50 text-amber-800',
}

function ToastStack({ toasts }: { toasts: Toast[] }) {
  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-[60] flex w-[min(92vw,360px)] flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="status"
          className={`pointer-events-auto rounded-xl border px-4 py-3 text-sm font-medium shadow-lg shadow-night/10 ${toastStyles[toast.tone]}`}
        >
          {toast.message}
        </div>
      ))}
    </div>
  )
}
