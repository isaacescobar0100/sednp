// Función serverless (Vercel CRON): revisa las suscripciones de todos los
// sindicatos una vez al día y:
//   1) AUTO-SUSPENDE los que llevan vencidos más de GRACE días (activo = false).
//   2) Envía a la administración un RESUMEN diario con los que están por vencer,
//      vencidos y los que se acaban de suspender.
//
// Variables de entorno en Vercel (Project Settings → Environment Variables):
//   CRON_SECRET                 (obligatoria) — cadena secreta. Vercel la envía
//                                sola en la cabecera Authorization de los CRON.
//   SUPABASE_SERVICE_ROLE_KEY   (obligatoria) — clave "service_role" de Supabase
//                                (Settings → API). Salta RLS para leer/actualizar
//                                todos los sindicatos. NO se expone al navegador.
//   VITE_SUPABASE_URL           (ya existe)
//   RESEND_API_KEY              (ya existe)
//   EMAIL_FROM                  (opcional) — remitente del resumen.
//   EMAIL_ADMIN                 (opcional) — a quién llega el resumen.
//                                Por defecto issac10.es@gmail.com.
//
// Programación: ver "crons" en vercel.json (diario 08:00 hora Colombia).

const GRACE = 10   // días de gracia tras el vencimiento antes de suspender
const AVISAR = 15  // días antes del vencimiento en que se empieza a avisar (resumen admin)
const CHECKPOINTS = [15, 7, 3, 1] // días antes en que se avisa AL PRESIDENTE (no diario)
const ADMIN_DEFAULT = 'issac10.es@gmail.com'

function diasHasta(fecha) {
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0)
  const f = new Date(fecha + 'T00:00:00')
  return Math.round((f.getTime() - hoy.getTime()) / 86400000)
}
const COP = (n) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(Number(n) || 0)
// Extrae solo la dirección de un remitente tipo "Nombre <correo@dominio>".
function direccionDe(from) {
  const m = String(from || '').match(/<([^>]+)>/)
  return m ? m[1] : String(from || '').trim()
}

