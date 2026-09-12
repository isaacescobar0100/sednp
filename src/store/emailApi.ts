// Envío de correos desde la app, a través de la función serverless /api/send-email
// (que a su vez usa Resend). No lanza errores: devuelve true/false para no romper
// el flujo si el correo falla o aún no está configurado.
import { supabase } from '../lib/supabase'

export type CorreoInput = { to: string; subject: string; html?: string; text?: string }

// --- Marca del sindicato actual (multi-sindicato) ---------------------------
// El nombre del sindicato de la sesión se usa como (a) nombre del remitente
// ("De: Sindicato XYZ <...>") y (b) marca dentro de la plantilla. Así cada
// sindicato envía con SU nombre aunque compartan el mismo dominio verificado.
// La dirección de correo (@dominio) la fija EMAIL_FROM en el servidor.
let marcaActual = 'SERDNP'
let remitenteActual = '' // dirección propia del sindicato (si compró dominio); vacío = usa la global
let logoActual = ''      // URL pública del logo del sindicato para el encabezado del correo
let plantillaBienvenida = '' // texto configurable del correo de bienvenida (por sindicato)

// Fija el texto del correo de bienvenida del sindicato actual (editable en Parámetros).
export function setPlantillaBienvenida(texto?: string | null): void {
  plantillaBienvenida = (texto || '').trim()
}
export function setMarca(nombre?: string | null, correoRemitente?: string | null, logoUrl?: string | null): void {
  marcaActual = (nombre || '').trim() || 'SERDNP'
  remitenteActual = (correoRemitente || '').trim()
  logoActual = (logoUrl || '').trim()
}
export function marca(): string {
  return marcaActual
}

export async function enviarCorreo(input: CorreoInput): Promise<boolean> {
  return (await enviarCorreoDetallado(input)).ok
}

// Igual que enviarCorreo pero devuelve el detalle (para diagnóstico/pruebas):
// si falla, trae el mensaje de error del servidor o de Resend.
export async function enviarCorreoDetallado(input: CorreoInput): Promise<{ ok: boolean; id?: string; error?: string }> {
  try {
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token
    if (!token) return { ok: false, error: 'No hay sesión activa.' }
    const res = await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ ...input, fromName: marcaActual, fromEmail: remitenteActual || undefined }),
    })
    let payload: { id?: string; error?: string } = {}
    try { payload = await res.json() } catch { /* respuesta sin JSON */ }
    if (!res.ok) return { ok: false, error: payload.error || `Error ${res.status}` }
    return { ok: true, id: payload.id }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Fallo de red' }
  }
}

// Envía un boletín por correo a una lista de destinatarios (vía /api/boletin).
// Devuelve cuántos se enviaron. No lanza.
export async function enviarBoletin(recipients: string[], subject: string, html: string): Promise<{ ok: boolean; sent: number; failed: number; total: number; error?: string }> {
  try {
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token
    if (!token) return { ok: false, sent: 0, failed: 0, total: 0, error: 'No hay sesión activa.' }
    const res = await fetch('/api/boletin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ recipients, subject, html, fromName: marcaActual, fromEmail: remitenteActual || undefined }),
    })
    const payload = await res.json().catch(() => ({}))
    if (!res.ok) return { ok: false, sent: 0, failed: 0, total: recipients.length, error: payload.error || `Error ${res.status}` }
    return { ok: true, sent: payload.sent || 0, failed: payload.failed || 0, total: payload.total || recipients.length, error: payload.error }
  } catch (e) {
    return { ok: false, sent: 0, failed: 0, total: recipients.length, error: e instanceof Error ? e.message : 'Fallo de red' }
  }
}

