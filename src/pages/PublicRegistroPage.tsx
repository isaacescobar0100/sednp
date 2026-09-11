import React, { useEffect, useMemo, useRef, useState } from 'react'
import { CameraIcon, CheckCircle2Icon } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { subirFotoPublica } from '../store/storageApi'
import { BENEFICIOS, MEDIOS } from '../store/affiliates'
import { Escala, escalaLabel, sortEscalas } from '../store/payscale'
import { formatCop } from '../store/finance'

// Página PÚBLICA de auto-afiliación (sin iniciar sesión). Formulario completo:
// datos personales + información laboral. Se abre con .../?afiliacion=<slug>.
// Crea una SOLICITUD (Pendiente) que sigue el flujo Fiscal → Junta.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
function parseMoney(text: string): number { return Number(text.replace(/\D/g, '')) }

type Catalogos = { cargos: string[]; dependencias: string[]; vinculaciones: { name: string }[]; escalas: Escala[]; porcentajeCuota: number }

const emptyForm = {
  nombres: '', apellidos: '', doc: '', email: '', telefono: '', direccion: '', password: '', password2: '',
  type: '', dependency: '', cargoTitular: '', role: '', asignacionBasica: '', joinDate: '', medio: '', motivo: '', interesComites: '',
  beneficios: [] as string[], fotoUrl: '',
}

