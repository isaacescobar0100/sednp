import React, { useState } from 'react'
import { CheckCircle2Icon, Clock3Icon, EyeIcon, LockIcon, PlusIcon, SearchIcon, Trash2Icon, XIcon } from 'lucide-react'
import { SectionTitle } from '../components/SectionTitle'
import { StatusBadge } from '../components/StatusBadge'
import { useDemo } from '../store/DemoStore'
import { useSession } from '../store/session'
import { CaseStatus, DisciplineCase, Sancion, stages, termTone } from '../store/discipline'

const statusTone: Record<CaseStatus, 'positive' | 'warning' | 'negative' | 'neutral' | 'night'> = {
  'En trámite': 'night',
  'Con fallo': 'neutral',
  Archivado: 'neutral',
}

const sancionTone: Record<Sancion, 'positive' | 'warning' | 'negative'> = {
  Amonestación: 'warning',
  Multa: 'warning',
  Exclusión: 'negative',
  Absuelto: 'positive',
}

export function DisciplinarioPage() {
  const { cases } = useDemo()
  const { can } = useSession()
  const [selectedId, setSelectedId] = useState<string | null>(cases[0]?.id ?? null)
  const [showOpen, setShowOpen] = useState(false)
  const [query, setQuery] = useState('')

  const q = query.trim().toLowerCase()
  const filtered = q === '' ? cases : cases.filter((c) => `${c.code} ${c.subject} ${c.person}`.toLowerCase().includes(q))
  const selected = cases.find((c) => c.id === selectedId) ?? filtered[0] ?? cases[0] ?? null
  const activeCount = cases.filter((c) => c.status === 'En trámite').length

  return (
    <div className="mx-auto max-w-[1440px]">
      <SectionTitle
        eyebrow="Garantías y control"
        title="Disciplinario"
        description="Seguimiento reservado de expedientes y términos procesales."
        action={
          can('discipline.instruct') ? (
            <button onClick={() => setShowOpen(true)} className="inline-flex items-center gap-2 rounded-xl bg-night px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-night/15 transition hover:bg-night-deep">
              <PlusIcon className="h-4 w-4" />
              Abrir expediente
            </button>
          ) : null
        }
      />

      <div className="grid gap-6 xl:grid-cols-5">
        <section className="overflow-hidden rounded-2xl border border-ink/[0.08] bg-white xl:col-span-3">
          <div className="border-b border-ink/[0.07] px-5 py-4">
            <h2 className="font-display text-base font-semibold">Expedientes</h2>
            <p className="mt-1 text-xs text-ink/50">{activeCount} en trámite · {cases.length} en total</p>
            <label className="relative mt-3 block">
              <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/40" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por código, asunto o involucrado" className="w-full rounded-xl border border-ink/10 bg-canvas/45 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-night focus:ring-4 focus:ring-night/10" />
            </label>
          </div>
          <div className="divide-y divide-ink/[0.07]">
            {filtered.map((item) => (
              <button
                onClick={() => setSelectedId(item.id)}
                key={item.id}
                className={`flex w-full items-center gap-4 px-5 py-4 text-left transition ${selected?.id === item.id ? 'bg-night/[0.035]' : 'hover:bg-canvas/55'}`}
              >
                <span className={`h-3 w-3 shrink-0 rounded-full ${item.status !== 'En trámite' ? 'bg-ink/25' : termTone(item.daysLeft) === 'negative' ? 'bg-brick' : termTone(item.daysLeft) === 'warning' ? 'bg-amber-500' : 'bg-emerald-600'}`} />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold tracking-wide text-ink/45">{item.code}</p>
                  <h3 className="mt-1 truncate text-sm font-semibold text-ink">{item.subject}</h3>
                  <p className="mt-1 text-xs text-ink/50">{stages[item.stageIndex]} · {item.person}</p>
                </div>
                <div className="text-right">
                  {item.status === 'En trámite' ? (
                    <>
                      <StatusBadge tone={termTone(item.daysLeft)}>{item.daysLeft} días</StatusBadge>
                      <p className="mt-1.5 text-[11px] text-ink/45">plazo restante</p>
                    </>
                  ) : item.status === 'Con fallo' && item.sancion ? (
                    <StatusBadge tone={sancionTone[item.sancion]}>{item.sancion}</StatusBadge>
                  ) : (
                    <StatusBadge tone={statusTone[item.status]}>{item.status}</StatusBadge>
                  )}
                </div>
              </button>
            ))}
            {filtered.length === 0 ? <p className="px-5 py-10 text-center text-sm text-ink/45">No hay expedientes que coincidan.</p> : null}
          </div>
        </section>

        <section className="rounded-2xl border border-ink/[0.08] bg-white p-5 xl:col-span-2">
          {selected ? <CaseDetail key={selected.id} caseItem={selected} /> : <p className="text-sm text-ink/50">No hay expedientes.</p>}
        </section>
      </div>

      {showOpen ? <OpenCaseModal onClose={() => setShowOpen(false)} /> : null}
    </div>
  )
}

