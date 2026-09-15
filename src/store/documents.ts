// Modelo y datos simulados del módulo Documental (repositorio institucional).

export type DocType = 'Acta' | 'Resolución' | 'Acuerdo' | 'Reglamento' | 'Informe' | 'Boletín' | 'Estatuto'

export const docTypes: DocType[] = ['Acta', 'Resolución', 'Acuerdo', 'Reglamento', 'Informe', 'Boletín', 'Estatuto']

export type Doc = {
  id: string
  title: string
  type: DocType
  code: string
  date: string
  fileName: string
  fileSize: number // bytes
  storagePath?: string // ruta del archivo real en Supabase Storage
}

// Tamaño máximo de archivo a subir (25 MB).
export const MAX_STORED_FILE = 25_000_000

export function formatFileSize(bytes: number): string {
  if (!bytes || bytes <= 0) return '—'
  const kb = bytes / 1024
  return kb < 1024 ? `${Math.round(kb)} KB` : `${(kb / 1024).toFixed(1)} MB`
}

const typePrefix: Record<DocType, string> = {
  Acta: 'ACT',
  Resolución: 'RES',
  Acuerdo: 'ACU',
  Reglamento: 'REG',
  Informe: 'INF',
  Boletín: 'BOL',
  Estatuto: 'EST',
}

export function todayLabel(): string {
  return new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }).replace('.', '')
}

// Código consecutivo por tipo: ACT-2026-05, RES-2026-03, etc.
export function nextDocCode(docs: Doc[], type: DocType): string {
  const year = 2026
  const count = docs.filter((d) => d.type === type).length + 1
  return `${typePrefix[type]}-${year}-${String(count).padStart(2, '0')}`
}

// Repositorio VACÍO para pruebas reales.
export function seedDocs(): Doc[] {
  return []
}

