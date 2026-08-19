import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from 'react'
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
import {
  CajaGasto,
  Cuenta,
  DEFAULT_SMMLV,
  FirmaKey,
  Movement,
  MovementKind,
  MovementStatus,
  Presupuesto,
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
  sessions: GovSession[]
  ballots: Ballot[]
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
    sessions: seedSessions(),
    ballots: seedBallots(),
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
    cuentas: seedCuentas(),
    cajaFondo: 0,
    cajaGastos: [],
    caucionVence: '',
    juntaDesde: '',
  }
}

type VoteChoice = 'favor' | 'contra' | 'abstencion'

type Action =
  | { type: 'add'; affiliate: Affiliate }
  | { type: 'setStatus'; id: string; status: AffiliateStatus }
  | { type: 'conceptAffiliate'; id: string; concepto: 'Positivo' | 'Negativo' }
  | { type: 'approveAffiliate'; id: string; acta: string; fecha: string }
  | { type: 'updateAffiliate'; id: string; changes: Partial<Affiliate> }
  | { type: 'addMovement'; movement: Movement }
  | { type: 'setMovementStatus'; id: string; status: MovementStatus }
  | { type: 'updateMovement'; id: string; changes: Partial<Movement> }
  | { type: 'deleteMovement'; id: string }
  | { type: 'signMovement'; id: string; who: FirmaKey }
  | { type: 'setSmmlv'; value: number }
  | { type: 'addCase'; case: DisciplineCase }
  | { type: 'advanceCase'; id: string }
  | { type: 'ruleCase'; id: string; resultado: Sancion | 'Archivado'; monto?: number }
  | { type: 'interponerRecurso'; id: string; tipo: RecursoTipo }
  | { type: 'resolverRecurso'; id: string; resultado: RecursoResultado }
  | { type: 'deleteCase'; id: string }
  | { type: 'addSession'; session: GovSession }
  | { type: 'publishMinutes'; id: string; minutes: string; asistentes?: number; quorum?: boolean }
  | { type: 'deleteSession'; id: string }
  | { type: 'addBallot'; ballot: Ballot }
  | { type: 'castVote'; id: string; choice: VoteChoice }
  | { type: 'castAffiliateVote'; id: string; choice: VoteChoice; affiliateId: string }
  | { type: 'closeBallot'; id: string }
  | { type: 'deleteBallot'; id: string }
  | { type: 'addDoc'; doc: Doc }
  | { type: 'updateDoc'; id: string; changes: Partial<Doc> }
  | { type: 'deleteDoc'; id: string }
  | { type: 'addComunicado'; comunicado: Comunicado }
  | { type: 'deleteComunicado'; id: string }
  | { type: 'addCommittee'; committee: Committee }
  | { type: 'updateCommittee'; id: string; changes: Partial<Committee> }
  | { type: 'deleteCommittee'; id: string }
  | { type: 'setCargos'; list: string[] }
  | { type: 'setDependencias'; list: string[] }
  | { type: 'setVinculaciones'; list: VinculacionType[] }
  | { type: 'generateAportes'; period: string }
  | { type: 'decretarExtraordinaria'; period: string; pct: number; acta: string }
  | { type: 'payAporte'; id: string; method: AporteMethod; date: string }
  | { type: 'anticiparAporte'; id: string }
  | { type: 'setPorcentajeCuota'; value: number }
  | { type: 'setPresupuesto'; category: string; anual: number }
  | { type: 'setCuentas'; list: Cuenta[] }
  | { type: 'aperturaCaja'; monto: number }
  | { type: 'addCajaGasto'; gasto: CajaGasto }
  | { type: 'reembolsoCaja'; movement: Movement }
  | { type: 'setCaucion'; fecha: string }
  | { type: 'setJuntaDesde'; fecha: string }
  | { type: 'reset' }

// Al activar un afiliado, si ya se generó el corte del mes se le crea su aporte
// pendiente para no quedar fuera del periodo.
function aporteAlActivar(state: DemoState, affiliates: Affiliate[], id: string): Aporte[] {
  const period = currentPeriod()
  const corteExists = state.aportes.some((a) => a.period === period)
  const yaTiene = state.aportes.some((a) => a.period === period && a.affiliateId === id)
  const target = affiliates.find((a) => a.id === id)
  if (corteExists && !yaTiene && target) {
    return [{ id: `apt-${period}-${id}`, affiliateId: id, period, amount: calcularCuota(target.asignacionBasica, state.porcentajeCuota), tipo: 'Ordinaria', status: 'Pendiente' }, ...state.aportes]
  }
  return state.aportes
}