export function PublicRegistroPage({ slug }: { slug: string }) {
  const [orgNombre, setOrgNombre] = useState('')
  const [orgLogo, setOrgLogo] = useState('')
  const [cargando, setCargando] = useState(true)
  const [orgValida, setOrgValida] = useState(false)
  const [cat, setCat] = useState<Catalogos>({ cargos: [], dependencias: [], vinculaciones: [], escalas: [], porcentajeCuota: 0.003 })

  const [form, setForm] = useState(emptyForm)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')
  const [okSol, setOkSol] = useState('')
  const [subiendoFoto, setSubiendoFoto] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) { setForm((p) => ({ ...p, [k]: v })) }
  function toggleBen(b: string) { setForm((p) => ({ ...p, beneficios: p.beneficios.includes(b) ? p.beneficios.filter((x) => x !== b) : [...p.beneficios, b] })) }
  async function handleFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setSubiendoFoto(true)
    try { const url = await subirFotoPublica(file); set('fotoUrl', url) } catch { /* reintentar */ } finally { setSubiendoFoto(false) }
  }

  useEffect(() => {
    let on = true
    Promise.all([
      supabase.rpc('org_publica', { p_slug: slug }),
      supabase.rpc('catalogos_publicos', { p_slug: slug }),
    ]).then(([orgRes, catRes]) => {
      if (!on) return
      const row = Array.isArray(orgRes.data) ? orgRes.data[0] : orgRes.data
      if (row?.nombre) { setOrgNombre(row.nombre as string); setOrgLogo((row.logo_url as string) || ''); setOrgValida(true) }
      const c = (catRes.data || {}) as Partial<Catalogos>
      setCat({
        cargos: Array.isArray(c.cargos) ? c.cargos : [],
        dependencias: Array.isArray(c.dependencias) ? c.dependencias : [],
        vinculaciones: Array.isArray(c.vinculaciones) ? c.vinculaciones : [],
        escalas: Array.isArray(c.escalas) ? (c.escalas as Escala[]).map((e, i) => ({ ...e, id: String(i) })) : [],
        porcentajeCuota: typeof c.porcentajeCuota === 'number' ? c.porcentajeCuota : 0.003,
      })
      setCargando(false)
    })
    return () => { on = false }
  }, [slug])

  const escalasOrdenadas = useMemo(() => sortEscalas(cat.escalas), [cat.escalas])
  const emailInvalid = form.email.trim() !== '' && !EMAIL_RE.test(form.email.trim())
  const pass2Invalid = form.password2 !== '' && form.password !== form.password2
  const cuota = parseMoney(form.asignacionBasica) > 0 ? Math.round(parseMoney(form.asignacionBasica) * cat.porcentajeCuota) : 0
  const valid = form.nombres.trim() && form.apellidos.trim() && form.doc.trim() && form.email.trim() && !emailInvalid
    && form.password.length >= 6 && form.password === form.password2
    && form.type.trim() !== '' && parseMoney(form.asignacionBasica) > 0

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
      p_extra: {
        type: form.type, dependency: form.dependency, cargoTitular: form.cargoTitular, role: form.role,
        asignacionBasica: parseMoney(form.asignacionBasica), beneficios: form.beneficios,
        medio: form.medio, motivo: form.motivo.trim(), interesComites: form.interesComites.trim(), joinDate: form.joinDate,
        fotoUrl: form.fotoUrl,
      },
    })
    setEnviando(false)
    if (error) { setError(error.message || 'No se pudo enviar la solicitud.'); return }
    setOkSol((data as string) || 'enviada')
  }

  const inputClass = 'w-full rounded-xl border border-ink/12 bg-canvas/45 px-3 py-2.5 text-sm outline-none focus:border-night focus:ring-4 focus:ring-night/10'

  return (
    <div className="min-h-screen bg-canvas px-4 py-10">
      <div className="mx-auto max-w-2xl">
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
          <div className="space-y-6">
            {/* Datos personales */}
            <section className="rounded-2xl border border-ink/[0.08] bg-white p-6">
              <h2 className="font-display text-base font-semibold text-ink">Datos personales</h2>
              <p className="mt-0.5 text-sm text-ink/50">Información de identificación y contacto.</p>
              <div className="mt-4 flex items-center gap-4">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-ink/12 bg-canvas">
                  {form.fotoUrl ? <img src={form.fotoUrl} alt="Foto" className="h-full w-full object-cover" /> : <CameraIcon className="h-6 w-6 text-ink/30" />}
                </div>
                <div>
                  <input ref={fileRef} type="file" accept="image/*" onChange={handleFoto} className="hidden" />
                  <button type="button" onClick={() => fileRef.current?.click()} disabled={subiendoFoto} className="rounded-xl border border-ink/12 px-3 py-2 text-sm font-semibold text-ink/70 transition hover:border-night hover:text-night disabled:opacity-50">
                    {subiendoFoto ? 'Subiendo…' : form.fotoUrl ? 'Cambiar foto' : 'Subir foto'}
                  </button>
                  <p className="mt-1 text-xs text-ink/45">Foto de perfil (opcional).</p>
                </div>
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Field label="Nombres" value={form.nombres} onChange={(v) => set('nombres', v)} required cls={inputClass} />
                <Field label="Apellidos" value={form.apellidos} onChange={(v) => set('apellidos', v)} required cls={inputClass} />
                <Field label="Documento de identidad" value={form.doc} onChange={(v) => set('doc', v)} required cls={inputClass} />
                <Field label="Correo" value={form.email} onChange={(v) => set('email', v)} required error={emailInvalid ? 'Correo no válido.' : ''} cls={inputClass} />
                <Field label="Teléfono" value={form.telefono} onChange={(v) => set('telefono', v)} cls={inputClass} />
                <Field label="Dirección" value={form.direccion} onChange={(v) => set('direccion', v)} cls={inputClass} />
                <Field label="Contraseña (mín. 6)" value={form.password} onChange={(v) => set('password', v)} required type="password" cls={inputClass} />
                <Field label="Confirmar contraseña" value={form.password2} onChange={(v) => set('password2', v)} required type="password" error={pass2Invalid ? 'No coincide.' : ''} cls={inputClass} />
              </div>
            </section>

            {/* Información laboral */}
            <section className="rounded-2xl border border-ink/[0.08] bg-white p-6">
              <h2 className="font-display text-base font-semibold text-ink">Información laboral</h2>
              <p className="mt-0.5 text-sm text-ink/50">Datos de vinculación y base de tu cuota sindical.</p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Choice label="Tipo de vinculación" value={form.type} onChange={(v) => set('type', v)} options={cat.vinculaciones.map((t) => t.name)} placeholder="Seleccionar tipo" required cls={inputClass} />
                <Choice label="Dependencia" value={form.dependency} onChange={(v) => set('dependency', v)} options={cat.dependencias} placeholder="Seleccionar dependencia" cls={inputClass} />
                <Choice label="Cargo titular" value={form.cargoTitular} onChange={(v) => set('cargoTitular', v)} options={cat.cargos} placeholder="Seleccionar cargo titular" cls={inputClass} />
                <Choice label="Cargo que ocupa" value={form.role} onChange={(v) => set('role', v)} options={cat.cargos} placeholder="Seleccionar cargo" cls={inputClass} />
                {escalasOrdenadas.length > 0 ? (
                  <Choice label="Escala salarial (autocompleta)" value="" onChange={(v) => { const e = escalasOrdenadas.find((x) => `${escalaLabel(x)} · ${formatCop(x.asignacionBasica)}` === v); if (e) set('asignacionBasica', String(e.asignacionBasica)) }} options={escalasOrdenadas.map((e) => `${escalaLabel(e)} · ${formatCop(e.asignacionBasica)}`)} placeholder="Elegir nivel/grado" cls={inputClass} />
                ) : null}
                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold text-ink/70">Asignación básica mensual <span className="text-brick">*</span></span>
                  <input value={form.asignacionBasica} onChange={(e) => set('asignacionBasica', e.target.value)} inputMode="numeric" placeholder="$ 3.500.000" className={inputClass} />
                  <span className="mt-1 block text-xs text-ink/50">Base de tu cuota ({(cat.porcentajeCuota * 100).toLocaleString('es-CO', { maximumFractionDigits: 2 })}%).{cuota > 0 ? ` Cuota: ${formatCop(cuota)}` : ''}</span>
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold text-ink/70">Fecha de vinculación</span>
                  <input type="date" value={form.joinDate} onChange={(e) => set('joinDate', e.target.value)} className={inputClass} />
                </label>
                <Choice label="¿Por qué medio se enteró?" value={form.medio} onChange={(v) => set('medio', v)} options={MEDIOS} placeholder="Seleccionar" cls={inputClass} />
              </div>

              <div className="mt-4">
                <span className="mb-1.5 block text-xs font-semibold text-ink/70">Programas de bienestar de interés</span>
                <div className="flex flex-wrap gap-2">
                  {BENEFICIOS.map((b) => (
                    <button type="button" key={b} onClick={() => toggleBen(b)} className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${form.beneficios.includes(b) ? 'border-night bg-night/[0.06] text-night' : 'border-ink/12 text-ink/55 hover:border-ink/25'}`}>{b}</button>
                  ))}
                </div>
              </div>
              <label className="mt-4 block">
                <span className="mb-1.5 block text-xs font-semibold text-ink/70">¿Por qué te gustaría pertenecer al sindicato?</span>
                <textarea value={form.motivo} onChange={(e) => set('motivo', e.target.value)} rows={2} className={`${inputClass} resize-none`} />
              </label>
            </section>

            <p className="rounded-xl border border-gold/25 bg-gold/[0.07] px-3 py-2.5 text-xs text-ink/60">Usarás tu <strong>correo</strong> y tu <strong>contraseña</strong> para entrar a tu portal, una vez la Junta Directiva apruebe tu afiliación.</p>
            {error ? <p className="rounded-xl bg-brick/[0.07] px-3 py-2.5 text-xs font-medium text-brick">{error}</p> : null}
            <button onClick={enviar} disabled={!valid || enviando} className="w-full rounded-xl bg-night py-3 text-sm font-semibold text-white transition hover:bg-night-deep disabled:opacity-40">{enviando ? 'Enviando…' : 'Enviar solicitud de afiliación'}</button>
          </div>
        )}

        <p className="mt-6 text-center text-[11px] text-ink/35">con tecnología de <span className="font-semibold text-ink/50">Sindika</span></p>
      </div>
    </div>
  )
}

function Field({ label, value, onChange, required, error, type = 'text', cls }: { label: string; value: string; onChange: (v: string) => void; required?: boolean; error?: string; type?: string; cls: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-ink/70">{label}{required ? <span className="text-brick"> *</span> : null}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className={cls} />
      {error ? <span className="mt-1 block text-xs text-brick">{error}</span> : null}
    </label>
  )
}

function Choice({ label, value, onChange, options, placeholder, required, cls }: { label: string; value: string; onChange: (v: string) => void; options: string[]; placeholder: string; required?: boolean; cls: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-ink/70">{label}{required ? <span className="text-brick"> *</span> : null}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={`${cls} ${value === '' ? 'text-ink/45' : ''}`}>
        <option value="">{placeholder}</option>
        {options.map((o) => <option key={o} value={o} className="text-ink">{o}</option>)}
      </select>
    </label>
  )
}
