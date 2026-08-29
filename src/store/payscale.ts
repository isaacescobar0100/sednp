// Escalas salariales de empleados públicos (Decreto anual de la Función Pública).
// La cuota sindical se calcula sobre la ASIGNACIÓN BÁSICA; esta tabla permite
// autocompletar la asignación por nivel y grado, y actualizarla cada vigencia.

export type Escala = {
  id: string
  nivel: string
  grado: string
  asignacionBasica: number
}

// Niveles de empleo de la Rama Ejecutiva (Decreto 0312 de 2026, Art. 2).
export const NIVELES = ['Directivo', 'Asesor', 'Profesional', 'Técnico', 'Asistencial']

// Incremento salarial de la vigencia 2026 (7%). Se usa para el ajuste en bloque.
export const AJUSTE_ANUAL = 0.07

export function escalaLabel(e: Escala): string {
  return `${e.nivel} · Grado ${e.grado}`
}

// Ordena por nivel (según NIVELES) y luego por grado.
export function sortEscalas(list: Escala[]): Escala[] {
  return [...list].sort((a, b) => {
    const na = NIVELES.indexOf(a.nivel)
    const nb = NIVELES.indexOf(b.nivel)
    if (na !== nb) return na - nb
    return a.grado.localeCompare(b.grado, 'es', { numeric: true })
  })
}

// Catálogo inicial vacío: los valores oficiales se cargan en Parámetros.
export function seedEscalas(): Escala[] {
  return []
}