function reducer(state: DemoState, action: Action): DemoState {
  switch (action.type) {
    case 'add':
      return { ...state, affiliates: [action.affiliate, ...state.affiliates] }
    case 'setStatus': {
      const affiliates = state.affiliates.map((a) => (a.id === action.id ? { ...a, status: action.status } : a))
      const aportes = action.status === 'Activo' ? aporteAlActivar(state, affiliates, action.id) : state.aportes
      return { ...state, affiliates, aportes }
    }
    case 'conceptAffiliate':
      return {
        ...state,
        affiliates: state.affiliates.map((a) => (a.id === action.id ? { ...a, conceptoFiscal: action.concepto } : a)),
      }
    case 'approveAffiliate': {
      // La Junta Directiva aprueba con acta (Art. 5d): queda Activo.
      const affiliates = state.affiliates.map((a) => (a.id === action.id ? { ...a, status: 'Activo' as AffiliateStatus, aprobacionActa: action.acta, aprobacionFecha: action.fecha } : a))
      return { ...state, affiliates, aportes: aporteAlActivar(state, affiliates, action.id) }
    }
    case 'updateAffiliate':
      return {
        ...state,
        affiliates: state.affiliates.map((a) => (a.id === action.id ? { ...a, ...action.changes } : a)),
      }
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
      const target = state.cases.find((c) => c.id === action.id)
      // Una multa (Art. 45) ingresa al libro contable como ingreso a cobrar por nómina.
      let movements = state.movements
      if (action.resultado === 'Multa' && (action.monto ?? 0) > 0 && target) {
        const mov: Movement = {
          id: `mov-multa-${target.id}`,
          date: todayLabel(),
          concept: `Multa disciplinaria ${target.code} — ${target.person} (cobro por nómina)`,
          category: 'Ingresos varios',
          kind: 'Ingreso',
          amount: action.monto as number,
          status: 'Confirmado',
        }
        movements = [mov, ...state.movements.filter((m) => m.id !== mov.id)]
      }
      return {
        ...state,
        movements,
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
    case 'addDoc':
      return { ...state, docs: [action.doc, ...state.docs] }
    case 'updateDoc':
      return {
        ...state,
        docs: state.docs.map((d) => (d.id === action.id ? { ...d, ...action.changes } : d)),
      }
    case 'deleteDoc':
      return { ...state, docs: state.docs.filter((d) => d.id !== action.id) }
    case 'addComunicado':
      return { ...state, comunicados: [action.comunicado, ...state.comunicados] }
    case 'deleteComunicado':
      return { ...state, comunicados: state.comunicados.filter((c) => c.id !== action.id) }
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
      const affiliate = state.affiliates.find((a) => a.id === aporte.affiliateId)
      // Al pagarse, el aporte entra al libro contable como ingreso confirmado.
      const movement: Movement = {
        id: `mov-apt-${aporte.id}`,
        date: action.date,
        concept: `Aporte ${aporte.tipo === 'Extraordinaria' ? 'extraordinario' : 'ordinario'} ${periodLabel(aporte.period)} — ${affiliate?.name ?? 'Afiliado'}`,
        category: 'Recaudo',
        kind: 'Ingreso',
        amount: aporte.amount,
        status: 'Confirmado',
      }
      return {
        ...state,
        aportes: state.aportes.map((a) => (a.id === action.id ? { ...a, status: 'Pagado', paidDate: action.date, method: action.method } : a)),
        movements: [movement, ...state.movements],
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
    case 'setCuentas':
      return { ...state, cuentas: action.list }
    case 'aperturaCaja':
      // Abrir/ajustar el fondo de caja menor (tope 1 SMMLV) y limpiar gastos.
      return { ...state, cajaFondo: Math.max(0, action.monto), cajaGastos: [] }
    case 'addCajaGasto':
      return { ...state, cajaGastos: [action.gasto, ...state.cajaGastos] }
    case 'reembolsoCaja':
      // El reembolso repone el fondo: sale de bancos y limpia los gastos.
      return { ...state, cajaGastos: [], movements: [action.movement, ...state.movements] }
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
        affiliates: Array.isArray(parsed.affiliates) ? parsed.affiliates : seeded.affiliates,
        movements: Array.isArray(parsed.movements) ? parsed.movements : seeded.movements,
        cases: Array.isArray(parsed.cases) ? parsed.cases : seeded.cases,
        sessions: Array.isArray(parsed.sessions) ? parsed.sessions : seeded.sessions,
        ballots: Array.isArray(parsed.ballots) ? parsed.ballots : seeded.ballots,
        docs: Array.isArray(parsed.docs) ? parsed.docs : seeded.docs,
        comunicados: Array.isArray(parsed.comunicados) ? parsed.comunicados : seeded.comunicados,
        // Normaliza comités guardados con el modelo anterior (members numérico → lista).
        committees: Array.isArray(parsed.committees)
          ? parsed.committees.map((c) => ({ ...c, members: Array.isArray(c.members) ? c.members : [] }))
          : seeded.committees,
        cargos: Array.isArray(parsed.cargos) ? parsed.cargos : seeded.cargos,
        dependencias: Array.isArray(parsed.dependencias) ? parsed.dependencias : seeded.dependencias,
        vinculaciones: Array.isArray(parsed.vinculaciones) ? parsed.vinculaciones : seeded.vinculaciones,
        aportes: Array.isArray(parsed.aportes) ? parsed.aportes : seeded.aportes,
        porcentajeCuota: typeof parsed.porcentajeCuota === 'number' ? parsed.porcentajeCuota : seeded.porcentajeCuota,
        smmlv: typeof parsed.smmlv === 'number' ? parsed.smmlv : seeded.smmlv,
        presupuestos: Array.isArray(parsed.presupuestos) ? parsed.presupuestos : seeded.presupuestos,
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
  secreta?: boolean
}

type NewDocInput = {
  title: string
  type: DocType
  fileName: string
  fileSize: number
  dataUrl?: string
}

type NewComunicadoInput = {
  subject: string
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
  sessions: GovSession[]
  ballots: Ballot[]
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
  aportes: Aporte[]
  porcentajeCuota: number
  generateAportes: (period: string) => void
  payAporte: (id: string, method: AporteMethod) => void
  decretarExtraordinaria: (period: string, pct: number, acta: string) => void
  anticiparAporte: (id: string) => void
  setPorcentajeCuota: (value: number) => void
  presupuestos: Presupuesto[]
  setPresupuesto: (category: string, anual: number) => void
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
    const affiliate: Affiliate = {
      ...input,
      id: `af-${Date.now()}`,
      solicitudNo: nextSolicitud(affiliatesRef.current),
      status: 'Pendiente',
    }
    dispatch({ type: 'add', affiliate })
    notify(`${input.name || 'Nuevo afiliado'} (${affiliate.solicitudNo}) quedó en revisión.`, 'info')
  }, [notify])

  const castAffiliateVote = useCallback((id: string, choice: VoteChoice, affiliateId: string) => {
    dispatch({ type: 'castAffiliateVote', id, choice, affiliateId })
    notify('Tu voto quedó registrado.', 'success')
  }, [notify])

  const setAffiliateStatus = useCallback((id: string, status: AffiliateStatus) => {
    dispatch({ type: 'setStatus', id, status })
  }, [])

  const conceptAffiliate = useCallback((id: string, concepto: 'Positivo' | 'Negativo') => {
    dispatch({ type: 'conceptAffiliate', id, concepto })
    notify(`Concepto del Fiscal registrado: ${concepto}.`, concepto === 'Positivo' ? 'success' : 'warning')
  }, [notify])

  const approveAffiliate = useCallback((id: string, acta: string) => {
    dispatch({ type: 'approveAffiliate', id, acta, fecha: commNowLabel() })
    notify('Afiliación aprobada por la Junta Directiva.', 'success')
  }, [notify])

  const updateAffiliate = useCallback((id: string, changes: Partial<Affiliate>) => {
    dispatch({ type: 'updateAffiliate', id, changes })
    notify('Datos del afiliado actualizados.', 'success')
  }, [notify])

  const addMovement = useCallback((input: NewMovementInput) => {
    const esEgreso = input.kind === 'Egreso'
    const nivel = esEgreso ? nivelGasto(input.amount, smmlvRef.current) : undefined
    // Gasto ≤ 1 SMMLV: Tesorería lo aprueba de una; el resto queda 'Por aprobar'.
    const status: MovementStatus = !esEgreso ? 'Confirmado' : nivel === 'tesoreria' ? 'Aprobado' : 'Por aprobar'
    const movement: Movement = {
      id: `mov-${Date.now()}`,
      date: input.date || todayLabel(),
      concept: input.concept,
      category: input.category,
      kind: input.kind,
      amount: input.amount,
      status,
      nivel,
      firmas: esEgreso ? {} : undefined,
    }
    dispatch({ type: 'addMovement', movement })
    notify(
      !esEgreso
        ? `Ingreso registrado y confirmado: ${input.concept}.`
        : status === 'Aprobado'
          ? `Gasto registrado (≤ 1 SMMLV): pendiente de firmas.`
          : `Gasto registrado, queda por aprobar: ${input.concept}.`,
      'info',
    )
  }, [notify])

  const setMovementStatus = useCallback((id: string, status: MovementStatus) => {
    dispatch({ type: 'setMovementStatus', id, status })
  }, [])

  const signMovement = useCallback((id: string, who: FirmaKey) => {
    dispatch({ type: 'signMovement', id, who })
    notify('Firma registrada en la orden de pago.', 'success')
  }, [notify])

  const setSmmlv = useCallback((value: number) => {
    dispatch({ type: 'setSmmlv', value })
    notify('SMMLV actualizado.', 'success')
  }, [notify])

  const updateMovement = useCallback((id: string, changes: Partial<Movement>) => {
    dispatch({ type: 'updateMovement', id, changes })
    notify('Movimiento actualizado.', 'success')
  }, [notify])

  const deleteMovement = useCallback((id: string, concept: string) => {
    dispatch({ type: 'deleteMovement', id })
    notify(`Movimiento eliminado: ${concept}.`, 'warning')
  }, [notify])

  const addCase = useCallback((input: NewCaseInput) => {
    const newCase: DisciplineCase = {
      id: `exp-${Date.now()}`,
      code: nextCaseCode(casesRef.current),
      subject: input.subject,
      person: input.person || 'Funcionario vinculado',
      openedDate: caseTodayLabel(),
      stageIndex: 0,
      daysLeft: input.daysLeft,
      status: 'En trámite',
    }
    dispatch({ type: 'addCase', case: newCase })
    notify(`Expediente ${newCase.code} abierto en etapa de Apertura.`, 'info')
  }, [notify])

  const advanceCase = useCallback((id: string) => {
    dispatch({ type: 'advanceCase', id })
  }, [])

  const ruleCase = useCallback((id: string, resultado: Sancion | 'Archivado', monto?: number) => {
    dispatch({ type: 'ruleCase', id, resultado, monto })
  }, [])

  const interponerRecurso = useCallback((id: string, tipo: RecursoTipo) => {
    dispatch({ type: 'interponerRecurso', id, tipo })
    notify(`Recurso de ${tipo.toLowerCase()} interpuesto.`, 'info')
  }, [notify])

  const resolverRecurso = useCallback((id: string, resultado: RecursoResultado) => {
    dispatch({ type: 'resolverRecurso', id, resultado })
    notify(`Recurso resuelto: ${resultado === 'Revoca' ? 'revoca el fallo' : 'confirma el fallo'}.`, resultado === 'Revoca' ? 'success' : 'warning')
  }, [notify])

  const deleteCase = useCallback((id: string, code: string) => {
    dispatch({ type: 'deleteCase', id })
    notify(`Expediente eliminado: ${code}.`, 'warning')
  }, [notify])

  const addSession = useCallback((input: NewSessionInput) => {
    const session: GovSession = { ...input, id: `ses-${Date.now()}`, status: 'Programada' }
    dispatch({ type: 'addSession', session })
    notify(`Sesión "${input.title}" agendada.`, 'info')
  }, [notify])

  const publishMinutes = useCallback((id: string, minutes: string, asistentes?: number, quorum?: boolean) => {
    dispatch({ type: 'publishMinutes', id, minutes, asistentes, quorum })
    notify('Acta registrada y publicada.', 'success')
  }, [notify])

  const deleteSession = useCallback((id: string, title: string) => {
    dispatch({ type: 'deleteSession', id })
    notify(`Sesión eliminada: ${title}.`, 'warning')
  }, [notify])

  const addBallot = useCallback((input: NewBallotInput) => {
    const ballot: Ballot = { id: `vot-${Date.now()}`, title: input.title, closesAt: input.closesAt, favor: 0, contra: 0, abstencion: 0, status: 'En curso', votedBy: [], secreta: input.secreta }
    dispatch({ type: 'addBallot', ballot })
    notify(`Votación abierta: "${input.title}".`, 'info')
  }, [notify])

  const castVote = useCallback((id: string, choice: VoteChoice) => {
    dispatch({ type: 'castVote', id, choice })
  }, [])

  const closeBallot = useCallback((id: string) => {
    dispatch({ type: 'closeBallot', id })
  }, [])

  const deleteBallot = useCallback((id: string, title: string) => {
    dispatch({ type: 'deleteBallot', id })
    notify(`Votación eliminada: ${title}.`, 'warning')
  }, [notify])

  const addDoc = useCallback((input: NewDocInput) => {
    const doc: Doc = {
      id: `doc-${Date.now()}`,
      title: input.title,
      type: input.type,
      code: nextDocCode(docsRef.current, input.type),
      date: docTodayLabel(),
      fileName: input.fileName,
      fileSize: input.fileSize,
      dataUrl: input.dataUrl,
    }
    dispatch({ type: 'addDoc', doc })
    notify(`Documento cargado: ${doc.code}.`, 'success')
  }, [notify])

  const updateDoc = useCallback((id: string, changes: Partial<Doc>) => {
    dispatch({ type: 'updateDoc', id, changes })
    notify('Documento actualizado.', 'success')
  }, [notify])

  const deleteDoc = useCallback((id: string, code: string) => {
    dispatch({ type: 'deleteDoc', id })
    notify(`Documento eliminado: ${code}.`, 'warning')
  }, [notify])

  const sendComunicado = useCallback((input: NewComunicadoInput) => {
    const comunicado: Comunicado = {
      id: `com-${Date.now()}`,
      subject: input.subject,
      audience: input.audience,
      recipients: input.recipients,
      date: commNowLabel(),
      status: 'Entregado',
    }
    dispatch({ type: 'addComunicado', comunicado })
    notify(`Comunicado enviado a ${input.recipients} destinatario(s).`, 'success')
  }, [notify])

  const deleteComunicado = useCallback((id: string) => {
    dispatch({ type: 'deleteComunicado', id })
    notify('Comunicado eliminado del historial.', 'warning')
  }, [notify])

  const addCommittee = useCallback((input: NewCommitteeInput) => {
    const committee: Committee = {
      id: `cmt-${Date.now()}`,
      name: input.name,
      lead: input.lead || 'Por designar',
      members: input.members,
      next: input.next || 'Por programar',
      activity: 'Comité recién creado',
      color: committeeColor(committeesRef.current.length),
    }
    dispatch({ type: 'addCommittee', committee })
    notify(`Comité "${input.name}" creado.`, 'success')
  }, [notify])

  const updateCommittee = useCallback((id: string, input: NewCommitteeInput) => {
    dispatch({ type: 'updateCommittee', id, changes: { name: input.name, lead: input.lead || 'Por designar', members: input.members, next: input.next || 'Por programar' } })
    notify(`Comité "${input.name}" actualizado.`, 'success')
  }, [notify])

  const deleteCommittee = useCallback((id: string, name: string) => {
    dispatch({ type: 'deleteCommittee', id })
    notify(`Comité "${name}" eliminado.`, 'warning')
  }, [notify])

  const setCargos = useCallback((list: string[]) => dispatch({ type: 'setCargos', list }), [])
  const setDependencias = useCallback((list: string[]) => dispatch({ type: 'setDependencias', list }), [])
  const setVinculaciones = useCallback((list: VinculacionType[]) => dispatch({ type: 'setVinculaciones', list }), [])

  const generateAportes = useCallback((period: string) => {
    dispatch({ type: 'generateAportes', period })
    notify('Corte de aportes generado para el periodo.', 'success')
  }, [notify])

  const payAporte = useCallback((id: string, method: AporteMethod) => {
    dispatch({ type: 'payAporte', id, method, date: commNowLabel() })
    notify(method === 'Portal' ? 'Pago de aporte registrado. ¡Gracias!' : 'Aporte marcado como pagado.', 'success')
  }, [notify])

  const decretarExtraordinaria = useCallback((period: string, pct: number, acta: string) => {
    dispatch({ type: 'decretarExtraordinaria', period, pct: Math.min(TOPE_EXTRAORDINARIA, pct), acta })
    notify('Cuota extraordinaria decretada por la Asamblea.', 'success')
  }, [notify])

  const anticiparAporte = useCallback((id: string) => {
    dispatch({ type: 'anticiparAporte', id })
    notify('Cuota marcada como descuento anticipado por vacaciones.', 'info')
  }, [notify])

  const setPorcentajeCuota = useCallback((value: number) => {
    dispatch({ type: 'setPorcentajeCuota', value })
    notify('Porcentaje de cuota actualizado.', 'success')
  }, [notify])

  const setPresupuesto = useCallback((category: string, anual: number) => {
    dispatch({ type: 'setPresupuesto', category, anual })
    notify('Presupuesto del rubro actualizado.', 'success')
  }, [notify])

  const setCuentas = useCallback((list: Cuenta[]) => {
    dispatch({ type: 'setCuentas', list })
  }, [])

  const aperturaCaja = useCallback((monto: number) => {
    dispatch({ type: 'aperturaCaja', monto })
    notify('Fondo de caja menor actualizado.', 'success')
  }, [notify])

  const addCajaGasto = useCallback((concepto: string, monto: number, soporte: string) => {
    const gasto: CajaGasto = { id: `caja-${Date.now()}`, date: commNowLabel(), concepto, monto, soporte }
    dispatch({ type: 'addCajaGasto', gasto })
    notify('Gasto de caja menor registrado.', 'success')
  }, [notify])

  const reembolsoCaja = useCallback((total: number) => {
    const movement: Movement = {
      id: `mov-reemb-${Date.now()}`,
      date: commNowLabel(),
      concept: 'Reembolso de caja menor (reposición del fondo)',
      category: 'Operación',
      kind: 'Egreso',
      amount: total,
      status: 'Pagado',
      ordenPago: nextOrdenPago(movementsRef.current),
    }
    dispatch({ type: 'reembolsoCaja', movement })
    notify('Caja menor reembolsada; fondo repuesto.', 'success')
  }, [notify])

  const setCaucion = useCallback((fecha: string) => {
    dispatch({ type: 'setCaucion', fecha })
    notify('Caución del Tesorero actualizada.', 'success')
  }, [notify])

  const setJuntaDesde = useCallback((fecha: string) => {
    dispatch({ type: 'setJuntaDesde', fecha })
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
      sessions: state.sessions,
      ballots: state.ballots,
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
      aportes: state.aportes,
      porcentajeCuota: state.porcentajeCuota,
      generateAportes,
      payAporte,
      decretarExtraordinaria,
      anticiparAporte,
      setPorcentajeCuota,
      presupuestos: state.presupuestos,
      setPresupuesto,
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
    [state.affiliates, stats, state.movements, financeStats, state.cases, disciplineStats, state.sessions, state.ballots, state.docs, state.comunicados, state.committees, state.cargos, state.dependencias, state.vinculaciones, addAffiliate, setAffiliateStatus, conceptAffiliate, approveAffiliate, updateAffiliate, addMovement, setMovementStatus, updateMovement, deleteMovement, signMovement, state.smmlv, setSmmlv, addCase, advanceCase, ruleCase, interponerRecurso, resolverRecurso, deleteCase, addSession, publishMinutes, deleteSession, addBallot, castVote, castAffiliateVote, closeBallot, deleteBallot, addDoc, updateDoc, deleteDoc, sendComunicado, deleteComunicado, addCommittee, updateCommittee, deleteCommittee, setCargos, setDependencias, setVinculaciones, state.aportes, state.porcentajeCuota, generateAportes, payAporte, decretarExtraordinaria, anticiparAporte, setPorcentajeCuota, state.presupuestos, setPresupuesto, state.cuentas, setCuentas, state.cajaFondo, state.cajaGastos, aperturaCaja, addCajaGasto, reembolsoCaja, state.caucionVence, setCaucion, state.juntaDesde, setJuntaDesde, resetDemo, notify],
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
