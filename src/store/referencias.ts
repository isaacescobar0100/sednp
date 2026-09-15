// Referencias normativas (citas de estatutos) CONFIGURABLES por sindicato.
// Cada sindicato define sus propios números de artículo en Parámetros; si deja
// una vacía, esa cita simplemente no se muestra (solo queda la regla).
//
// Patrón: un getter global (como marca() en emailApi) evita pasar el mapa por
// props a cada modal. Se fija al iniciar sesión con setReferencias(org.referencias).

export type Referencias = Record<string, string>

let refsActuales: Referencias = {}

export function setReferencias(r?: Referencias | null): void {
  refsActuales = r && typeof r === 'object' ? r : {}
}

// Devuelve " (Art. X)" para insertar al final de una frase, o "" si el
// sindicato no configuró esa referencia. Ej: `...no puede erogarse${cita('gasto_asamblea')}.`
export function cita(key: string): string {
  const v = (refsActuales[key] || '').trim()
  return v ? ` (${v})` : ''
}

// Catálogo de claves configurables: etiqueta para Parámetros, ejemplo (el valor
// de SERDNP) y módulo al que pertenece. El orden es el que se muestra en la UI.
export type RefKey = {
  key: string
  label: string       // qué regla es (lo que ve el admin del sindicato)
  ejemplo: string     // placeholder (valor de referencia de SERDNP)
  modulo: string      // agrupador visual
}

export const REF_KEYS: RefKey[] = [
  // Cuota y recaudo
  { key: 'cuota', label: 'Cuota sindical ordinaria (% de la asignación)', ejemplo: 'Art. 32', modulo: 'Cuota y recaudo' },
  { key: 'recaudo', label: 'Distribución del recaudo (nacional / seccionales)', ejemplo: 'Art. 32', modulo: 'Cuota y recaudo' },
  { key: 'vacaciones', label: 'Descuento anticipado por vacaciones', ejemplo: 'Parágrafo Art. 32', modulo: 'Cuota y recaudo' },
  { key: 'cuota_extra', label: 'Cuota extraordinaria (tope, aprobada por Asamblea)', ejemplo: 'Art. 33', modulo: 'Cuota y recaudo' },
  // Financiero / control de gasto
  { key: 'gasto_asamblea', label: 'Gasto que requiere autorización de la Asamblea (rangos SMMLV)', ejemplo: 'Art. 34', modulo: 'Financiero' },
  { key: 'firmas_pago', label: 'Firmas obligatorias en todo pago', ejemplo: 'Art. 35', modulo: 'Financiero' },
  { key: 'caucion', label: 'Caución / garantía del Tesorero', ejemplo: 'Art. 26', modulo: 'Financiero' },
  { key: 'caja_menor', label: 'Caja menor (tope y soporte obligatorio)', ejemplo: 'Art. 26e', modulo: 'Financiero' },
  // Gobernanza
  { key: 'junta', label: 'Junta Directiva: composición y periodo', ejemplo: 'Art. 13', modulo: 'Gobernanza' },
  { key: 'asamblea_delegados', label: 'Asamblea por delegados / quórum', ejemplo: 'Art. 9', modulo: 'Gobernanza' },
  { key: 'voto_secreto', label: 'Votación secreta', ejemplo: 'Art. 12b', modulo: 'Gobernanza' },
  // Comités
  { key: 'comite_tematico', label: 'Comités temáticos', ejemplo: 'Art. 27', modulo: 'Comités' },
  // Afiliación
  { key: 'afiliacion', label: 'Flujo de afiliación', ejemplo: 'Art. 5', modulo: 'Afiliación' },
  { key: 'afiliacion_aprobacion', label: 'Aprobación de la afiliación por acta', ejemplo: 'Art. 5d', modulo: 'Afiliación' },
  // Disciplinario
  { key: 'disc_fallo', label: 'Fallo de la Junta Directiva', ejemplo: 'Art. 45', modulo: 'Disciplinario' },
  { key: 'disc_multa', label: 'Multa disciplinaria', ejemplo: 'Art. 48', modulo: 'Disciplinario' },
  { key: 'disc_prescripcion', label: 'Prescripción de la acción disciplinaria', ejemplo: 'Art. 56', modulo: 'Disciplinario' },
  { key: 'disc_recursos', label: 'Recursos (reposición / apelación)', ejemplo: 'Art. 57', modulo: 'Disciplinario' },
]
