// Caché de marca del sindicato (nombre + logo) por dominio, en localStorage.
//
// Objetivo: evitar el "parpadeo" del logo al recargar. El logo del sindicato se
// pide al servidor (tarda un instante) y mientras tanto se mostraba el de Sindika.
// Guardando la última marca conocida, la mostramos al instante en la siguiente
// carga y solo se actualiza si cambió.
export type Marca = { nombre: string; logo: string }

function clave(): string {
  return `tenantBrand:${typeof window !== 'undefined' ? window.location.hostname : ''}`
}

// Última marca conocida para este dominio (o null si no hay).
export function marcaCacheada(): Marca | null {
  try {
    const raw = localStorage.getItem(clave())
    if (!raw) return null
    const b = JSON.parse(raw) as Marca
    if (b && typeof b.nombre === 'string' && typeof b.logo === 'string') return b
  } catch { /* sin storage / json inválido */ }
  return null
}

// Logo cacheado (o el de Sindika por defecto), para usar como respaldo inmediato.
export function logoCacheado(fallback = '/sindika.png'): string {
  return marcaCacheada()?.logo || fallback
}

// Guarda la marca actual (se llama al resolver el sindicato).
export function guardarMarca(nombre?: string | null, logo?: string | null): void {
  try {
    localStorage.setItem(clave(), JSON.stringify({ nombre: (nombre || '').trim(), logo: (logo || '').trim() }))
  } catch { /* sin storage */ }
}

// Borra la marca cacheada de este dominio (p. ej. en el host de plataforma, para
// que la pestaña no muestre un sindicato).
export function limpiarMarca(): void {
  try { localStorage.removeItem(clave()) } catch { /* sin storage */ }
}
