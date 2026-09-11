// Función serverless (Vercel): envía correos con Resend.
//
// Variables de entorno en Vercel (Project Settings → Environment Variables):
//   RESEND_API_KEY   (obligatoria)  — clave de https://resend.com
//   EMAIL_FROM       (opcional)     — remitente; por defecto onboarding@resend.dev
//   VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY  — ya existen (las usa el front);
//     aquí sirven para validar que quien llama tiene sesión iniciada.
//
// Seguridad: solo responde a usuarios autenticados de Supabase (Bearer token).

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método no permitido' })
    return
  }

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    res.status(500).json({ error: 'Falta RESEND_API_KEY en el servidor.' })
    return
  }

  // 1) Validar sesión de Supabase del que llama (evita abuso anónimo).
  const authHeader = req.headers.authorization || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
  const supaUrl = process.env.VITE_SUPABASE_URL
  const supaKey = process.env.VITE_SUPABASE_ANON_KEY
  if (!token || !supaUrl || !supaKey) {
    res.status(401).json({ error: 'No autorizado' })
    return
  }
  try {
    const u = await fetch(`${supaUrl}/auth/v1/user`, {
      headers: { apikey: supaKey, Authorization: `Bearer ${token}` },
    })
    if (!u.ok) { res.status(401).json({ error: 'Sesión inválida' }); return }
  } catch {
    res.status(401).json({ error: 'No se pudo validar la sesión' })
    return
  }

  // 2) Leer el cuerpo.
  let body = req.body
  if (typeof body === 'string') { try { body = JSON.parse(body) } catch { body = {} } }
  body = body || {}
  const { to, subject, html, text } = body
  if (!to || !subject || (!html && !text)) {
    res.status(400).json({ error: 'Faltan campos: to, subject y html/text' })
    return
  }

  const from = process.env.EMAIL_FROM || 'SERDNP <onboarding@resend.dev>'

  // 3) Enviar con Resend.
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: Array.isArray(to) ? to : [to], subject, html, text }),
    })
    const data = await r.json().catch(() => ({}))
    if (!r.ok) {
      res.status(r.status).json({ error: (data && data.message) || 'Error al enviar el correo', detail: data })
      return
    }
    res.status(200).json({ ok: true, id: data && data.id })
  } catch {
    res.status(502).json({ error: 'No se pudo contactar el servicio de correo' })
  }
}
