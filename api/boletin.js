// Función serverless (Vercel): envía un boletín por correo a una lista de
// destinatarios usando Resend. Solo para usuarios autenticados (directiva).
// Body: { recipients: string[], subject: string, html: string }
//
// Nota: con Resend en modo prueba (sin dominio verificado) solo llegan los
// correos al dueño de la cuenta; el resto se cuenta como "no enviado".

// Compone el remitente "Nombre <direccion>": el nombre lo pone el sindicato de
// la sesión (fromName); la dirección es la propia del sindicato (fromEmail) si
// tiene dominio verificado, o la global de EMAIL_FROM. Resend rechaza dominios
// no verificados, así que no permite suplantar dominios ajenos.
const EMAIL_RE = /^[^@\s<>"]+@[^@\s<>"]+\.[^@\s<>"]+$/
function componerFrom(base, fromName, fromEmail) {
  const def = base || 'SERDNP <onboarding@resend.dev>'
  const m = def.match(/<([^>]+)>/)
  const propia = String(fromEmail || '').trim().toLowerCase()
  const address = (EMAIL_RE.test(propia) ? propia : (m ? m[1] : def)).trim()
  const name = String(fromName || '').replace(/["<>\r\n]/g, '').trim()
  return name ? `${name} <${address}>` : `${address}`
}

// Deriva texto plano del HTML (mejora entrega a Principal y notificaciones).
function htmlAtexto(html) {
  return String(html || '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<(br|\/p|\/div|\/h[1-6]|\/tr)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'").replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, '\n\n').replace(/[ \t]{2,}/g, ' ').trim()
}

// Envía un LOTE (hasta 100) en UNA sola petición al endpoint batch de Resend.
// Evita el límite de ~2/seg que rechazaba envíos cuando se mandaban en paralelo.
async function enviarLote(apiKey, emails) {
  try {
    const r = await fetch('https://api.resend.com/emails/batch', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(emails),
    })
    const data = await r.json().catch(() => ({}))
    if (!r.ok) return { sent: 0, error: (data && data.message) || `Error ${r.status}` }
    const n = Array.isArray(data && data.data) ? data.data.length : emails.length
    return { sent: n }
  } catch {
    return { sent: 0, error: 'No se pudo contactar el servicio de correo' }
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Método no permitido' }); return }

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) { res.status(500).json({ error: 'Falta RESEND_API_KEY en el servidor.' }); return }

  // Validar sesión de Supabase del que llama.
  const authHeader = req.headers.authorization || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
  const supaUrl = process.env.VITE_SUPABASE_URL
  const supaKey = process.env.VITE_SUPABASE_ANON_KEY
  if (!token || !supaUrl || !supaKey) { res.status(401).json({ error: 'No autorizado' }); return }
  try {
    const u = await fetch(`${supaUrl}/auth/v1/user`, { headers: { apikey: supaKey, Authorization: `Bearer ${token}` } })
    if (!u.ok) { res.status(401).json({ error: 'Sesión inválida' }); return }
  } catch { res.status(401).json({ error: 'No se pudo validar la sesión' }); return }

  let body = req.body
  if (typeof body === 'string') { try { body = JSON.parse(body) } catch { body = {} } }
  body = body || {}
  const subject = String(body.subject || '').trim()
  const html = String(body.html || '')
  const recipients = Array.isArray(body.recipients) ? [...new Set(body.recipients.filter((e) => typeof e === 'string' && e.includes('@')))] : []
  if (!subject || !html || recipients.length === 0) { res.status(400).json({ error: 'Faltan datos: recipients, subject y html.' }); return }

  const from = componerFrom(process.env.EMAIL_FROM, body.fromName, body.fromEmail)
  const texto = htmlAtexto(html)
  let sent = 0
  let ultimoError = ''
  // Batch de hasta 100 por petición (evita el límite de tasa de Resend).
  for (let i = 0; i < recipients.length; i += 100) {
    const chunk = recipients.slice(i, i + 100)
    const emails = chunk.map((to) => ({ from, to: [to], subject, html, text: texto }))
    const r = await enviarLote(apiKey, emails)
    sent += r.sent
    if (r.error) ultimoError = r.error
  }
  const failed = recipients.length - sent

  res.status(200).json({ ok: true, sent, failed, total: recipients.length, error: ultimoError || undefined })
}
