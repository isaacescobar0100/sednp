// Service worker mínimo para que SIG-SERDNP sea instalable (PWA) y abra offline.
// Estrategia: network-first para lo propio (siempre datos frescos), con respaldo
// en caché si no hay conexión. NO cachea llamadas a Supabase/hCaptcha (otro origen),
// así los datos sensibles nunca quedan guardados en el dispositivo.
const CACHE = 'serdnp-v1'

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.add('/')))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))),
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  if (new URL(req.url).origin !== self.location.origin) return // solo mismo origen
  event.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone()
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {})
        return res
      })
      .catch(() => caches.match(req).then((r) => r || caches.match('/'))),
  )
})
