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
