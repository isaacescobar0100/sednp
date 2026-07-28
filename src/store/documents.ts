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
  dataUrl?: string // contenido del archivo (solo archivos pequeños) para descarga real
}

// Tamaño máximo cuyo contenido se guarda para descarga real (1 MB). Por encima,
// solo se registra nombre y tamaño (para no llenar el almacenamiento del navegador).
export const MAX_STORED_FILE = 1_000_000

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

// Documentos de ejemplo (sin uso mientras se prueba con datos reales).
export function sampleDocs(): Doc[] {
  return [
    { id: 'doc-seed-0', title: 'Acta Asamblea General Ordinaria 2026', type: 'Acta', code: 'ACT-AGO-2026-01', date: '12 abr 2026', fileName: 'acta-asamblea-2026.pdf', fileSize: 245_760 },
    { id: 'doc-seed-1', title: 'Resolución 004 — Plan anual de bienestar', type: 'Resolución', code: 'RES-004-2026', date: '28 mar 2026', fileName: 'resolucion-004.pdf', fileSize: 102_400 },
    { id: 'doc-seed-2', title: 'Informe financiero primer trimestre', type: 'Informe', code: 'INF-FIN-2026-01', date: '15 abr 2026', fileName: 'informe-financiero-t1.pdf', fileSize: 358_400 },
    { id: 'doc-seed-3', title: 'Reglamento interno de trabajo sindical', type: 'Reglamento', code: 'REG-INT-2026', date: '03 feb 2026', fileName: 'reglamento-interno.pdf', fileSize: 512_000 },
  ]
}
