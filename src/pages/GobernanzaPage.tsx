import React, { useState } from 'react'
import { CalendarDaysIcon, CheckCircle2Icon, FileTextIcon, LockIcon, PlusIcon, Trash2Icon, UsersIcon, XIcon } from 'lucide-react'
import { SectionTitle } from '../components/SectionTitle'
import { StatusBadge } from '../components/StatusBadge'
import { useDemo } from '../store/DemoStore'
import { useSession } from '../store/session'
import { Ballot, GovSession, dayMonthFromISO, formatTime, longDateLabel, meetingPlaces, totalVotes, votePct } from '../store/governance'

type VoteChoice = 'favor' | 'contra' | 'abstencion'

export function GobernanzaPage() {
  const { sessions, ballots, deleteSession } = useDemo()
  const { can } = useSession()
  const [showSchedule, setShowSchedule] = useState(false)
  const [minutesFor, setMinutesFor] = useState<GovSession | null>(null)

  const upcoming = sessions.filter((s) => s.status === 'Programada')
  const lastMinutes = sessions.find((s) => s.status === 'Realizada' && s.minutes)

  return (
    <div className="mx-auto max-w-[1440px]">
      <SectionTitle
        eyebrow="Órganos directivos"
        title="Gobernanza"
        description="Agenda, actas y decisiones de la organización sindical."
        action={
          can('governance.manage') ? (
            <button onClick={() => setShowSchedule(true)} className="inline-flex items-center gap-2 rounded-xl bg-night px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-night/15 transition hover:bg-night-deep">
              <PlusIcon className="h-4 w-4" />
              Agendar sesión
            </button>
          ) : null
        }
      />

      <div className="grid gap-6 xl:grid-cols-3">
        <section className="rounded-2xl border border-ink/[0.08] bg-white p-5 xl:col-span-2">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="font-display text-base font-semibold">Próximas sesiones</h2>
              <p className="mt-1 text-xs text-ink/50">{upcoming.length} programada(s)</p>
            </div>
            <CalendarDaysIcon className="h-5 w-5 text-gold" />
          </div>
          <div className="space-y-3">
            {upcoming.map((s) => (
              <article key={s.id} className="flex flex-col gap-3 rounded-xl border border-ink/[0.07] p-4 sm:flex-row sm:items-center">
                <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-night text-white">
                  <span className="font-display text-lg font-semibold leading-none">{s.day}</span>
                  <span className="mt-0.5 text-[9px] font-bold tracking-wider text-gold">{s.month}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold text-ink">{s.title}</h3>
                  <p className="mt-1 text-xs text-ink/50">{s.detail}</p>
                </div>
                {can('governance.manage') ? (
                  <div className="flex shrink-0 items-center gap-1.5">
                    <button onClick={() => setMinutesFor(s)} className="rounded-lg border border-ink/12 px-3 py-2 text-xs font-semibold text-night transition hover:bg-canvas">
                      Registrar acta
                    </button>
                    <button onClick={() => { if (window.confirm(`¿Eliminar la sesión "${s.title}"?`)) deleteSession(s.id, s.title) }} className="rounded-lg p-2 text-ink/40 transition hover:bg-brick/10 hover:text-brick" aria-label={`Eliminar ${s.title}`}><Trash2Icon className="h-4 w-4" /></button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 rounded-lg bg-canvas px-3 py-2 text-xs text-ink/60"><UsersIcon className="h-3.5 w-3.5 text-gold" />{s.organ}</div>
                )}
              </article>
            ))}
            {upcoming.length === 0 ? <p className="rounded-xl bg-canvas/60 px-4 py-8 text-center text-sm text-ink/45">No hay sesiones programadas.</p> : null}
          </div>
        </section>

        <section className="rounded-2xl bg-night p-5 text-white">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gold/18"><FileTextIcon className="h-4 w-4 text-gold" /></div>
          <p className="mt-6 text-xs font-semibold uppercase tracking-[0.14em] text-gold">Última acta publicada</p>
          {lastMinutes ? (
            <>
              <h2 className="mt-2 font-display text-lg font-semibold leading-snug">{lastMinutes.title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-white/62">{lastMinutes.minutes}</p>
              <div className="mt-6 flex items-center justify-between">
                <span className="text-xs text-white/50">{lastMinutes.day} {lastMinutes.month} · {lastMinutes.organ}</span>
                <span className="rounded-lg bg-white/10 px-3 py-2 text-xs font-semibold text-white">Publicada</span>
              </div>
            </>
          ) : (
            <p className="mt-3 text-sm leading-relaxed text-white/62">Aún no hay actas publicadas. Registra el acta de una sesión para verla aquí.</p>
          )}
        </section>
      </div>

      <div className="mt-8">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-base font-semibold">Votaciones</h2>
            <p className="mt-1 text-xs text-ink/50">Consultas y decisiones sometidas a voto</p>
          </div>
          {can('governance.manage') ? <OpenBallotButton /> : null}
        </div>
        <div className="space-y-6">
          {ballots.map((b) => <BallotCard key={b.id} ballot={b} />)}
        </div>
      </div>

      {showSchedule ? <ScheduleModal onClose={() => setShowSchedule(false)} /> : null}
      {minutesFor ? <MinutesModal session={minutesFor} onClose={() => setMinutesFor(null)} /> : null}
    </div>
  )
}

function BallotCard({ ballot }: { ballot: Ballot }) {
  const { castVote, closeBallot, deleteBallot, notify } = useDemo()
  const { role, can } = useSession()
  const [votedKeys, setVotedKeys] = useState<Set<string>>(new Set())
  const total = totalVotes(ballot)
  const open = ballot.status === 'En curso'
  const myKey = `${role}:${ballot.id}`
  const alreadyVoted = votedKeys.has(myKey)

  function vote(choice: VoteChoice) {
    if (!open || alreadyVoted) return
    castVote(ballot.id, choice)
    setVotedKeys((prev) => new Set(prev).add(myKey))
    notify('Voto registrado.', 'success')
  }
  function close() {
    closeBallot(ballot.id)
    notify(`Votación cerrada: ${ballot.favor > ballot.contra ? 'Aprobada' : 'Rechazada'}.`, ballot.favor > ballot.contra ? 'success' : 'warning')
  }

  const options: Array<[VoteChoice, string]> = [['favor', 'A favor'], ['contra', 'En contra'], ['abstencion', 'Abstenerme']]

  return (
    <section className="rounded-2xl border border-ink/[0.08] bg-white p-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gold">{open ? 'Votación en curso' : 'Votación cerrada'}</p>
          <h2 className="mt-1 font-display text-lg font-semibold">{ballot.title}</h2>
          <p className="mt-1 text-sm text-ink/50">{open ? `Cierre de votación: ${ballot.closesAt}` : 'Votación finalizada'}</p>
        </div>
        <div className="flex items-center gap-2">
          {ballot.outcome ? (
            <StatusBadge tone={ballot.outcome === 'Aprobada' ? 'positive' : 'negative'}>{ballot.outcome}</StatusBadge>
          ) : alreadyVoted ? (
            <StatusBadge tone="positive">Voto registrado</StatusBadge>
          ) : (
            <span className="text-xs text-ink/45">{total} votos emitidos</span>
          )}
          {can('governance.manage') ? (
            <button onClick={() => { if (window.confirm(`¿Eliminar la votación "${ballot.title}"?`)) deleteBallot(ballot.id, ballot.title) }} className="rounded-lg p-1.5 text-ink/40 transition hover:bg-brick/10 hover:text-brick" aria-label={`Eliminar ${ballot.title}`}><Trash2Icon className="h-4 w-4" /></button>
          ) : null}
        </div>
      </div>

      <div className="mt-7 space-y-4">
        <VoteBar label="A favor" value={votePct(ballot.favor, total)} count={ballot.favor} color="bg-night" />
        <VoteBar label="En contra" value={votePct(ballot.contra, total)} count={ballot.contra} color="bg-brick" />
        <VoteBar label="Abstención" value={votePct(ballot.abstencion, total)} count={ballot.abstencion} color="bg-gold" />
      </div>

      {open ? (
        <div className="mt-7 border-t border-ink/[0.07] pt-5">
          <div className="flex flex-wrap items-center gap-2">
            {options.map(([key, label]) => (
              <button
                key={key}
                onClick={() => vote(key)}
                disabled={alreadyVoted}
                className={`rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${alreadyVoted ? 'cursor-default border-ink/10 text-ink/35' : 'border-ink/12 text-night hover:border-night hover:bg-night/5'}`}
              >
                {label}
              </button>
            ))}
            <span className="ml-auto flex items-center gap-2">
              {can('governance.close') ? (
                <button onClick={close} className="rounded-xl bg-night px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-night-deep">Cerrar votación</button>
              ) : (
                <span className="flex items-center gap-1.5 text-xs text-ink/45" title="Solo Presidencia cierra la votación."><LockIcon className="h-3.5 w-3.5" />Cierre: Presidencia</span>
              )}
            </span>
          </div>
          {alreadyVoted ? <p className="mt-2 flex items-center gap-1.5 text-xs text-emerald-700"><CheckCircle2Icon className="h-3.5 w-3.5" />Ya votaste en esta consulta.</p> : null}
        </div>
      ) : null}
    </section>
  )
}

function OpenBallotButton() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button onClick={() => setOpen(true)} className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-night px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-night/15 transition hover:bg-night-deep">
        <PlusIcon className="h-4 w-4" />
        Abrir votación
      </button>
      {open ? <BallotModal onClose={() => setOpen(false)} /> : null}
    </>
  )
}

