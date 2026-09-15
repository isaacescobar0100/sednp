import * as Sentry from '@sentry/react'

// Monitoreo de errores en producción (Sentry). Se activa SOLO si existe la
// variable VITE_SENTRY_DSN (se configura en Vercel). Sin DSN no hace nada, así
// que en desarrollo o sin cuenta no molesta ni envía datos.
//
// Para activarlo: crea un proyecto gratis en sentry.io, copia el DSN y agrégalo
// como variable de entorno VITE_SENTRY_DSN en Vercel. Redeploy y listo.
export function initSentry(): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined
  if (!dsn) return
  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    tracesSampleRate: 0.1,   // muestreo bajo de rendimiento (no gastar cuota)
    sendDefaultPii: false,   // no capturar datos personales por defecto
  })
  // Expone el SDK para poder probar el envío desde la consola del navegador:
  //   Sentry.captureException(new Error("prueba"))
  // (Inofensivo: es un SDK de cliente; útil para diagnóstico.)
  ;(window as unknown as { Sentry?: typeof Sentry }).Sentry = Sentry
}
