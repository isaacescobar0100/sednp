import React, { useState } from 'react'
import { LockIcon, MailIcon, SearchIcon, SendIcon, Trash2Icon, UsersRoundIcon } from 'lucide-react'
import { SectionTitle } from '../components/SectionTitle'
import { StatusBadge } from '../components/StatusBadge'
import { useDemo } from '../store/DemoStore'
import { useSession } from '../store/session'
import { AudienceKey, audienceLabel } from '../store/comms'
import { enviarBoletin, plantillaCorreo } from '../store/emailApi'
import { enviarPush } from '../store/pushApi'
import { Pagination, paginate } from '../components/Pagination'
import { useConfirm } from '../components/ConfirmDialog'

const COM_PAGE = 10

export function ComunicacionesPage() {
  const { comunicados, stats, affiliates, sendComunicado, deleteComunicado, notify } = useDemo()
  const { can } = useSession()
  const confirmar = useConfirm()
  const canSend = can('comms.send')

  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [audience, setAudience] = useState<AudienceKey>('todos')
  const [porCorreo, setPorCorreo] = useState(false)
  const [porPush, setPorPush] = useState(false)
  const [enviandoCorreo, setEnviandoCorreo] = useState(false)
  // La confirmación de envío la muestra el aviso global (notify) del store, para
  // no duplicar el mensaje.
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [detalle, setDetalle] = useState<(typeof comunicados)[number] | null>(null)

  const q = query.trim().toLowerCase()
  const filteredComunicados = q === '' ? comunicados : comunicados.filter((c) => `${c.subject} ${c.audience}`.toLowerCase().includes(q))
  const pageComunicados = paginate(filteredComunicados, page, COM_PAGE)

  const recipientsFor: Record<AudienceKey, number> = {
    todos: stats.total,
    activos: stats.active,
    pendientes: stats.pending,
  }
  const recipients = recipientsFor[audience]
  const valid = subject.trim() !== '' && body.trim() !== '' && recipients > 0

  // Correos de los afiliados según la audiencia elegida.
  function correosAudiencia(): string[] {
    const pool = audience === 'activos' ? affiliates.filter((a) => a.status === 'Activo')
      : audience === 'pendientes' ? affiliates.filter((a) => a.status === 'Pendiente')
      : affiliates
    return pool.map((a) => a.email.trim()).filter((e) => e.includes('@'))
  }

  async function send() {
    if (!valid || enviandoCorreo) return
    const asunto = subject.trim()
    const mensaje = body.trim()
    sendComunicado({ subject: asunto, body: mensaje, audience: audienceLabel[audience], recipients })
    if (porCorreo) {
      const correos = correosAudiencia()
      if (correos.length === 0) { notify('No hay correos en esa audiencia para enviar el boletín.', 'warning') }
      else {
        setEnviandoCorreo(true)
        const html = plantillaCorreo(asunto, mensaje.split(/\n\s*\n/).map((p) => `<p style="margin:0 0 10px">${p.replace(/\n/g, '<br>')}</p>`).join(''))
        const r = await enviarBoletin(correos, `${asunto} — ${audienceLabel[audience]}`, html)
        setEnviandoCorreo(false)
        notify(r.ok ? `Boletín enviado por correo: ${r.sent} de ${r.total}.${r.failed ? ` (${r.failed} no llegaron${r.error ? `: ${r.error}` : ''}.)` : ''}` : `No se pudo enviar el boletín: ${r.error || ''}`, r.ok && !r.failed ? 'success' : 'warning')
      }
    }
    if (porPush) {
      const r = await enviarPush(asunto, mensaje, '/?app=1')
      notify(r.ok ? (r.total === 0 ? 'Nadie tiene notificaciones activas todavía.' : `Notificación push enviada a ${r.sent} dispositivo(s).`) : `No se pudo enviar la notificación: ${r.error || ''}`, r.ok ? 'success' : 'warning')
    }
    setSubject('')
    setBody('')
  }

  return (
    <div className="mx-auto max-w-[1440px]">
      <SectionTitle eyebrow="Relación con afiliados" title="Comunicaciones" description="Crea comunicados y consulta el historial de notificaciones institucionales." />
      <div className="grid gap-6 xl:grid-cols-5">
        {canSend ? (
          <section className="rounded-2xl border border-ink/[0.08] bg-white p-5 xl:col-span-2">
            <div className="mb-5">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gold">Nuevo comunicado</p>
              <h2 className="mt-1 font-display text-lg font-semibold">Redactar mensaje</h2>
            </div>

            <label className="block text-xs font-semibold text-ink/70">
              Destinatarios
              <div className="mt-1.5 flex items-center gap-2 rounded-xl border border-ink/12 bg-canvas/45 px-3 py-2.5 text-sm font-normal text-ink/65">
                <UsersRoundIcon className="h-4 w-4 shrink-0 text-gold" />
                <select value={audience} onChange={(e) => setAudience(e.target.value as AudienceKey)} className="w-full bg-transparent outline-none">
                  {(Object.keys(audienceLabel) as AudienceKey[]).map((key) => (
                    <option key={key} value={key}>{audienceLabel[key]} · {recipientsFor[key]}</option>
                  ))}
                </select>
              </div>
            </label>

            <label className="mt-4 block text-xs font-semibold text-ink/70">
              Asunto
              <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Ej. Convocatoria a asamblea" className="mt-1.5 w-full rounded-xl border border-ink/12 bg-canvas/45 px-3 py-2.5 text-sm font-normal outline-none focus:border-night focus:ring-4 focus:ring-night/10" />
            </label>

            <label className="mt-4 block text-xs font-semibold text-ink/70">
              Mensaje
              <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Redacta el contenido de tu comunicado..." className="mt-1.5 h-36 w-full resize-none rounded-xl border border-ink/12 bg-canvas/45 px-3 py-2.5 text-sm font-normal outline-none focus:border-night focus:ring-4 focus:ring-night/10" />
            </label>

            <label className="mt-4 flex items-start gap-2 rounded-xl border border-ink/10 bg-canvas/40 px-3 py-2.5">
              <input type="checkbox" checked={porCorreo} onChange={(e) => setPorCorreo(e.target.checked)} className="mt-0.5 h-4 w-4 accent-night" />
              <span className="text-xs text-ink/70">Enviar también por <strong>correo electrónico</strong> a la audiencia. <span className="text-ink/45">(Marca esta casilla para que salga por correo; si no, el comunicado solo se publica dentro del sistema.)</span></span>
            </label>
            <label className="mt-2 flex items-start gap-2 rounded-xl border border-ink/10 bg-canvas/40 px-3 py-2.5">
              <input type="checkbox" checked={porPush} onChange={(e) => setPorPush(e.target.checked)} className="mt-0.5 h-4 w-4 accent-night" />
              <span className="text-xs text-ink/70">Enviar también como <strong>notificación push</strong> a quienes la tengan activada.</span>
            </label>

            <button onClick={send} disabled={!valid || enviandoCorreo} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-night py-3 text-sm font-semibold text-white transition hover:bg-night-deep disabled:cursor-not-allowed disabled:opacity-35">
              <SendIcon className="h-4 w-4" />
              {enviandoCorreo ? 'Enviando…' : `Enviar a ${recipients} destinatario(s)`}
            </button>
          </section>
        ) : (
          <section className="flex flex-col items-start gap-3 rounded-2xl border border-ink/[0.08] bg-white p-5 xl:col-span-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-canvas"><LockIcon className="h-4 w-4 text-gold" /></div>
            <p className="text-sm text-ink/60">El envío de comunicados está reservado a Secretaría General y Presidencia. Aquí puedes consultar el historial.</p>
          </section>
        )}

        <section className="overflow-hidden rounded-2xl border border-ink/[0.08] bg-white xl:col-span-3">
          <div className="border-b border-ink/[0.07] px-5 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-base font-semibold">Notificaciones enviadas</h2>
                <p className="mt-1 text-xs text-ink/50">{comunicados.length} comunicaciones en el historial</p>
              </div>
              <MailIcon className="h-5 w-5 text-gold" />
            </div>
            <label className="relative mt-3 block">
              <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/40" />
              <input value={query} onChange={(e) => { setQuery(e.target.value); setPage(1) }} placeholder="Buscar por asunto o destinatarios" className="w-full rounded-xl border border-ink/10 bg-canvas/45 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-night focus:ring-4 focus:ring-night/10" />
            </label>
          </div>
          <div className="divide-y divide-ink/[0.07]">
            {pageComunicados.map((message) => (
              <article key={message.id} onClick={() => setDetalle(message)} className="flex cursor-pointer flex-col gap-3 px-5 py-4 transition hover:bg-canvas/50 sm:flex-row sm:items-center" role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter') setDetalle(message) }}>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-night/7"><MailIcon className="h-4 w-4 text-night" /></div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold text-ink">{message.subject}</h3>
                  {message.body ? <p className="mt-0.5 line-clamp-2 text-xs text-ink/60">{message.body}</p> : null}
                  <p className="mt-1 text-xs text-ink/50">{message.audience} · {message.date}</p>
                </div>
                <div className="flex items-center justify-between gap-3 sm:block sm:text-right">
                  <p className="text-xs text-ink/55">{message.recipients} destinatarios</p>
                  <div className="mt-1"><StatusBadge tone={message.status === 'Entregado' ? 'positive' : 'warning'}>{message.status}</StatusBadge></div>
                </div>
                {canSend ? (
                  <button
                    onClick={async (e) => { e.stopPropagation(); if (await confirmar({ title: 'Eliminar comunicado', message: `¿Eliminar "${message.subject}" del historial?`, confirmText: 'Eliminar', tone: 'peligro' })) deleteComunicado(message.id) }}
                    className="shrink-0 rounded-lg p-1.5 text-ink/40 transition hover:bg-brick/10 hover:text-brick"
                    aria-label={`Eliminar ${message.subject}`}
                  >
                    <Trash2Icon className="h-4 w-4" />
                  </button>
                ) : null}
              </article>
            ))}
            {filteredComunicados.length === 0 ? <p className="px-5 py-10 text-center text-sm text-ink/45">{comunicados.length === 0 ? 'Aún no hay comunicados.' : 'No hay comunicados que coincidan.'}</p> : null}
          </div>
          <Pagination page={page} size={COM_PAGE} total={filteredComunicados.length} onPage={setPage} />
        </section>
      </div>

      {detalle ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4" onClick={() => setDetalle(null)}>
          <div className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3 border-b border-ink/[0.08] px-6 py-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-night/7"><MailIcon className="h-4 w-4 text-night" /></div>
                  <StatusBadge tone={detalle.status === 'Entregado' ? 'positive' : 'warning'}>{detalle.status}</StatusBadge>
                </div>
                <h3 className="mt-2 font-display text-base font-semibold text-ink">{detalle.subject}</h3>
                <p className="mt-0.5 text-xs text-ink/50">{detalle.audience} · {detalle.date} · {detalle.recipients} destinatarios</p>
              </div>
              <button onClick={() => setDetalle(null)} aria-label="Cerrar" className="shrink-0 rounded-lg p-1.5 text-ink/40 transition hover:bg-canvas hover:text-ink">✕</button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
              <p className="whitespace-pre-line text-sm leading-relaxed text-ink/80">{detalle.body || 'Sin contenido.'}</p>
            </div>
            <div className="flex justify-end border-t border-ink/[0.08] px-6 py-3">
              <button onClick={() => setDetalle(null)} className="rounded-xl bg-night px-4 py-2 text-sm font-semibold text-white transition hover:bg-night-deep">Cerrar</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
