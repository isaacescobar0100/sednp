// Función serverless (Vercel): envía una notificación push a los dispositivos
// suscritos del sindicato del que llama. Solo usuarios autenticados; lee las
// suscripciones con el token del que llama (RLS: la directiva ve las de su org).
//
// Variables de entorno en Vercel:
//   VAPID_PRIVATE_KEY  (obligatoria, SECRETA)
//   VAPID_PUBLIC_KEY   (opcional; por defecto la clave pública incluida abajo)
//   VAPID_SUBJECT      (opcional; por defecto mailto:contacto@serdnp.org.co)
import webpush from 'web-push'

const PUBLIC_DEFAULT = 'BFXJ0q6YKT9lOp8xoYS9PZljcSCRk1GQVOh68rj65dYsSrQe87Tu5WCKDYLvVvJiarXjn4MNpL9JQxIVsgJyrCI'

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Método no permitido' }); return }

  const privateKey = process.env.VAPID_PRIVATE_KEY
  const publicKey = process.env.VAPID_PUBLIC_KEY || PUBLIC_DEFAULT
  if (!privateKey) { res.status(500).json({ error: 'Falta VAPID_PRIVATE_KEY en el servidor.' }); return }

  const supaUrl = process.env.VITE_SUPABASE_URL
  const supaKey = process.env.VITE_SUPABASE_ANON_KEY
  const authHeader = req.headers.authorization || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
  if (!token || !supaUrl || !supaKey) { res.status(401).json({ error: 'No autorizado' }); return }

  // Validar sesión.
  try {
    const u = await fetch(`${supaUrl}/auth/v1/user`, { headers: { apikey: supaKey, Authorization: `Bearer ${token}` } })
    if (!u.ok) { res.status(401).json({ error: 'Sesión inválida' }); return }
  } catch { res.status(401).json({ error: 'No se pudo validar la sesión' }); return }

  let body = req.body
  if (typeof body === 'string') { try { body = JSON.parse(body) } catch { body = {} } }
  body = body || {}
  const title = String(body.title || 'SERDNP').slice(0, 120)
  const mensaje = String(body.body || '').slice(0, 300)
  const url = String(body.url || '/?app=1')

  // Leer las suscripciones que el que llama puede ver (RLS: la directiva ve las de su org).
  let subs = []
  try {
    const r = await fetch(`${supaUrl}/rest/v1/push_subscriptions?select=endpoint,p256dh,auth`, {
      headers: { apikey: supaKey, Authorization: `Bearer ${token}` },
    })
    subs = await r.json().catch(() => [])
    if (!Array.isArray(subs)) subs = []
  } catch { subs = [] }

  if (subs.length === 0) { res.status(200).json({ ok: true, sent: 0, total: 0 }); return }

  webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:contacto@serdnp.org.co', publicKey, privateKey)
  const payload = JSON.stringify({ title, body: mensaje, url })

  let sent = 0
  let failed = 0
  for (let i = 0; i < subs.length; i += 50) {
    const chunk = subs.slice(i, i + 50)
    const results = await Promise.allSettled(chunk.map((s) =>
      webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload),
    ))
    results.forEach((r) => (r.status === 'fulfilled' ? (sent += 1) : (failed += 1)))
  }

  res.status(200).json({ ok: true, sent, failed, total: subs.length })
}
