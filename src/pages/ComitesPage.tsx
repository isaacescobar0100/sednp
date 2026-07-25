import React, { useState } from 'react'
import { CalendarDaysIcon, PencilIcon, PlusIcon, Trash2Icon, UserRoundIcon, UsersRoundIcon, XIcon } from 'lucide-react'
import { SectionTitle } from '../components/SectionTitle'
import { useDemo } from '../store/DemoStore'
import { useSession } from '../store/session'
import { Committee, memberCount } from '../store/committees'
import { dayMonthFromISO, meetingPlaces } from '../store/governance'

export function ComitesPage() {
  const { committees, stats } = useDemo()
  const { can } = useSession()
  const canManage = can('committees.manage')
  const [formFor, setFormFor] = useState<Committee | 'new' | null>(null)

  const totalMembers = committees.reduce((acc, c) => acc + memberCount(c), 0)
  const pct = stats.active > 0 ? Math.round((totalMembers / stats.active) * 100) : 0

  return (
    <div className="mx-auto max-w-[1440px]">
      <SectionTitle
        eyebrow="Trabajo colaborativo"
        title="Comités"
        description="Espacios de participación para la gestión y bienestar de las y los afiliados."
        action={
          canManage ? (
            <button onClick={() => setFormFor('new')} className="inline-flex items-center gap-2 rounded-xl bg-night px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-night/15 transition hover:bg-night-deep">
              <PlusIcon className="h-4 w-4" />
              Crear comité
            </button>
          ) : null
        }
      />

      {committees.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-ink/20 bg-white px-6 py-12 text-center text-sm text-ink/50">
          Aún no hay comités. {canManage ? 'Crea el primero con el botón "Crear comité".' : ''}
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {committees.map((committee) => <CommitteeCard key={committee.id} committee={committee} canManage={canManage} onEdit={() => setFormFor(committee)} />)}
        </div>
      )}

      <section className="mt-6 rounded-2xl bg-night px-6 py-6 text-white">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gold">Participación activa</p>
        <h2 className="mt-1 font-display text-xl font-semibold">{totalMembers} afiliados aportan desde los comités</h2>
        <p className="mt-2 text-sm text-white/60">El {pct}% de la base activa participa en al menos un espacio de trabajo · {committees.length} comités.</p>
      </section>

      {formFor ? <CommitteeForm committee={formFor === 'new' ? undefined : formFor} onClose={() => setFormFor(null)} /> : null}
    </div>
  )
}

