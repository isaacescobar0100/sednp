// Envío de correos desde la app, a través de la función serverless /api/send-email
// (que a su vez usa Resend). No lanza errores: devuelve true/false para no romper
// el flujo si el correo falla o aún no está configurado.
import { supabase } from '../lib/supabase'

export type CorreoInput = { to: string; subject: string; html?: string; text?: string }

export async function enviarCorreo(input: CorreoInput): Promise<boolean> {
  try {
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token
    if (!token) return false
    const res = await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(input),
    })
    return res.ok
  } catch {
    return false
  }
}

// Envoltura HTML sobria y co-marcada (sin imágenes externas, para no caer en spam).
export function plantillaCorreo(titulo: string, cuerpoHtml: string): string {
  return `<!doctype html><html><body style="margin:0;background:#f7f6f2;font-family:'Segoe UI',Arial,sans-serif;color:#1c2333">
    <div style="max-width:560px;margin:0 auto;padding:24px">
      <div style="background:#0F1B3D;border-radius:14px 14px 0 0;padding:20px 24px">
        <span style="color:#fff;font-weight:700;font-size:18px;letter-spacing:.5px">SERDNP</span>
        <span style="color:#C9973B;font-weight:700;font-size:14px;margin-left:8px">· Sindika</span>
      </div>
      <div style="background:#fff;border:1px solid #e4e6ec;border-top:none;border-radius:0 0 14px 14px;padding:24px">
        <h1 style="font-size:18px;margin:0 0 14px;color:#0F1B3D">${titulo}</h1>
        ${cuerpoHtml}
      </div>
      <p style="text-align:center;color:#8b93a3;font-size:11px;margin-top:16px">Organización Sindical de Servidores Públicos del DNP — SERDNP</p>
    </div>
  </body></html>`
}

// #11 — Agradecimiento cuando se registra el pago de un aporte.
export function correoAportePagado(nombre: string, periodo: string, monto: string): string {
  return plantillaCorreo('¡Gracias por tu aporte!', `
    <p style="margin:0 0 10px">Hola <strong>${nombre}</strong>,</p>
    <p style="margin:0 0 10px">Registramos el pago de tu aporte sindical de <strong>${periodo}</strong> por un valor de <strong>${monto}</strong>.</p>
    <p style="margin:0 0 10px">Tu compromiso fortalece la organización y nos permite seguir defendiendo tus derechos. ¡Gracias por ser parte del SERDNP!</p>
    <p style="margin:16px 0 0;color:#5b6577;font-size:13px">Junta Directiva Nacional</p>
  `)
}
