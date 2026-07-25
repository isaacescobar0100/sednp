import React, { useState } from 'react'
import { CheckCheckIcon, LockIcon, MailIcon, SearchIcon, SendIcon, Trash2Icon, UsersRoundIcon } from 'lucide-react'
import { SectionTitle } from '../components/SectionTitle'
import { StatusBadge } from '../components/StatusBadge'
import { useDemo } from '../store/DemoStore'
import { useSession } from '../store/session'
import { AudienceKey, audienceLabel } from '../store/comms'

export function ComunicacionesPage() {
  const { comunicados, stats, sendComunicado, deleteComunicado } = useDemo()
  const { can } = useSession()
  const canSend = can('comms.send')

  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [audience, setAudience] = useState<AudienceKey>('todos')
  const [justSent, setJustSent] = useState(false)
  const [query, setQuery] = useState('')

  const q = query.trim().toLowerCase()
  const filteredComunicados = q === '' ? comunicados : comunicados.filter((c) => `${c.subject} ${c.audience}`.toLowerCase().includes(q))

  const recipientsFor: Record<AudienceKey, number> = {
    todos: stats.total,
    activos: stats.active,
    pendientes: stats.pending,
  }
  const recipients = recipientsFor[audience]
  const valid = subject.trim() !== '' && body.trim() !== '' && recipients > 0

  function send() {
    if (!valid) return
    sendComunicado({ subject: subject.trim(), audience: audienceLabel[audience], recipients })
    setSubject('')
    setBody('')
    setJustSent(true)
    window.setTimeout(() => setJustSent(false), 3000)
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

            {justSent ? <p className="mt-3 flex items-center gap-2 text-xs font-semibold text-emerald-700"><CheckCheckIcon className="h-4 w-4" />Comunicado enviado a {recipients} destinatario(s).</p> : null}

            <button onClick={send} disabled={!valid} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-night py-3 text-sm font-semibold text-white transition hover:bg-night-deep disabled:cursor-not-allowed disabled:opacity-35">
              <SendIcon className="h-4 w-4" />
              Enviar a {recipients} destinatario(s)
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
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por asunto o destinatarios" className="w-full rounded-xl border border-ink/10 bg-canvas/45 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-night focus:ring-4 focus:ring-night/10" />
            </label>
          </div>
          <div className="divide-y divide-ink/[0.07]">
            {filteredComunicados.map((message) => (
              <article key={message.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-night/7"><MailIcon className="h-4 w-4 text-night" /></div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold text-ink">{message.subject}</h3>
                  <p className="mt-1 text-xs text-ink/50">{message.audience} · {message.date}</p>
                </div>
                <div className="flex items-center justify-between gap-3 sm:block sm:text-right">
                  <p className="text-xs text-ink/55">{message.recipients} destinatarios</p>
                  <div className="mt-1"><StatusBadge tone={message.status === 'Entregado' ? 'positive' : 'warning'}>{message.status}</StatusBadge></div>
                </div>
                {canSend ? (
                  <button
                    onClick={() => { if (window.confirm(`¿Eliminar "${message.subject}" del historial?`)) deleteComunicado(message.id) }}
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
        </section>
      </div>
    </div>
  )
}
