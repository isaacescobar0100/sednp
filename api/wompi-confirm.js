// Función serverless: verifica con Wompi el estado real de una transacción y,
// si quedó APROBADA, marca el aporte como pagado. Nunca confiamos en el navegador:
// consultamos directo a la API de Wompi (sandbox o producción según la llave).
import { rateLimited, clientIp } from './_rateLimit.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Método no permitido' }); return }
  if (rateLimited(`wompi-cf:${clientIp(req)}`, 60, 60_000)) { res.status(429).json({ error: 'Demasiadas solicitudes.' }); return }

  const supaUrl = process.env.VITE_SUPABASE_URL
  const anon = process.env.VITE_SUPABASE_ANON_KEY
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supaUrl || !anon || !service) { res.status(500).json({ error: 'Servidor sin configurar.' }); return }

  const token = (req.headers.authorization || '').startsWith('Bearer ') ? req.headers.authorization.slice(7) : ''
  if (!token) { res.status(401).json({ error: 'No autorizado' }); return }
  try {
    const u = await fetch(`${supaUrl}/auth/v1/user`, { headers: { apikey: anon, Authorization: `Bearer ${token}` } })
    if (!u.ok) { res.status(401).json({ error: 'Sesión inválida' }); return }
  } catch { res.status(401).json({ error: 'No se pudo validar la sesión' }); return }

  let body = req.body
  if (typeof body === 'string') { try { body = JSON.parse(body) } catch { body = {} } }
  const transactionId = String((body && body.transactionId) || '').trim()
  if (!transactionId) { res.status(400).json({ error: 'Falta transactionId' }); return }

  const sH = { apikey: service, Authorization: `Bearer ${service}`, 'Content-Type': 'application/json' }
  try {
    // 1) Consultar la transacción en Wompi. El host (sandbox/producción) se decide
    //    por el prefijo de la llave del sindicato dueño de la referencia.
    //    La referencia viene como SNK-<aporteId>, así ubicamos el aporte y su org.
    // Primero preguntamos a producción y, si no existe, a sandbox — Wompi no
    // permite cruzar ambientes, así que probamos ambos de forma segura.
    let tx = null
    let txEnv = ''
    for (const [env, host] of [['prod', 'https://production.wompi.co'], ['sandbox', 'https://sandbox.wompi.co']]) {
      try {
        const r = await fetch(`${host}/v1/transactions/${encodeURIComponent(transactionId)}`)
        if (r.ok) { const j = await r.json(); if (j && j.data) { tx = j.data; txEnv = env; break } }
      } catch { /* probar el siguiente ambiente */ }
    }
    if (!tx) { res.status(404).json({ error: 'Transacción no encontrada en Wompi.' }); return }

    const reference = String(tx.reference || '')
    const status = String(tx.status || '')
    const m = reference.match(/^SNK-(.+)$/)
    if (!m) { res.status(400).json({ error: 'Referencia no reconocida.' }); return }
    const aporteId = m[1]
    // Debe ser un UUID: evita inyección PostgREST vía referencia manipulada.
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(aporteId)) {
      res.status(400).json({ error: 'Referencia inválida.' }); return
    }

    // 2) Traer el aporte (con su org) y validar monto/estado/ambiente/moneda.
    const ar = await fetch(`${supaUrl}/rest/v1/aportes?id=eq.${aporteId}&select=id,amount,status,org_id`, { headers: sH })
    const aporte = (await ar.json())[0]
    if (!aporte) { res.status(404).json({ error: 'Aporte no encontrado.' }); return }

    // La transacción debe ser del MISMO ambiente que la llave del sindicato
    // (una llave pub_test_ es sandbox; cualquier otra, producción). Evita marcar
    // pagado con una transacción de un comercio/ambiente ajeno.
    const orr = await fetch(`${supaUrl}/rest/v1/organizations?id=eq.${encodeURIComponent(aporte.org_id)}&select=wompi_public_key`, { headers: sH })
    const orgRow = (await orr.json())[0]
    const esSandbox = String(orgRow?.wompi_public_key || '').startsWith('pub_test_')
    if ((esSandbox ? 'sandbox' : 'prod') !== txEnv) {
      res.status(409).json({ error: 'La transacción no corresponde a la pasarela del sindicato.' }); return
    }
    if (String(tx.currency || '') !== 'COP') {
      res.status(409).json({ error: 'Moneda inválida.' }); return
    }

    if (status !== 'APPROVED') {
      res.status(200).json({ paid: false, status }); return
    }
    // Verificar que el monto pagado coincide (en centavos), para no aceptar menos.
    const esperado = Math.round(Number(aporte.amount) * 100)
    if (Number(tx.amount_in_cents) !== esperado) {
      res.status(409).json({ error: 'El monto pagado no coincide.' }); return
    }
    if (aporte.status === 'Pagado') { res.status(200).json({ paid: true, status }); return }

    // 3) Marcar pagado (idempotente: solo si sigue Pendiente).
    const up = await fetch(`${supaUrl}/rest/v1/aportes?id=eq.${aporteId}&status=eq.Pendiente`, {
      method: 'PATCH',
      headers: { ...sH, Prefer: 'return=minimal' },
      body: JSON.stringify({ status: 'Pagado', paid_date: new Date().toISOString().slice(0, 10), method: 'Portal', wompi_ref: transactionId }),
    })
    if (!up.ok) { res.status(502).json({ error: 'No se pudo registrar el pago.' }); return }

    res.status(200).json({ paid: true, status })
  } catch (e) {
    res.status(502).json({ error: 'No se pudo verificar el pago.' })
  }
}