// Envoltura HTML sobria y co-marcada. Incluye el logo del sindicato (si tiene)
// dentro de una pastilla blanca para que se vea sobre el encabezado oscuro.
// El encabezado y el pie usan el nombre del sindicato actual (marca()).
export function plantillaCorreo(titulo: string, cuerpoHtml: string): string {
  const m = escapeHtml(marca())
  const logoUrl = logoAbsoluto(logoActual)
  const logo = logoUrl
    ? `<td style="padding-right:12px" valign="middle"><span style="display:inline-block;background:#fff;border-radius:10px;padding:6px"><img src="${escapeHtml(logoUrl)}" alt="${m}" height="34" style="display:block;height:34px;width:auto"></span></td>`
    : ''
  return `<!doctype html><html><body style="margin:0;background:#f7f6f2;font-family:'Segoe UI',Arial,sans-serif;color:#1c2333">
    <div style="max-width:560px;margin:0 auto;padding:24px">
      <div style="background:#0F1B3D;border-radius:14px 14px 0 0;padding:18px 24px">
        <table role="presentation" cellpadding="0" cellspacing="0"><tr>
          ${logo}
          <td valign="middle">
            <span style="color:#fff;font-weight:700;font-size:18px;letter-spacing:.5px">${m}</span>
            <span style="color:#C9973B;font-weight:700;font-size:14px;margin-left:8px">· Sindika</span>
          </td>
        </tr></table>
      </div>
      <div style="background:#fff;border:1px solid #e4e6ec;border-top:none;border-radius:0 0 14px 14px;padding:24px">
        <h1 style="font-size:18px;margin:0 0 14px;color:#0F1B3D">${titulo}</h1>
        ${cuerpoHtml}
      </div>
      <p style="text-align:center;color:#8b93a3;font-size:11px;margin-top:16px">${m} — gestionado con Sindika</p>
    </div>
  </body></html>`
}

// Los clientes de correo NO resuelven rutas relativas (ej. "/logo.png"): las
// convierte en URL absoluta usando el origen actual. Si ya es absoluta, la deja.
function logoAbsoluto(url: string): string {
  if (!url) return ''
  if (/^https?:\/\//i.test(url)) return url
  if (url.startsWith('/') && typeof window !== 'undefined') return window.location.origin + url
  return url
}

// Escapa el nombre del sindicato para insertarlo con seguridad en el HTML.
function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string))
}

// Bienvenida cuando la Junta aprueba la afiliación (el afiliado ya puede entrar).
// Usa el mensaje configurable del sindicato (Parámetros) con placeholders
// {nombre}, {acta}, {sindicato}; si no hay, cae en un texto por defecto.
export function correoAfiliacionAprobada(nombre: string, acta: string): string {
  const m = escapeHtml(marca())
  if (plantillaBienvenida) {
    const cuerpo = escapeHtml(plantillaBienvenida)
      .replace(/\{nombre\}/g, `<strong>${escapeHtml(nombre)}</strong>`)
      .replace(/\{acta\}/g, escapeHtml(acta || '—'))
      .replace(/\{sindicato\}/g, m)
      .split(/\n\s*\n/)
      .map((p) => `<p style="margin:0 0 10px">${p.replace(/\n/g, '<br>')}</p>`)
      .join('')
    return plantillaCorreo(`¡Bienvenido(a) a ${m}!`, cuerpo)
  }
  return plantillaCorreo(`¡Bienvenido(a) a ${m}!`, `
    <p style="margin:0 0 10px">Hola <strong>${escapeHtml(nombre)}</strong>,</p>
    <p style="margin:0 0 10px">La Junta Directiva <strong>aprobó tu afiliación</strong>${acta ? ` mediante Acta No. ${escapeHtml(acta)}` : ''}. Ya eres parte de ${m}.</p>
    <p style="margin:0 0 10px">Desde ahora puedes ingresar a tu portal con tu correo y la contraseña que te asignaron, para consultar tus aportes, votaciones, comunicados y documentos.</p>
    <p style="margin:16px 0 0;color:#5b6577;font-size:13px">Junta Directiva</p>
  `)
}

// #11 — Agradecimiento cuando se registra el pago de un aporte.
export function correoAportePagado(nombre: string, periodo: string, monto: string): string {
  return plantillaCorreo('¡Gracias por tu aporte!', `
    <p style="margin:0 0 10px">Hola <strong>${nombre}</strong>,</p>
    <p style="margin:0 0 10px">Registramos el pago de tu aporte sindical de <strong>${periodo}</strong> por un valor de <strong>${monto}</strong>.</p>
    <p style="margin:0 0 10px">Tu compromiso fortalece la organización y nos permite seguir defendiendo tus derechos. ¡Gracias por ser parte de ${escapeHtml(marca())}!</p>
    <p style="margin:16px 0 0;color:#5b6577;font-size:13px">Junta Directiva</p>
  `)
}