function CaseDetail({ caseItem }: { caseItem: DisciplineCase }) {
  const { advanceCase, ruleCase, deleteCase, notify } = useDemo()
  const { can } = useSession()
  const canInstruct = can('discipline.instruct')
  const canRule = can('discipline.rule')
  const open = caseItem.status === 'En trámite'
  const atTraslado = caseItem.stageIndex === stages.length - 1

  function advance() {
    const next = stages[caseItem.stageIndex + 1]
    advanceCase(caseItem.id)
    notify(`${caseItem.code} avanzó a ${next}.`, 'success')
  }
  function rule(resultado: Sancion | 'Archivado') {
    ruleCase(caseItem.id, resultado)
    notify(`${caseItem.code}: ${resultado === 'Archivado' ? 'archivado' : resultado.toLowerCase()}.`, resultado === 'Absuelto' ? 'success' : 'warning')
  }
  function remove() {
    if (window.confirm(`¿Eliminar el expediente ${caseItem.code}?`)) deleteCase(caseItem.id, caseItem.code)
  }

  return (
    <div>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-bold tracking-wide text-gold">{caseItem.code}</p>
          <h2 className="mt-1 font-display text-base font-semibold leading-snug">{caseItem.subject}</h2>
          <p className="mt-1 text-xs text-ink/50">Abierto el {caseItem.openedDate} · {caseItem.person}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {canInstruct || canRule ? (
            <button onClick={remove} className="rounded-lg p-1.5 text-ink/40 transition hover:bg-brick/10 hover:text-brick" aria-label={`Eliminar ${caseItem.code}`}><Trash2Icon className="h-4 w-4" /></button>
          ) : null}
          <EyeIcon className="h-5 w-5 text-ink/35" />
        </div>
      </div>

      <div className="mt-6 border-l border-ink/12 pl-5">
        {stages.map((step, index) => {
          const done = index < caseItem.stageIndex || !open
          const current = index === caseItem.stageIndex && open
          return (
            <div key={step} className="relative pb-7 last:pb-0">
              <span className={`absolute -left-[27px] top-0 flex h-3 w-3 items-center justify-center rounded-full ${done ? 'bg-emerald-600' : current ? 'bg-gold ring-4 ring-gold/20' : 'bg-ink/15'}`}>
                {done ? <CheckCircle2Icon className="h-2.5 w-2.5 text-white" /> : null}
              </span>
              <p className={`text-sm font-semibold ${current ? 'text-night' : 'text-ink/55'}`}>{step}</p>
              <p className="mt-1 text-xs text-ink/45">{done ? 'Etapa completada' : current ? 'Etapa actual del proceso' : 'Pendiente de iniciar'}</p>
            </div>
          )
        })}
      </div>

      {open ? (
        <>
          <div className={`mt-6 flex items-center gap-2 rounded-xl p-3 text-xs ${termTone(caseItem.daysLeft) === 'negative' ? 'bg-brick/8 text-brick' : 'bg-canvas text-ink/65'}`}>
            <Clock3Icon className="h-4 w-4 text-gold" />
            <span>Término procesal vence en <strong>{caseItem.daysLeft} días</strong></span>
          </div>

          <div className="mt-4 space-y-2">
            {canInstruct && !atTraslado ? (
              <button onClick={advance} className="w-full rounded-xl bg-night px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-night-deep">
                Avanzar a {stages[caseItem.stageIndex + 1]}
              </button>
            ) : null}

            {canRule && atTraslado ? (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-ink/60">Fallo de la Junta Directiva (Art. 45):</p>
                <div className="grid grid-cols-3 gap-2">
                  <button onClick={() => rule('Amonestación')} className="rounded-xl bg-amber-500 px-3 py-2.5 text-sm font-semibold text-white transition hover:brightness-95">Amonestar</button>
                  <button onClick={() => rule('Multa')} className="rounded-xl bg-amber-600 px-3 py-2.5 text-sm font-semibold text-white transition hover:brightness-95">Multar</button>
                  <button onClick={() => rule('Exclusión')} className="rounded-xl bg-brick px-3 py-2.5 text-sm font-semibold text-white transition hover:brightness-95">Excluir</button>
                </div>
                <button onClick={() => rule('Absuelto')} className="w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-95">Absolver</button>
              </div>
            ) : null}

            {canRule ? (
              <button onClick={() => rule('Archivado')} className="w-full rounded-xl border border-ink/12 px-4 py-2.5 text-sm font-semibold text-ink/70 transition hover:bg-canvas">
                Archivar expediente
              </button>
            ) : null}

            {canInstruct && atTraslado ? (
              <p className="flex items-start gap-2 rounded-xl bg-canvas px-3 py-2.5 text-xs text-ink/60"><LockIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold" />Instrucción completa. El <strong>fallo</strong> lo profiere la Junta Directiva.</p>
            ) : null}
            {canRule && !atTraslado ? (
              <p className="flex items-start gap-2 rounded-xl bg-canvas px-3 py-2.5 text-xs text-ink/60"><LockIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold" />El Comité de Quejas y Reclamos debe instruir hasta el <strong>Traslado a Junta Directiva</strong> antes del fallo.</p>
            ) : null}
            {!canInstruct && !canRule ? (
              <p className="flex items-start gap-2 rounded-xl bg-canvas px-3 py-2.5 text-xs text-ink/60"><LockIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold" />Vista de solo lectura para tu rol.</p>
            ) : null}
          </div>
        </>
      ) : (
        <div className="mt-6 rounded-xl border border-ink/[0.08] bg-canvas/50 p-4 text-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-ink/40">Resultado</p>
          <div className="mt-2">
            {caseItem.status === 'Archivado' ? (
              <StatusBadge tone="neutral">Expediente archivado</StatusBadge>
            ) : caseItem.sancion ? (
              <StatusBadge tone={sancionTone[caseItem.sancion]}>Fallo: {caseItem.sancion}</StatusBadge>
            ) : (
              <StatusBadge tone="neutral">{caseItem.status}</StatusBadge>
            )}
          </div>
          {caseItem.sancion && caseItem.sancion !== 'Absuelto' ? <p className="mt-2 text-xs text-ink/50">Contra el fallo procede reposición ante la Junta Directiva y apelación ante la Asamblea General (Art. 57).</p> : null}
        </div>
      )}
    </div>
  )
}

