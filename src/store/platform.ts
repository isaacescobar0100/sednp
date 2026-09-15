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

// ¿El host actual corresponde a ESTE sindicato? Sirve para impedir que una cuenta
// de otro sindicato "entre" por la puerta equivocada (aunque el RLS ya aísla los
// datos, esto evita la confusión y endurece el aislamiento por tenant).
//   - host de plataforma → siempre true (ahí manda el admin).
//   - dominio propio del sindicato que coincide con el host → true.
//   - subdominio <slug>.<base> cuya etiqueta = slug del sindicato → true.
//   - ?org=<slug> que coincide → true.
//   - host que NO es de tenant (vercel.app, localhost, dominio no configurado) → true (no se restringe).
export function hostPerteneceASindicato(slug: string | null, dominio: string | null): boolean {
  if (typeof window === 'undefined') return true
  if (esHostPlataforma()) return true
  const host = window.location.hostname.toLowerCase()
  const sl = (slug || '').toLowerCase()
  if (dominio && host === dominio.trim().toLowerCase()) return true
  const base = baseDominioTenants()
  if (base && host.endsWith('.' + base)) return host.split('.')[0] === sl
  const paramOrg = (new URLSearchParams(window.location.search).get('org') || '').toLowerCase()
  if (paramOrg) return paramOrg === sl
  // Host genérico (no ligado a un sindicato): no se restringe.
  return true
}

// URL propia de un sindicato (para redirigir a quien entró por el sitio equivocado).
export function urlDeSindicato(slug: string | null, dominio: string | null): string {
  if (dominio) return `https://${dominio}`
  const base = baseDominioTenants()
  if (base && slug) return `https://${slug}.${base}`
  return `${window.location.origin}/?org=${slug ?? ''}`
}
