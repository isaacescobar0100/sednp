// Función serverless: genera el enlace de pago de Wompi para un aporte.
// La FIRMA (signature:integrity) se calcula AQUÍ con el secreto del sindicato,
// que nunca llega al navegador. Requiere SUPABASE_SERVICE_ROLE_KEY (ya existe).
import crypto from 'crypto'
import { rateLimited, clientIp } from './_rateLimit.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Método no permitido' }); return }
  if (rateLimited(`wompi-co:${clientIp(req)}`, 30, 60_000)) { res.status(429).json({ error: 'Demasiadas solicitudes.' }); return }

  const supaUrl = process.env.VITE_SUPABASE_URL
  const anon = process.env.VITE_SUPABASE_ANON_KEY
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supaUrl || !anon || !service) { res.status(500).json({ error: 'Servidor sin configurar.' }); return }

  // 1) Sesión válida (el afiliado paga desde su portal). Guardamos su uid.
  const token = (req.headers.authorization || '').startsWith('Bearer ') ? req.headers.authorization.slice(7) : ''
  if (!token) { res.status(401).json({ error: 'No autorizado' }); return }
  let uid = ''
  try {
    const u = await fetch(`${supaUrl}/auth/v1/user`, { headers: { apikey: anon, Authorization: `Bearer ${token}` } })
    if (!u.ok) { res.status(401).json({ error: 'Sesión inválida' }); return }
    uid = (await u.json())?.id || ''
  } catch { res.status(401).json({ error: 'No se pudo validar la sesión' }); return }
  if (!uid) { res.status(401).json({ error: 'Sesión inválida' }); return }

  let body = req.body
  if (typeof body === 'string') { try { body = JSON.parse(body) } catch { body = {} } }
  const aporteId = String((body && body.aporteId) || '').trim()
  // Debe ser un UUID válido: evita inyección en la consulta PostgREST y basura.
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(aporteId)) {
    res.status(400).json({ error: 'aporteId inválido' }); return
  }

  const sH = { apikey: service, Authorization: `Bearer ${service}`, 'Content-Type': 'application/json' }
  try {
    // 2) Aporte (monto + org + titular).
    const ar = await fetch(`${supaUrl}/rest/v1/aportes?id=eq.${aporteId}&select=id,amount,org_id,status,affiliate_id`, { headers: sH })
    const aporte = (await ar.json())[0]
    if (!aporte) { res.status(404).json({ error: 'Aporte no encontrado' }); return }
    if (aporte.status !== 'Pendiente') { res.status(409).json({ error: 'Este aporte ya está pagado.' }); return }

    // 2b) El aporte debe pertenecer al afiliado que pide el pago (no IDOR).
    const afr = await fetch(`${supaUrl}/rest/v1/affiliates?id=eq.${encodeURIComponent(aporte.affiliate_id)}&select=user_id`, { headers: sH })
    const afiliado = (await afr.json())[0]
    if (!afiliado || afiliado.user_id !== uid) { res.status(403).json({ error: 'No autorizado para este aporte.' }); return }

    // 3) Config Wompi del sindicato.
    const or = await fetch(`${supaUrl}/rest/v1/organizations?id=eq.${encodeURIComponent(aporte.org_id)}&select=wompi_public_key,wompi_integrity,dominio`, { headers: sH })
    const org = (await or.json())[0]
    if (!org || !org.wompi_public_key || !org.wompi_integrity) {
      res.status(400).json({ error: 'Este sindicato no tiene configurada la pasarela de pago.' }); return
    }

    // 4) Firma de integridad y enlace de checkout.
    const reference = `SNK-${aporteId}`
    const amountInCents = Math.round(Number(aporte.amount) * 100)
    const currency = 'COP'
    const firma = crypto.createHash('sha256').update(`${reference}${amountInCents}${currency}${org.wompi_integrity}`).digest('hex')

    // La redirección post-pago vuelve al host desde el que se llamó, PERO solo si
    // es un host conocido de la plataforma (evita redirección abierta por Host
    // manipulado). Si no, cae a un destino fijo seguro.
    const rawHost = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim().toLowerCase()
    const dominioOrg = String(org.dominio || '').trim().toLowerCase()
    const hostOk = /^[a-z0-9.-]+$/.test(rawHost) && (
      rawHost === 'acordemusic.com' || rawHost.endsWith('.acordemusic.com') ||
      rawHost.endsWith('.vercel.app') || (dominioOrg && rawHost === dominioOrg)
    )
    const base = hostOk ? `https://${rawHost}` : (process.env.PUBLIC_BASE_URL || 'https://sindika.acordemusic.com')
    const redirectUrl = `${base}/?wompi=1`

    const url = 'https://checkout.wompi.co/p/?' + new URLSearchParams({
      'public-key': org.wompi_public_key,
      currency,
      'amount-in-cents': String(amountInCents),
      reference,
      'signature:integrity': firma,
      'redirect-url': redirectUrl,
    }).toString()

    res.status(200).json({ checkoutUrl: url })
  } catch (e) {
    res.status(502).json({ error: 'No se pudo generar el pago.' })
  }
}
