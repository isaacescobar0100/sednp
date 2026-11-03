import React, { useState } from 'react'
import { CheckCircle2Icon, InboxIcon, SearchIcon } from 'lucide-react'
import { ESTADO_LABEL, PLAZO_DIAS_HABILES, PqrsTipo, TIPOS, TIPO_LABEL, fmtFechaPqrs } from '../store/pqrs'
import { ConsultaPublica, consultarPqrsPublica, radicarPqrsPublica } from '../store/pqrsApi'

// Sección PQRS de la página web pública: radicar (sin cuenta) y consultar el
// estado con el número de radicado + el correo con que se radicó.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const inputClass = 'w-full rounded-xl border border-ink/12 bg-canvas/45 px-3 py-2.5 text-sm outline-none focus:border-night focus:ring-4 focus:ring-night/10'
const vacio = { tipo: '' as '' | PqrsTipo, nombre: '', documento: '', email: '', telefono: '', asunto: '', descripcion: '', aceptaDatos: false }

export function PqrsPublico({ slug, orgNombre }: { slug: string; orgNombre: string }) {
  const [modo, setModo] = useState<'radicar' | 'consultar'>('radicar')
  const [form, setForm] = useState(vacio)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')
  const [ok, setOk] = useState<{ radicado: string; venceAt: string | null; email: string } | null>(null)

  const [cRadicado, setCRadicado] = useState('')
  const [cEmail, setCEmail] = useState('')
  const [consultando, setConsultando] = useState(false)
  const [resultado, setResultado] = useState<ConsultaPublica | null | 'no'>(null)
  const [cError, setCError] = useState('')

  function set<K extends keyof typeof vacio>(k: K, v: (typeof vacio)[K]) { setForm((f) => ({ ...f, [k]: v })) }
  const emailInvalido = form.email.trim() !== '' && !EMAIL_RE.test(form.email.trim())
  const valido = form.tipo !== '' && form.nombre.trim() && form.email.trim() && !emailInvalido && form.asunto.trim() && form.descripcion.trim() && form.aceptaDatos

  async function radicar() {
    if (!valido || enviando || !slug || form.tipo === '') return
    setEnviando(true); setError('')
    try {
      const r = await radicarPqrsPublica(slug, { ...form, tipo: form.tipo })
      setOk({ ...r, email: form.email.trim() })
      setForm(vacio)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo radicar la PQRS.')
    } finally { setEnviando(false) }
  }

  async function consultar() {
    if (!cRadicado.trim() || !cEmail.trim() || consultando || !slug) return
    setConsultando(true); setCError(''); setResultado(null)
    try { setResultado((await consultarPqrsPublica(slug, cRadicado, cEmail)) ?? 'no') } catch (e) { setCError(e instanceof Error ? e.message : 'No se pudo consultar.') } finally { setConsultando(false) }
  }

  function irAConsultar(radicado: string, email: string) {
    setCRadicado(radicado); setCEmail(email); setResultado(null); setOk(null); setModo('consultar')
  }

  return (
    <section className="mx-auto max-w-3xl">
      <h1 className="mb-1 flex items-center gap-2 font-display text-2xl font-semibold text-ink"><InboxIcon className="h-6 w-6 text-gold" />PQRS</h1>
      <p className="mb-6 text-sm text-ink/55">Peticiones, quejas, reclamos y sugerencias. Te daremos un número de radicado y responderemos en máximo {PLAZO_DIAS_HABILES} días hábiles.</p>

      <div className="mb-5 inline-flex rounded-xl bg-white p-1 ring-1 ring-ink/[0.08]">
        {(['radicar', 'consultar'] as const).map((m) => (
          <button key={m} onClick={() => setModo(m)} className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${modo === m ? 'bg-night text-white' : 'text-ink/60 hover:text-night'}`}>{m === 'radicar' ? 'Radicar PQRS' : 'Consultar estado'}</button>
        ))}
      </div>

      {modo === 'radicar' ? (
        ok ? (
          <div className="rounded-2xl border border-ink/[0.08] bg-white p-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"><CheckCircle2Icon className="h-6 w-6" /></div>
            <h2 className="font-display text-lg font-semibold text-ink">¡PQRS radicada!</h2>
            <p className="mt-2 text-sm text-ink/60">Tu número de radicado es</p>
            <p className="mt-1 font-mono text-2xl font-bold tracking-wide text-night">{ok.radicado}</p>
            <p className="mt-3 text-sm text-ink/60">Guárdalo: lo necesitas junto con tu correo para consultar el estado. Responderemos a más tardar el <strong>{fmtFechaPqrs(ok.venceAt)}</strong>.</p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <button onClick={() => irAConsultar(ok.radicado, ok.email)} className="rounded-xl bg-night px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-night-deep">Consultar estado</button>
              <button onClick={() => setOk(null)} className="rounded-xl border border-ink/12 px-4 py-2.5 text-sm font-semibold text-ink/60 transition hover:bg-canvas">Radicar otra</button>
            </div>
          </div>
        ) : (
          <div className="space-y-5 rounded-2xl border border-ink/[0.08] bg-white p-5 sm:p-6">
            <div>
              <span className="mb-2 block text-xs font-semibold text-ink/70">¿Qué quieres radicar? <span className="text-brick">*</span></span>
              <div className="grid gap-2 sm:grid-cols-2">
                {TIPOS.map((t) => (
                  <button type="button" key={t.value} onClick={() => set('tipo', t.value)} className={`rounded-xl border px-3.5 py-3 text-left transition ${form.tipo === t.value ? 'border-night bg-night/[0.05] ring-2 ring-night/15' : 'border-ink/12 hover:border-ink/25'}`}>
                    <span className="block text-sm font-semibold text-ink">{t.label}</span>
                    <span className="mt-0.5 block text-xs leading-snug text-ink/55">{t.ayuda}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Campo label="Nombre completo" required value={form.nombre} onChange={(v) => set('nombre', v)} max={150} autoComplete="name" />
              <Campo label="Documento de identidad" value={form.documento} onChange={(v) => set('documento', v)} max={30} />
              <Campo label="Correo electrónico" required value={form.email} onChange={(v) => set('email', v)} max={200} type="email" autoComplete="email" error={emailInvalido ? 'Correo no válido.' : ''} />
              <Campo label="Teléfono" value={form.telefono} onChange={(v) => set('telefono', v)} max={30} type="tel" autoComplete="tel" />
              <div className="sm:col-span-2"><Campo label="Asunto" required value={form.asunto} onChange={(v) => set('asunto', v)} max={200} /></div>
              <label className="block sm:col-span-2">
                <span className="mb-1.5 block text-xs font-semibold text-ink/70">Descripción <span className="text-brick">*</span></span>
                <textarea value={form.descripcion} onChange={(e) => set('descripcion', e.target.value)} rows={6} maxLength={5000} placeholder="Cuéntanos con detalle: qué pasó, cuándo y qué solicitas." className={`${inputClass} resize-y`} />
                <span className="mt-1 block text-right text-[11px] text-ink/40">{form.descripcion.length}/5000</span>
              </label>
            </div>
            <label className="flex items-start gap-2.5 text-sm text-ink/70">
              <input type="checkbox" checked={form.aceptaDatos} onChange={(e) => set('aceptaDatos', e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-night" />
              <span>Autorizo a <strong>{orgNombre || 'el sindicato'}</strong> a tratar mis datos personales para atender y responder esta solicitud, conforme a la Ley 1581 de 2012. <span className="text-brick">*</span></span>
            </label>
            {error ? <p className="rounded-xl bg-brick/[0.07] px-3 py-2.5 text-xs font-medium text-brick">{error}</p> : null}
            <button onClick={radicar} disabled={!valido || enviando} className="w-full rounded-xl bg-night py-3 text-sm font-semibold text-white transition hover:bg-night-deep disabled:opacity-40">{enviando ? 'Radicando…' : 'Radicar PQRS'}</button>
          </div>
        )
      ) : (
        <div className="space-y-4">
          <div className="rounded-2xl border border-ink/[0.08] bg-white p-5 sm:p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <Campo label="Número de radicado" value={cRadicado} onChange={setCRadicado} placeholder="PQRS-2026-0001" max={30} />
              <Campo label="Correo con el que radicaste" value={cEmail} onChange={setCEmail} type="email" autoComplete="email" max={200} />
            </div>
            {cError ? <p className="mt-3 rounded-xl bg-brick/[0.07] px-3 py-2.5 text-xs font-medium text-brick">{cError}</p> : null}
            <button onClick={consultar} disabled={!cRadicado.trim() || !cEmail.trim() || consultando} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-night py-3 text-sm font-semibold text-white transition hover:bg-night-deep disabled:opacity-40"><SearchIcon className="h-4 w-4" />{consultando ? 'Consultando…' : 'Consultar'}</button>
          </div>

          {resultado === 'no' ? (
            <div className="rounded-2xl border border-ink/[0.08] bg-white p-6 text-center text-sm text-ink/60">No encontramos una PQRS con ese radicado y ese correo. Verifica los datos.</div>
          ) : resultado ? (
            <div className="rounded-2xl border border-ink/[0.08] bg-white p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-mono text-xs font-semibold text-gold">{resultado.radicado} · {TIPO_LABEL[resultado.tipo]}</p>
                  <h2 className="mt-1 font-display text-lg font-semibold text-ink">{resultado.asunto}</h2>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${resultado.estado === 'respondida' ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/15' : 'bg-amber-50 text-amber-700 ring-amber-600/15'}`}>{ESTADO_LABEL[resultado.estado]}</span>
              </div>
              <p className="mt-2 text-xs text-ink/50">Radicada el {fmtFechaPqrs(resultado.createdAt)} · Fecha límite de respuesta: {fmtFechaPqrs(resultado.venceAt)}</p>
              {resultado.respuesta ? (
                <div className="mt-4 rounded-xl border border-emerald-600/20 bg-emerald-50/60 p-4">
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-emerald-800/70">Respuesta · {fmtFechaPqrs(resultado.respondidaAt)}</p>
                  <p className="whitespace-pre-line text-sm leading-relaxed text-ink/80">{resultado.respuesta}</p>
                </div>
              ) : resultado.estado === 'archivada' ? (
                <p className="mt-4 text-sm text-ink/60">Esta solicitud fue archivada. Si crees que es un error, radica una nueva PQRS.</p>
              ) : (
                <p className="mt-4 text-sm text-ink/60">Tu solicitud está siendo atendida. Te enviaremos la respuesta a tu correo.</p>
              )}
            </div>
          ) : null}
        </div>
      )}
    </section>
  )
}

function Campo({ label, value, onChange, required, error, type = 'text', placeholder, max, autoComplete }: { label: string; value: string; onChange: (v: string) => void; required?: boolean; error?: string; type?: string; placeholder?: string; max?: number; autoComplete?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-ink/70">{label}{required ? <span className="text-brick"> *</span> : null}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} maxLength={max} autoComplete={autoComplete} className={inputClass} />
      {error ? <span className="mt-1 block text-xs text-brick">{error}</span> : null}
    </label>
  )
}
