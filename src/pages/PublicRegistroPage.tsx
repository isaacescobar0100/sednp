import React, { useEffect, useState } from 'react'
import { CheckCircle2Icon } from 'lucide-react'
import { supabase } from '../lib/supabase'

// Página PÚBLICA de auto-afiliación (sin iniciar sesión). Se abre con el link
// que genera la Secretaría: .../?afiliacion=<slug-del-sindicato>
// Crea una SOLICITUD (estado Pendiente) que luego el Fiscal conceptúa y la
// Junta aprueba. El acceso al portal solo funciona una vez aprobada.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function PublicRegistroPage({ slug }: { slug: string }) {
  const [orgNombre, setOrgNombre] = useState<string>('')
  const [orgLogo, setOrgLogo] = useState<string>('')
  const [cargando, setCargando] = useState(true)
  const [orgValida, setOrgValida] = useState(false)

  const [form, setForm] = useState({ nombres: '', apellidos: '', doc: '', email: '', telefono: '', direccion: '', password: '', password2: '' })
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')
  const [okSol, setOkSol] = useState('')

  function set<K extends keyof typeof form>(k: K, v: string) { setForm((p) => ({ ...p, [k]: v })) }

  useEffect(() => {
    let on = true
    supabase.rpc('org_publica', { p_slug: slug }).then(({ data }) => {
      if (!on) return
      const row = Array.isArray(data) ? data[0] : data
      if (row?.nombre) { setOrgNombre(row.nombre as string); setOrgLogo((row.logo_url as string) || ''); setOrgValida(true) }
      setCargando(false)
    })
    return () => { on = false }
  }, [slug])

  const emailInvalid = form.email.trim() !== '' && !EMAIL_RE.test(form.email.trim())
  const pass2Invalid = form.password2 !== '' && form.password !== form.password2
  const valid = form.nombres.trim() && form.apellidos.trim() && form.doc.trim() && form.email.trim() && !emailInvalid && form.password.length >= 6 && form.password === form.password2

  async function enviar() {
    if (!valid || enviando) return
    setEnviando(true); setError('')
    const { data, error } = await supabase.rpc('solicitar_afiliacion', {
      p_slug: slug,
      p_nombres: form.nombres.trim(),
      p_apellidos: form.apellidos.trim(),
      p_doc: form.doc.trim(),
      p_email: form.email.trim(),
      p_telefono: form.telefono.trim(),
      p_direccion: form.direccion.trim(),
      p_password: form.password,
    })
    setEnviando(false)
    if (error) { setError(error.message || 'No se pudo enviar la solicitud.'); return }
    setOkSol((data as string) || 'enviada')
  }

  const inputClass = 'w-full rounded-xl border border-ink/12 bg-canvas/45 px-3 py-2.5 text-sm outline-none focus:border-night focus:ring-4 focus:ring-night/10'

  return (
    <div className="min-h-screen bg-canvas px-4 py-10">
      <div className="mx-auto max-w-lg">
        <div className="mb-6 flex items-center gap-3">
          <img src={orgLogo || '/sindika.png'} alt={orgNombre || 'Sindicato'} className="h-12 w-12 object-contain" />
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gold">Formulario de afiliación</p>
            <h1 className="font-display text-xl font-semibold text-ink">{orgNombre || 'Afíliate al sindicato'}</h1>
          </div>
        </div>

        {cargando ? (
          <div className="rounded-2xl border border-ink/[0.08] bg-white p-8 text-center text-sm text-ink/50">Cargando…</div>
        ) : !orgValida ? (
          <div className="rounded-2xl border border-ink/[0.08] bg-white p-8 text-center text-sm text-ink/60">Este enlace de afiliación no es válido o el sindicato no está disponible. Solicita un enlace vigente a la Secretaría.</div>
        ) : okSol ? (
          <div className="rounded-2xl border border-ink/[0.08] bg-white p-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"><CheckCircle2Icon className="h-6 w-6" /></div>
            <h2 className="font-display text-lg font-semibold text-ink">¡Solicitud enviada!</h2>
            <p className="mt-2 text-sm text-ink/60">Tu solicitud <strong>{okSol}</strong> quedó registrada y está <strong>en revisión</strong>. La Junta Directiva la estudiará y te avisaremos por correo cuando sea aprobada. A partir de ahí podrás entrar con tu correo y contraseña.</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-ink/[0.08] bg-white p-6">
            <p className="mb-5 text-sm text-ink/55">Completa tus datos para solicitar tu afiliación. Tu solicitud pasará a revisión de la organización.</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nombres" value={form.nombres} onChange={(v) => set('nombres', v)} required className={inputClass} />
              <Field label="Apellidos" value={form.apellidos} onChange={(v) => set('apellidos', v)} required className={inputClass} />
              <Field label="Documento de identidad" value={form.doc} onChange={(v) => set('doc', v)} required className={inputClass} />
              <Field label="Correo" value={form.email} onChange={(v) => set('email', v)} required error={emailInvalid ? 'Correo no válido.' : ''} className={inputClass} />
              <Field label="Teléfono" value={form.telefono} onChange={(v) => set('telefono', v)} className={inputClass} />
              <Field label="Dirección" value={form.direccion} onChange={(v) => set('direccion', v)} className={inputClass} />
              <Field label="Contraseña (mín. 6)" value={form.password} onChange={(v) => set('password', v)} required type="password" className={inputClass} />
              <Field label="Confirmar contraseña" value={form.password2} onChange={(v) => set('password2', v)} required type="password" error={pass2Invalid ? 'No coincide.' : ''} className={inputClass} />
            </div>
            <p className="mt-3 rounded-xl border border-gold/25 bg-gold/[0.07] px-3 py-2.5 text-xs text-ink/60">Usarás tu <strong>correo</strong> y esta <strong>contraseña</strong> para entrar a tu portal, una vez la Junta Directiva apruebe tu afiliación.</p>
            {error ? <p className="mt-3 rounded-xl bg-brick/[0.07] px-3 py-2.5 text-xs font-medium text-brick">{error}</p> : null}
            <button onClick={enviar} disabled={!valid || enviando} className="mt-5 w-full rounded-xl bg-night py-3 text-sm font-semibold text-white transition hover:bg-night-deep disabled:opacity-40">{enviando ? 'Enviando…' : 'Enviar solicitud de afiliación'}</button>
          </div>
        )}

        <p className="mt-6 text-center text-[11px] text-ink/35">con tecnología de <span className="font-semibold text-ink/50">Sindika</span></p>
      </div>
    </div>
  )
}

function Field({ label, value, onChange, required, error, type = 'text', className }: { label: string; value: string; onChange: (v: string) => void; required?: boolean; error?: string; type?: string; className: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-ink/70">{label}{required ? <span className="text-brick"> *</span> : null}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className={className} />
      {error ? <span className="mt-1 block text-xs text-brick">{error}</span> : null}
    </label>
  )
}
