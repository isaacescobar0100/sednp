// Límite de peticiones (rate limit) por IP, en memoria del proceso.
// Es "best-effort": cada instancia serverless tiene su propio contador, así que
// no es un límite global exacto, pero SÍ frena ráfagas de un mismo origen (que
// es el abuso más común). Cero infraestructura extra.

const hits = new Map() // clave -> lista de timestamps (ms)

// Devuelve true si la clave superó `max` peticiones en `windowMs`.
export function rateLimited(key, max, windowMs) {
  const now = Date.now()
  const arr = (hits.get(key) || []).filter((t) => now - t < windowMs)
  if (arr.length >= max) { hits.set(key, arr); return true }
  arr.push(now)
  hits.set(key, arr)
  if (hits.size > 5000) hits.clear() // limpieza para no crecer sin límite
  return false
}

// IP del cliente detrás del proxy de Vercel.
export function clientIp(req) {
  const xff = req.headers['x-forwarded-for'] || ''
  return String(xff).split(',')[0].trim() || (req.socket && req.socket.remoteAddress) || 'unknown'
}
