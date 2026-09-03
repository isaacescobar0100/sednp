// Service worker mínimo: mantiene la PWA instalable pero NO cachea la app,
// para evitar pantallas en blanco cuando se despliega una versión nueva.
// Siempre trae la versión fresca desde la red y limpia cachés viejas.
self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys()
    await Promise.all(keys.map((k) => caches.delete(k))) // borra cualquier caché anterior
    await self.clients.claim()
  })())
})

// Navegaciones: directo a la red (mensaje simple si no hay conexión). El resto usa
// la red por defecto. Sin caché de la app -> nunca sirve una versión desactualizada.
self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(
        () => new Response(
          '<!doctype html><meta charset="utf-8"><h1 style="font-family:sans-serif;text-align:center;margin-top:3rem">Sin conexión</h1>',
          { headers: { 'Content-Type': 'text/html; charset=utf-8' } },
        ),
      ),
    )
  }
})
