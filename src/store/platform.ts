// Detección de la ENTRADA DE PLATAFORMA (administración de Sindika), separada
// del login de los sindicatos. Se entra por:
//   - un host de plataforma (ej. sindika.acordemusic.com), configurable con
//     VITE_PLATFORM_HOSTS (lista separada por comas), o
//   - la ruta /admin en cualquier dominio (útil para probar y como acceso fijo).
const HOSTS = (((import.meta.env.VITE_PLATFORM_HOSTS as string | undefined) || 'sindika.acordemusic.com')
  .split(',').map((s) => s.trim().toLowerCase()).filter(Boolean))

export function esHostPlataforma(): boolean {
  if (typeof window === 'undefined') return false
  return HOSTS.includes(window.location.hostname.toLowerCase())
}

export function esEntradaAdmin(): boolean {
  if (typeof window === 'undefined') return false
  const p = window.location.pathname.toLowerCase()
  return esHostPlataforma() || p === '/admin' || p.startsWith('/admin/')
}

// Dominio base para los subdominios de los sindicatos. Se deriva del host de
// plataforma quitando su primera etiqueta: sindika.acordemusic.com → acordemusic.com.
// Así, un sindicato con slug X vive en X.acordemusic.com (comodín *.acordemusic.com).
// Devuelve null si el host de plataforma no es un subdominio (ej. localhost).
export function baseDominioTenants(): string | null {
  const h = HOSTS[0]
  if (!h) return null
  const partes = h.split('.')
  return partes.length >= 3 ? partes.slice(1).join('.') : null
}
