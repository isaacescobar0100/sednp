import React, { useEffect, useState } from 'react'
import { ChevronDownIcon, InboxIcon, PlusIcon } from 'lucide-react'
import { useAuth } from '../store/auth'
import { useDemo } from '../store/DemoStore'
import { StatusBadge } from './StatusBadge'
import { ESTADO_LABEL, PLAZO_DIAS_HABILES, PqrsEstado, PqrsTipo, TIPOS, TIPO_LABEL, fmtFechaPqrs } from '../store/pqrs'
import { MiPqrs, fetchMisPqrs, radicarPqrsAfiliado } from '../store/pqrsApi'

// Portal del afiliado → PQRS: radicar (sus datos ya los tiene el sindicato) y
// seguir las que ha radicado desde aquí, con la respuesta de la directiva.

const inputClass = 'w-full rounded-xl border border-ink/12 bg-canvas/45 px-3 py-2.5 text-sm outline-none focus:border-night focus:ring-4 focus:ring-night/10'
const tone: Record<PqrsEstado, 'warning' | 'night' | 'positive' | 'neutral'> = { radicada: 'warning', en_tramite: 'night', respondida: 'positive', archivada: 'neutral' }

export function PqrsAfiliado() {
  const { session } = useAuth()
  const { notify } = useDemo()
  const userId = session?.user.id ?? ''
  const [list, setList] = useState<MiPqrs[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(false)
  const [nueva, setNueva] = useState(false)
  const [abierta, setAbierta] = useState<string | null>(null)
  const [tipo, setTipo] = useState<'' | PqrsTipo>('')
  const [asunto, setAsunto] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function load() {
    if (!userId) { setCargando(false); return }
    try { setList(await fetchMisPqrs()); setError(false) } catch { setError(true) } finally { setCargando(false) }
  }
  useEffect(() => { load() }, [userId])

  async function radicar() {
    if (tipo === '' || !asunto.trim() || !descripcion.trim() || enviando) return
    setEnviando(true)
    try {
      const r = await radicarPqrsAfiliado(tipo, asunto, descripcion)
      notify(`PQRS radicada con el número ${r.radicado}. Te responderemos a más tardar el ${fmtFechaPqrs(r.venceAt)}.`, 'success')
      setTipo(''); setAsunto(''); setDescripcion(''); setNueva(false)
      await load()
    } catch (e) {
      notify(e instanceof Error ? e.message : 'No se pudo radicar la PQRS.', 'warning')
    } finally { setEnviando(false) }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-display text-lg font-semibold text-ink">Mis PQRS</h2>
          <p className="text-sm text-ink/55">Peticiones, quejas, reclamos y sugerencias a la Junta Directiva. Respuesta en máximo {PLAZO_DIAS_HABILES} días hábiles.</p>
        </div>
        {!nueva ? <button onClick={() => setNueva(true)} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-night px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-night-deep"><PlusIcon className="h-4 w-4" />Nueva PQRS</button> : null}
      </div>

      {nueva ? (
        <section className="space-y-4 rounded-2xl border border-ink/[0.08] bg-white p-5 sm:p-6">
          <div>
            <span className="mb-2 block text-xs font-semibold text-ink/70">Tipo <span className="text-brick">*</span></span>
            <div className="grid gap-2 sm:grid-cols-2">
              {TIPOS.map((t) => (
                <button type="button" key={t.value} onClick={() => setTipo(t.value)} className={`rounded-xl border px-3.5 py-3 text-left transition ${tipo === t.value ? 'border-night bg-night/[0.05] ring-2 ring-night/15' : 'border-ink/12 hover:border-ink/25'}`}>
                  <span className="block text-sm font-semibold text-ink">{t.label}</span>
                  <span className="mt-0.5 block text-xs leading-snug text-ink/55">{t.ayuda}</span>
                </button>
              ))}
            </div>
          </div>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-ink/70">Asunto <span className="text-brick">*</span></span>
            <input value={asunto} onChange={(e) => setAsunto(e.target.value)} maxLength={200} className={inputClass} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-ink/70">Descripción <span className="text-brick">*</span></span>
            <textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} rows={5} maxLength={5000} placeholder="Cuéntanos con detalle qué pasó y qué solicitas." className={`${inputClass} resize-y`} />
          </label>
          <p className="text-xs text-ink/50">Se radica con los datos de tu afiliación (nombre, documento y correo). La respuesta te llegará al correo y la verás aquí.</p>
          <div className="flex justify-end gap-2">
            <button onClick={() => setNueva(false)} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-ink/60 hover:bg-canvas">Cancelar</button>
            <button onClick={radicar} disabled={tipo === '' || !asunto.trim() || !descripcion.trim() || enviando} className="rounded-xl bg-night px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-night-deep disabled:opacity-40">{enviando ? 'Radicando…' : 'Radicar'}</button>
          </div>
        </section>
      ) : null}

      {cargando ? (
        <div className="rounded-2xl border border-ink/[0.08] bg-white p-8 text-center text-sm text-ink/50">Cargando…</div>
      ) : error ? (
        <div className="rounded-2xl border border-ink/[0.08] bg-white p-8 text-center text-sm text-ink/60">No pudimos cargar tus PQRS. Intenta de nuevo en un momento.</div>
      ) : list.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-ink/20 bg-white px-6 py-12 text-center">
          <InboxIcon className="h-7 w-7 text-ink/25" />
          <p className="text-sm text-ink/50">No has radicado PQRS desde tu portal.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {list.map((p) => {
            const open = abierta === p.id
            return (
              <article key={p.id} className="overflow-hidden rounded-2xl border border-ink/[0.08] bg-white">
                <button onClick={() => setAbierta(open ? null : p.id)} aria-expanded={open} className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-canvas/50">
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-[11px] font-semibold text-gold">{p.radicado} · {TIPO_LABEL[p.tipo]} · {fmtFechaPqrs(p.createdAt)}</p>
                    <p className="truncate text-sm font-semibold text-ink">{p.asunto}</p>
                  </div>
                  <StatusBadge tone={tone[p.estado]}>{ESTADO_LABEL[p.estado]}</StatusBadge>
                  <ChevronDownIcon className={`h-4 w-4 shrink-0 text-ink/40 transition ${open ? 'rotate-180' : ''}`} />
                </button>
                {open ? (
                  <div className="space-y-3 border-t border-ink/[0.07] px-4 py-4 text-sm">
                    <p className="whitespace-pre-line leading-relaxed text-ink/75">{p.descripcion}</p>
                    {p.estado === 'respondida' ? (
                      <div className="rounded-xl border border-emerald-600/20 bg-emerald-50/60 p-4">
                        <p className="mb-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-emerald-800/70">Respuesta · {fmtFechaPqrs(p.respondidaAt)}</p>
                        <p className="whitespace-pre-line leading-relaxed text-ink/80">{p.respuesta}</p>
                      </div>
                    ) : p.estado === 'archivada' ? (
                      <div className="rounded-xl border border-ink/10 bg-canvas/60 p-4">
                        <p className="mb-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-ink/50">Archivada por la Junta Directiva · {fmtFechaPqrs(p.respondidaAt)}</p>
                        <p className="whitespace-pre-line leading-relaxed text-ink/75">{p.respuesta || 'Sin motivo registrado.'}</p>
                      </div>
                    ) : (
                      <p className="text-xs text-ink/50">En atención. Fecha límite de respuesta: <strong>{fmtFechaPqrs(p.venceAt)}</strong>.</p>
                    )}
                  </div>
                ) : null}
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
