// Modelo de datos y padrón simulado de afiliados.
// No hay backend: este archivo genera un padrón determinista que sirve como
// "base de datos" inicial de la demo. Al reiniciar la demo se vuelve a este estado.

export type AffiliateStatus = 'Pendiente' | 'Activo' | 'Suspendido' | 'Retirado'
// Tipo de vinculación: texto libre porque el catálogo se administra en Parámetros.
export type AffiliateType = string

export type Affiliate = {
  id: string
  name: string
  doc: string
  role: string
  dependency: string
  type: AffiliateType
  cargoTitular: string // cargo titular en el DNP (role = cargo que ocupa)
  asignacionBasica: number // asignación básica mensual (base de la cuota del 0,3%)
  email: string
  phone: string
  address: string // dirección de domicilio
  password: string // credencial del portal del afiliado (demo: texto plano, sin backend)
  beneficios: string[] // programas de bienestar e incentivos a los que está vinculado
  medio: string // por qué medio se enteró del sindicato
  motivo: string // por qué le gustaría pertenecer al sindicato
  interesComites: string // interés en participar en comités u observaciones
  solicitudNo: string // número de solicitud de afiliación
  conceptoFiscal?: 'Positivo' | 'Negativo' // concepto del Fiscal (Art. 25g)
  aprobacionActa?: string // acta de la Junta que aprobó (Art. 5d)
  aprobacionFecha?: string // fecha de aprobación
  joinDate: string
  status: AffiliateStatus
}

// Catálogos del formulario oficial de inscripción.
export const MEDIOS = ['La Rebeca', 'Un compañero', 'Correo', 'Otros']
export const BENEFICIOS = ['Teletrabajo', 'Horario flexible', 'Rutas', 'Gimnasio', 'Escuela deportiva', 'Apoyo educativo', 'Otros']

// Número de solicitud consecutivo del año en curso (ej. SOL-2026-004).
export function nextSolicitud(affiliates: Affiliate[]): string {
  const year = 2026
  const nums = affiliates
    .map((a) => /^SOL-(\d{4})-(\d+)$/.exec(a.solicitudNo || ''))
    .filter((m): m is RegExpExecArray => m !== null && Number(m[1]) === year)
    .map((m) => Number(m[2]))
  const next = (nums.length ? Math.max(...nums) : 0) + 1
  return `SOL-${year}-${String(next).padStart(3, '0')}`
}

const FIRST_NAMES = [
  'María Fernanda', 'Carlos Andrés', 'Diana Marcela', 'Jorge Iván', 'Ana Sofía',
  'Luis Alberto', 'Paula Andrea', 'Andrés Felipe', 'Laura Camila', 'Miguel Ángel',
  'Sofía', 'Julián David', 'Camila', 'Ricardo', 'Valentina', 'Óscar Mauricio',
  'Daniela', 'Fernando José', 'Natalia', 'Héctor', 'Lucía', 'Sergio', 'Ángela María',
  'Mateo', 'Isabella', 'Nicolás', 'Adriana', 'Gustavo', 'Carolina', 'Esteban',
]

const LAST_NAMES = [
  'Rojas', 'Pardo', 'Ortiz', 'Salcedo', 'Méndez', 'Gómez', 'Torres', 'Ramírez',
  'Castro', 'Núñez', 'Vargas', 'Moreno', 'Jiménez', 'Herrera', 'Guerrero', 'Cárdenas',
  'Ospina', 'Beltrán', 'Quintero', 'Rincón', 'Salazar', 'Peña', 'Acosta', 'Duarte',
  'Camargo', 'Forero', 'Mejía', 'Suárez', 'Villamil', 'Bautista',
]

// Catálogos usados tanto por el generador de ejemplo como por el formulario de
// alta de afiliados (selectores).
export const ROLES = [
  'Profesional especializado', 'Asesor', 'Profesional universitario', 'Gestor',
  'Técnico administrativo', 'Auxiliar administrativo', 'Director técnico',
  'Coordinador de grupo', 'Analista', 'Contratista de apoyo',
]