function CommitteeCard({ committee, canManage, onEdit }: { committee: Committee; canManage: boolean; onEdit: () => void }) {
  const { deleteCommittee } = useDemo()
  const count = memberCount(committee)
  const members = Array.isArray(committee.members) ? committee.members : []

  function handleDelete() {
    if (window.confirm(`¿Eliminar el comité "${committee.name}"?`)) deleteCommittee(committee.id, committee.name)
  }

  return (
    <article className="overflow-hidden rounded-2xl border border-ink/[0.08] bg-white shadow-[0_6px_22px_rgba(15,27,61,0.04)]">
      <div className={`h-1.5 ${committee.color}`} />
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-canvas text-night"><UsersRoundIcon className="h-5 w-5" /></div>
          {canManage ? (
            <div className="flex gap-1">
              <button onClick={onEdit} className="rounded-lg p-1.5 text-ink/45 transition hover:bg-canvas hover:text-night" aria-label={`Editar ${committee.name}`}><PencilIcon className="h-4 w-4" /></button>
              <button onClick={handleDelete} className="rounded-lg p-1.5 text-ink/45 transition hover:bg-brick/10 hover:text-brick" aria-label={`Eliminar ${committee.name}`}><Trash2Icon className="h-4 w-4" /></button>
            </div>
          ) : null}
        </div>
        <h2 className="mt-5 font-display text-lg font-semibold leading-snug text-ink">{committee.name}</h2>
        <p className="mt-2 flex items-center gap-1.5 text-xs text-ink/55"><UserRoundIcon className="h-3.5 w-3.5 text-gold" />Coordinación: <span className="font-semibold text-ink/75">{committee.lead || 'Por designar'}</span></p>

        <div className="mt-4 border-y border-ink/[0.07] py-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink/40">Integrantes ({members.length})</p>
          {members.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {members.map((m) => <span key={m} className="rounded-full bg-canvas px-2.5 py-1 text-[11px] text-ink/70">{m}</span>)}
            </div>
          ) : (
            <p className="mt-1 text-xs text-ink/45">Sin integrantes acompañantes.</p>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between text-xs">
          <span className="flex items-center gap-1.5 text-ink/55"><UsersRoundIcon className="h-3.5 w-3.5 text-gold" />{count} miembro{count === 1 ? '' : 's'}</span>
          <span className="flex items-center gap-1.5 text-ink/55"><CalendarDaysIcon className="h-3.5 w-3.5 text-gold" />{committee.next}</span>
        </div>
      </div>
    </article>
  )
}

function nextLabel(iso: string): string {
  const { day, month } = dayMonthFromISO(iso)
  return `${day} ${month.toLowerCase()}`
}

function CommitteeForm({ committee, onClose }: { committee?: Committee; onClose: () => void }) {
  const { addCommittee, updateCommittee, affiliates } = useDemo()
  const editing = Boolean(committee)
  const [name, setName] = useState(committee?.name ?? '')
  const [lead, setLead] = useState(committee?.lead && committee.lead !== 'Por designar' ? committee.lead : '')
  const [members, setMembers] = useState<string[]>(Array.isArray(committee?.members) ? committee!.members : [])
  const [pick, setPick] = useState('')
  const [date, setDate] = useState('')
  const [place, setPlace] = useState(meetingPlaces[0])

  const valid = name.trim() !== ''
  const available = affiliates.filter((a) => a.name !== lead && !members.includes(a.name))
  const inputClass = 'w-full rounded-xl border border-ink/12 bg-canvas/45 px-3 py-2.5 text-sm outline-none focus:border-night focus:ring-4 focus:ring-night/10'

  function addMember() {
    if (!pick || members.includes(pick) || pick === lead) return
    setMembers([...members, pick])
    setPick('')
  }
  function removeMember(n: string) {
    setMembers(members.filter((m) => m !== n))
  }

  function submit() {
    if (!valid) return
    const next = date ? `${nextLabel(date)} · ${place}` : committee?.next ?? 'Por programar'
    const payload = { name: name.trim(), lead, members, next }
    if (committee) updateCommittee(committee.id, payload)
    else addCommittee(payload)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-night/45 p-4">
      <section role="dialog" aria-modal="true" className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gold">Comités</p>
            <h2 className="mt-1 font-display text-xl font-semibold">{editing ? 'Editar comité' : 'Crear comité'}</h2>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-ink/50 hover:bg-canvas" aria-label="Cerrar"><XIcon className="h-5 w-5" /></button>
        </div>

        <div className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-ink/70">Nombre del comité <span className="text-brick">*</span></span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Comité de Cultura" className={inputClass} />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-ink/70">Encargado / Coordinación</span>
            {affiliates.length > 0 ? (
              <select value={lead} onChange={(e) => setLead(e.target.value)} className={inputClass}>
                <option value="">Seleccionar encargado…</option>
                {affiliates.map((a) => <option key={a.id} value={a.name}>{a.name} · {a.doc}</option>)}
              </select>
            ) : (
              <p className="rounded-xl border border-ink/12 bg-canvas/45 px-3 py-2.5 text-xs text-ink/50">No hay afiliados registrados. Créalos en <strong>Afiliación</strong> para asignar el encargado e integrantes.</p>
            )}
          </label>

          {affiliates.length > 0 ? (
            <div>
              <span className="mb-1.5 block text-xs font-semibold text-ink/70">Integrantes (acompañantes)</span>
              <div className="flex gap-2">
                <select value={pick} onChange={(e) => setPick(e.target.value)} className={inputClass}>
                  <option value="">Seleccionar afiliado…</option>
                  {available.map((a) => <option key={a.id} value={a.name}>{a.name} · {a.doc}</option>)}
                </select>
                <button onClick={addMember} disabled={!pick} className="shrink-0 rounded-xl bg-night px-4 text-sm font-semibold text-white transition hover:bg-night-deep disabled:opacity-40">Agregar</button>
              </div>
              {members.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {members.map((m) => (
                    <span key={m} className="inline-flex items-center gap-1.5 rounded-full bg-canvas px-3 py-1.5 text-xs text-ink/75">
                      {m}
                      <button onClick={() => removeMember(m)} className="text-ink/40 hover:text-brick" aria-label={`Quitar ${m}`}><XIcon className="h-3.5 w-3.5" /></button>
                    </span>
                  ))}
                </div>
              ) : <p className="mt-2 text-xs text-ink/45">Aún no has agregado integrantes.</p>}
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-ink/70">Próxima reunión</span>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-ink/70">Lugar</span>
              <select value={place} onChange={(e) => setPlace(e.target.value)} className={inputClass}>
                {meetingPlaces.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </label>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-ink/60 hover:bg-canvas">Cancelar</button>
          <button onClick={submit} disabled={!valid} className="rounded-xl bg-night px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-night-deep disabled:opacity-40">{editing ? 'Guardar cambios' : 'Crear comité'}</button>
        </div>
      </section>
    </div>
  )
}