function VoteBar({ label, value, count, color }: { label: string; value: number; count: number; color: string }) {
  return (
    <div>
      <div className="mb-1.5 flex justify-between text-xs">
        <span className="font-semibold text-ink/70">{label}</span>
        <span className="text-ink/55">{value}% · {count} votos</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-canvas">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  )
}

function ScheduleModal({ onClose }: { onClose: () => void }) {
  const { addSession } = useDemo()
  const [title, setTitle] = useState('')
  const [organ, setOrgan] = useState('Junta Directiva')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('09:00')
  const [place, setPlace] = useState(meetingPlaces[0])

  const valid = title.trim() !== '' && /^\d{4}-\d{2}-\d{2}$/.test(date)

  function submit() {
    if (!valid) return
    const { day, month } = dayMonthFromISO(date)
    const detail = [formatTime(time), place].filter(Boolean).join(' · ')
    addSession({ day, month, title: title.trim(), detail: detail || 'Por confirmar', organ })
    onClose()
  }

  return (
    <ModalShell eyebrow="Gobernanza" title="Agendar sesión" onClose={onClose}>
      <div className="space-y-4">
        <ModalField label="Título" required><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Junta Directiva Ordinaria" className={inputClass} /></ModalField>
        <ModalField label="Órgano">
          <select value={organ} onChange={(e) => setOrgan(e.target.value)} className={inputClass}>
            {['Junta Directiva', 'Asamblea', 'Comité'].map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </ModalField>
        <div className="grid grid-cols-2 gap-3">
          <ModalField label="Fecha" required><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} /></ModalField>
          <ModalField label="Hora"><input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={inputClass} /></ModalField>
        </div>
        <ModalField label="Lugar">
          <select value={place} onChange={(e) => setPlace(e.target.value)} className={inputClass}>
            {meetingPlaces.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </ModalField>
      </div>
      <ModalActions onClose={onClose} onSubmit={submit} disabled={!valid} label="Agendar sesión" />
    </ModalShell>
  )
}

function MinutesModal({ session, onClose }: { session: GovSession; onClose: () => void }) {
  const { publishMinutes } = useDemo()
  const [minutes, setMinutes] = useState('')
  const valid = minutes.trim() !== ''

  function submit() {
    if (!valid) return
    publishMinutes(session.id, minutes.trim())
    onClose()
  }

  return (
    <ModalShell eyebrow="Acta de sesión" title={session.title} onClose={onClose}>
      <p className="-mt-1 mb-4 text-sm text-ink/50">La sesión quedará marcada como <strong>Realizada</strong> y el acta se publicará.</p>
      <ModalField label="Resumen del acta" required>
        <textarea value={minutes} onChange={(e) => setMinutes(e.target.value)} rows={4} placeholder="Decisiones y acuerdos de la sesión…" className={`${inputClass} resize-none`} />
      </ModalField>
      <ModalActions onClose={onClose} onSubmit={submit} disabled={!valid} label="Publicar acta" />
    </ModalShell>
  )
}

function BallotModal({ onClose }: { onClose: () => void }) {
  const { addBallot } = useDemo()
  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('17:00')
  const valid = title.trim() !== ''

  function submit() {
    if (!valid) return
    const closesAt = date ? [longDateLabel(date), formatTime(time)].filter(Boolean).join(' · ') : 'Sin fecha de cierre'
    addBallot({ title: title.trim(), closesAt })
    onClose()
  }

  return (
    <ModalShell eyebrow="Gobernanza" title="Abrir votación" onClose={onClose}>
      <div className="space-y-4">
        <ModalField label="Asunto a votar" required><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Aprobación del plan de formación" className={inputClass} /></ModalField>
        <div className="grid grid-cols-2 gap-3">
          <ModalField label="Fecha de cierre"><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} /></ModalField>
          <ModalField label="Hora de cierre"><input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={inputClass} /></ModalField>
        </div>
      </div>
      <ModalActions onClose={onClose} onSubmit={submit} disabled={!valid} label="Abrir votación" />
    </ModalShell>
  )
}

const inputClass = 'w-full rounded-xl border border-ink/12 bg-canvas/45 px-3 py-2.5 text-sm outline-none focus:border-night focus:ring-4 focus:ring-night/10'

function ModalShell({ eyebrow, title, onClose, children }: { eyebrow: string; title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-night/45 p-4">
      <section role="dialog" aria-modal="true" className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gold">{eyebrow}</p>
            <h2 className="mt-1 font-display text-xl font-semibold leading-snug">{title}</h2>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-ink/50 hover:bg-canvas" aria-label="Cerrar"><XIcon className="h-5 w-5" /></button>
        </div>
        {children}
      </section>
    </div>
  )
}

function ModalField({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-ink/70">{label}{required ? <span className="text-brick"> *</span> : null}</span>
      {children}
    </label>
  )
}

function ModalActions({ onClose, onSubmit, disabled, label }: { onClose: () => void; onSubmit: () => void; disabled: boolean; label: string }) {
  return (
    <div className="mt-6 flex justify-end gap-2">
      <button onClick={onClose} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-ink/60 hover:bg-canvas">Cancelar</button>
      <button onClick={onSubmit} disabled={disabled} className="rounded-xl bg-night px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-night-deep disabled:opacity-40">{label}</button>
    </div>
  )
}