export const DEPENDENCIES = [
  'Dirección General', 'Subdirección Territorial', 'Dirección de Inversiones',
  'Oficina de Planeación', 'Dirección de Desarrollo Social', 'Secretaría General',
  'Oficina Jurídica', 'Dirección de Regalías', 'Oficina de Tecnología',
  'Dirección de Seguimiento y Evaluación',
]

// Reparte un índice de forma determinista sobre un arreglo.
function pick<T>(list: T[], i: number, salt = 1): T {
  return list[(i * salt) % list.length]
}

function buildName(i: number): string {
  const first = pick(FIRST_NAMES, i, 7)
  const last1 = pick(LAST_NAMES, i, 3)
  const last2 = pick(LAST_NAMES, i + 5, 11)
  return `${first} ${last1} ${last2}`
}

function buildDoc(i: number): string {
  const base = 20_000_000 + ((i * 733_337) % 79_000_000)
  return new Intl.NumberFormat('es-CO').format(base)
}

function buildEmail(name: string): string {
  const clean = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[^a-z ]/g, '')
    .split(' ')
    .filter(Boolean)
  return `${clean[0]}.${clean[clean.length - 1]}@dnp.gov.co`
}

function buildPhone(i: number): string {
  const n = 3_000_000_000 + ((i * 987_659) % 199_999_999)
  const s = String(n)
  return `${s.slice(0, 3)} ${s.slice(3, 6)} ${s.slice(6)}`
}

function buildJoinDate(i: number): string {
  const year = 2016 + (i % 10)
  const month = String((i % 12) + 1).padStart(2, '0')
  const day = String((i % 27) + 1).padStart(2, '0')
  return `${day}/${month}/${year}`
}

function makeAffiliate(i: number, type: AffiliateType, status: AffiliateStatus): Affiliate {
  const name = buildName(i)
  return {
    id: `seed-${i}`,
    name,
    doc: buildDoc(i),
    role: pick(ROLES, i, 5),
    dependency: pick(DEPENDENCIES, i, 3),
    type,
    cargoTitular: pick(ROLES, i, 7),
    asignacionBasica: 3_500_000 + (i % 6) * 500_000,
    email: buildEmail(name),
    phone: buildPhone(i),
    address: 'Bogotá D.C.',
    password: 'afiliado123',
    beneficios: [],
    medio: MEDIOS[i % MEDIOS.length],
    motivo: '',
    interesComites: '',
    solicitudNo: `SOL-2026-${String(i + 1).padStart(3, '0')}`,
    joinDate: buildJoinDate(i),
    status,
  }
}

// Padrón inicial VACÍO para pruebas reales. Los generadores de arriba se
// conservan por si se quiere repoblar la demo; para hacerlo, reemplazar el
// cuerpo por la versión que crea los 312 afiliados (ver historial de git).
export function seedAffiliates(): Affiliate[] {
  return []
}

// Genera un padrón de ejemplo (124 LNR + 146 Carrera + 42 Provisional activos,
// más algunos en otros estados). Sin uso mientras se prueba con datos reales.
export function sampleAffiliates(): Affiliate[] {
  const list: Affiliate[] = []
  let i = 0

  const activeByType: Array<[AffiliateType, number]> = [
    ['LNR', 124],
    ['Carrera Administrativa', 146],
    ['Provisional', 42],
  ]
  for (const [type, count] of activeByType) {
    for (let n = 0; n < count; n++) list.push(makeAffiliate(i++, type, 'Activo'))
  }

  const extras: Array<[AffiliateType, AffiliateStatus]> = [
    ['Provisional', 'Suspendido'], ['LNR', 'Suspendido'], ['Carrera Administrativa', 'Suspendido'],
    ['Provisional', 'Suspendido'], ['LNR', 'Retirado'], ['Carrera Administrativa', 'Retirado'],
    ['Provisional', 'Retirado'], ['LNR', 'Retirado'], ['Carrera Administrativa', 'Pendiente'],
    ['LNR', 'Pendiente'],
  ]
  for (const [type, status] of extras) list.push(makeAffiliate(i++, type, status))

  return list
}