function OpenCaseModal({ onClose }: { onClose: () => void }) {
  const { addCase, affiliates } = useDemo()
  const [subject, setSubject] = useState('')
  const [person, setPerson] = useState('')
  const [daysText, setDaysText] = useState('30')

  const days = Number(daysText.replace(/\D/g, ''))
  const valid = subject.trim() !== '' && days > 0

  function submit() {
    if (!valid) return
    addCase({ subject: subject.trim(), person: person.trim(), daysLeft: days })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-night/45 p-4">
      <section role="dialog" aria-modal="true" className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gold">Disciplinario</p>
            <h2 className="mt-1 font-display text-xl font-semibold">Abrir expediente</h2>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-ink/50 hover:bg-canvas" aria-label="Cerrar"><XIcon className="h-5 w-5" /></button>
        </div>
        <p className="mt-1 text-sm text-ink/50">El expediente iniciará en etapa de <strong>Apertura</strong>, en trámite.</p>

        <div className="mt-5 space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-ink/70">Asunto <span className="text-brick">*</span></span>
            <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Motivo del expediente" className="w-full rounded-xl border border-ink/12 bg-canvas/45 px-3 py-2.5 text-sm outline-none focus:border-night focus:ring-4 focus:ring-night/10" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-ink/70">Involucrado (afiliado)</span>
            {affiliates.length > 0 ? (
              <select value={person} onChange={(e) => setPerson(e.target.value)} className="w-full rounded-xl border border-ink/12 bg-canvas/45 px-3 py-2.5 text-sm outline-none focus:border-night focus:ring-4 focus:ring-night/10">
                <option value="">Seleccionar afiliado…</option>
                {affiliates.map((a) => <option key={a.id} value={a.name}>{a.name} · {a.doc}</option>)}
              </select>
            ) : (
              <p className="rounded-xl border border-ink/12 bg-canvas/45 px-3 py-2.5 text-xs text-ink/50">No hay afiliados registrados. Créalos en el módulo <strong>Afiliación</strong> para poder elegir al involucrado.</p>
            )}
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-ink/70">Término procesal (días) <span className="text-brick">*</span></span>
            <input value={daysText} onChange={(e) => setDaysText(e.target.value)} inputMode="numeric" placeholder="30" className="w-full rounded-xl border border-ink/12 bg-canvas/45 px-3 py-2.5 text-sm outline-none focus:border-night focus:ring-4 focus:ring-night/10" />
          </label>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-ink/60 hover:bg-canvas">Cancelar</button>
          <button onClick={submit} disabled={!valid} className="rounded-xl bg-night px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-night-deep disabled:opacity-40">Abrir expediente</button>
        </div>
      </section>
    </div>
  )
}