export default async function handler(req, res) {
  // 1) Autorización: solo el CRON de Vercel (o quien tenga el secreto) puede correr esto.
  const secret = process.env.CRON_SECRET
  const auth = req.headers.authorization || ''
  const qsecret = (req.query && req.query.secret) || ''
  if (!secret) { res.status(500).json({ error: 'Falta CRON_SECRET en el servidor.' }); return }
  if (auth !== `Bearer ${secret}` && qsecret !== secret) { res.status(401).json({ error: 'No autorizado' }); return }

  const supaUrl = process.env.VITE_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supaUrl || !serviceKey) { res.status(500).json({ error: 'Falta VITE_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.' }); return }

  const sHeaders = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' }

  // 2) Leer todos los sindicatos con su suscripción.
  let orgs = []
  try {
    const r = await fetch(`${supaUrl}/rest/v1/organizations?select=id,nombre,activo,plan,precio_anual,fecha_proximo_pago&order=fecha_proximo_pago.asc`, { headers: sHeaders })
    orgs = await r.json()
    if (!r.ok) { res.status(502).json({ error: 'No se pudieron leer los sindicatos', detail: orgs }); return }
  } catch {
    res.status(502).json({ error: 'No se pudo contactar la base de datos' }); return
  }

  const suspendidos = []    // recién suspendidos en esta corrida
  const vencidos = []       // activos, vencidos pero dentro de gracia
  const porVencer = []      // activos, vencen dentro de AVISAR días
  const recordatorios = []  // orgs a las que hoy toca avisar AL PRESIDENTE

  for (const o of orgs) {
    if (!o.fecha_proximo_pago) continue
    const dias = diasHasta(o.fecha_proximo_pago)
    if (!o.activo) continue
    if (dias < -GRACE) {
      // Vencido más allá de la gracia → suspender.
      try {
        await fetch(`${supaUrl}/rest/v1/organizations?id=eq.${o.id}`, { method: 'PATCH', headers: sHeaders, body: JSON.stringify({ activo: false }) })
        suspendidos.push(o)
      } catch { /* si falla, aparecerá como vencido mañana */ }
    } else if (dias < 0) {
      vencidos.push({ ...o, dias })
    } else if (dias <= AVISAR) {
      porVencer.push({ ...o, dias })
      // Recordatorio al presidente solo en checkpoints (no todos los días).
      if (CHECKPOINTS.includes(dias)) recordatorios.push({ ...o, dias })
    }
  }

  // Enviar el recordatorio "por vencer" a cada PRESIDENTE (checkpoints).
  const apiKey0 = process.env.RESEND_API_KEY
  let avisadosPresidente = []
  if (recordatorios.length && apiKey0) {
    // Correo de presidencia por sindicato.
    let mapa = {}
    try {
      const r = await fetch(`${supaUrl}/rest/v1/rpc/correos_presidencia`, { method: 'POST', headers: sHeaders, body: '{}' })
      const filas = await r.json()
      if (Array.isArray(filas)) for (const f of filas) mapa[f.org_id] = f.email
    } catch { /* sin correos: no se envían recordatorios */ }
    // Remitente con marca Sindika sobre el dominio verificado (mejor entrega).
    const fromSindika = `Sindika <${direccionDe(process.env.EMAIL_FROM || 'onboarding@resend.dev')}>`
    for (const o of recordatorios) {
      const to = mapa[o.id]
      if (!to) continue
      const fechaLinda = new Date(o.fecha_proximo_pago + 'T00:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })
      const html = `<div style="max-width:560px;margin:0 auto;font-family:Arial,sans-serif;color:#0e1a34">
        <h2 style="color:#0b2461;margin:0 0 6px">Tu suscripción está por vencer</h2>
        <p style="color:#57678a;font-size:14px;line-height:1.6">Hola, te recordamos que la suscripción de <b>${o.nombre}</b> a la plataforma vence el <b>${fechaLinda}</b> (en ${o.dias} día${o.dias === 1 ? '' : 's'}).</p>
        <div style="border:1px solid #e2e8f2;border-radius:10px;padding:14px 16px;margin:14px 0">
          <p style="margin:0;font-size:13px;color:#57678a">Valor de la renovación anual</p>
          <p style="margin:4px 0 0;font-size:20px;font-weight:800;color:#2456e6">${COP(o.precio_anual)}</p>
        </div>
        <p style="color:#57678a;font-size:14px;line-height:1.6">Para renovar y mantener el acceso activo, responde este correo o escríbenos. ¡Gracias por confiar en nosotros!</p>
        <p style="color:#99a3b8;font-size:12px;margin-top:18px">Este es un recordatorio automático de tu plataforma de gestión sindical.</p>
      </div>`
      // Parte de texto plano: clave para que Gmail NO lo mande a spam y sí notifique.
      const text = `Tu suscripción está por vencer\n\nHola, te recordamos que la suscripción de ${o.nombre} a la plataforma vence el ${fechaLinda} (en ${o.dias} día${o.dias === 1 ? '' : 's'}).\n\nValor de la renovación anual: ${COP(o.precio_anual)}.\n\nPara renovar y mantener el acceso activo, responde este correo o escríbenos.\n\nGracias por confiar en nosotros.`
      try {
        const rr = await fetch('https://api.resend.com/emails', {
          method: 'POST', headers: { Authorization: `Bearer ${apiKey0}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ from: fromSindika, to: [to], subject: `Tu suscripción vence el ${fechaLinda}`, html, text, reply_to: process.env.EMAIL_ADMIN || ADMIN_DEFAULT }),
        })
        if (rr.ok) avisadosPresidente.push(o.nombre)
      } catch { /* continúa con el siguiente */ }
    }
  }

  const hayAlgo = suspendidos.length || vencidos.length || porVencer.length

  // 3) Enviar el resumen a la administración (si hay algo y hay Resend).
  let correo = { enviado: false }
  const apiKey = process.env.RESEND_API_KEY
  if (hayAlgo && apiKey) {
    const fila = (o, extra) => `<tr><td style="padding:6px 10px;border-bottom:1px solid #eee">${o.nombre}</td><td style="padding:6px 10px;border-bottom:1px solid #eee">${o.fecha_proximo_pago}</td><td style="padding:6px 10px;border-bottom:1px solid #eee">${COP(o.precio_anual)}</td><td style="padding:6px 10px;border-bottom:1px solid #eee;color:#666">${extra}</td></tr>`
    const bloque = (titulo, arr, color, extraFn) => arr.length ? `<h3 style="margin:18px 0 6px;color:${color};font-family:Arial">${titulo} (${arr.length})</h3><table style="border-collapse:collapse;width:100%;font-family:Arial;font-size:13px"><tr style="text-align:left;color:#888"><th style="padding:6px 10px">Sindicato</th><th style="padding:6px 10px">Vence</th><th style="padding:6px 10px">Anual</th><th style="padding:6px 10px"></th></tr>${arr.map((o) => fila(o, extraFn(o))).join('')}</table>` : ''
    const html = `<div style="max-width:640px;margin:0 auto"><h2 style="font-family:Arial;color:#0b2461">Sindika · Resumen de cobros</h2><p style="font-family:Arial;color:#555;font-size:13px">Revisión automática del ${new Date().toLocaleDateString('es-CO')}.</p>
      ${bloque('⛔ Suspendidos hoy por falta de pago', suspendidos, '#b3261e', () => 'acceso desactivado')}
      ${bloque('⚠️ Vencidos (aún activos)', vencidos, '#b45309', (o) => `hace ${Math.abs(o.dias)} día(s)`)}
      ${bloque('🔔 Por vencer', porVencer, '#0b2461', (o) => `en ${o.dias} día(s)`)}
      <p style="font-family:Arial;color:#999;font-size:11px;margin-top:20px">Se suspende automáticamente tras ${GRACE} días de vencido. Reactiva desde el panel de administración de Sindika.</p></div>`
    // Parte de texto plano (Gmail: mejor entrega + notificación).
    const lineas = (titulo, arr, extraFn) => arr.length ? `\n${titulo}:\n${arr.map((o) => `  - ${o.nombre} · vence ${o.fecha_proximo_pago} · ${COP(o.precio_anual)} · ${extraFn(o)}`).join('\n')}\n` : ''
    const text = `Sindika · Resumen de cobros (${new Date().toLocaleDateString('es-CO')})\n`
      + lineas('SUSPENDIDOS HOY', suspendidos, () => 'acceso desactivado')
      + lineas('VENCIDOS (aún activos)', vencidos, (o) => `hace ${Math.abs(o.dias)} día(s)`)
      + lineas('POR VENCER', porVencer, (o) => `en ${o.dias} día(s)`)
      + `\nSe suspende automáticamente tras ${GRACE} días de vencido. Reactiva desde el panel de administración de Sindika.`
    const from = `Sindika <${direccionDe(process.env.EMAIL_FROM || 'onboarding@resend.dev')}>`
    const to = process.env.EMAIL_ADMIN || ADMIN_DEFAULT
    try {
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, to: [to], subject: `Sindika · Cobros: ${suspendidos.length} suspendido(s), ${vencidos.length} vencido(s), ${porVencer.length} por vencer`, html, text }),
      })
      correo = { enviado: r.ok }
    } catch { correo = { enviado: false } }
  }

  res.status(200).json({
    ok: true,
    revisados: orgs.length,
    suspendidos: suspendidos.map((o) => o.nombre),
    vencidos: vencidos.map((o) => o.nombre),
    por_vencer: porVencer.map((o) => o.nombre),
    avisados_presidente: avisadosPresidente,
    correo,
  })
}
