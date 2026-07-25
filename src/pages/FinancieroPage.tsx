import React, { useState } from 'react'
import { ArrowDownLeftIcon, ArrowUpRightIcon, CircleDollarSignIcon, LockIcon, PlusIcon, SearchIcon, WalletCardsIcon, XIcon } from 'lucide-react'
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { MetricCard } from '../components/MetricCard'
import { SectionTitle } from '../components/SectionTitle'
import { StatusBadge } from '../components/StatusBadge'
import { useDemo } from '../store/DemoStore'
import { useSession } from '../store/session'
import { RowMenu, RowAction } from '../components/RowMenu'
import { Movement, MovementKind, MovementStatus, expenseCategories, formatCop, formatCopShort, incomeCategories, isoToLabel, monthlyFlow, todayISO } from '../store/finance'
import { periodLabel, recentPeriods } from '../store/contributions'

const statusTone: Record<MovementStatus, 'positive' | 'warning' | 'negative' | 'neutral' | 'night'> = {
  Confirmado: 'positive',
  'Por aprobar': 'warning',
  Aprobado: 'night',
  Pagado: 'neutral',
  Rechazado: 'negative',
}

export function FinancieroPage() {
  const { movements, financeStats } = useDemo()
  const { can } = useSession()
  const [modalKind, setModalKind] = useState<MovementKind | null>(null)
  const [editing, setEditing] = useState<Movement | null>(null)
  const [query, setQuery] = useState('')
  const flow = monthlyFlow(movements)
  const q = query.trim().toLowerCase()
  const filteredMovements = q === '' ? movements : movements.filter((m) => `${m.concept} ${m.category} ${m.kind} ${m.status}`.toLowerCase().includes(q))

  return (
    <div className="mx-auto max-w-[1440px]">
      <SectionTitle
        eyebrow="Tesorería"
        title="Financiero"
        description="Seguimiento a recaudo, ejecución y movimientos contables del periodo."
        action={
          can('finance.create') ? (
            <div className="flex gap-2">
              <button
                onClick={() => setModalKind('Ingreso')}
                className="inline-flex items-center gap-2 rounded-xl border border-night/15 bg-white px-4 py-2.5 text-sm font-semibold text-night transition hover:bg-canvas"
              >
                <ArrowDownLeftIcon className="h-4 w-4" />
                Registrar ingreso
              </button>
              <button
                onClick={() => setModalKind('Egreso')}
                className="inline-flex items-center gap-2 rounded-xl bg-night px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-night/15 transition hover:bg-night-deep"
              >
                <PlusIcon className="h-4 w-4" />
                Registrar gasto
              </button>
            </div>
          ) : null
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Ingresos confirmados" value={formatCopShort(financeStats.income)} detail="Recaudo y otros ingresos" icon={CircleDollarSignIcon} tone="gold" />
        <MetricCard label="Egresos pagados" value={formatCopShort(financeStats.expensesPaid)} detail="Gastos ya ejecutados" icon={ArrowUpRightIcon} tone="brick" />
        <MetricCard label="Gastos por aprobar" value={formatCopShort(financeStats.pendingAmount)} detail={`${financeStats.pendingCount} pendiente(s) de aprobación`} icon={ArrowDownLeftIcon} tone="green" />
        <MetricCard label="Saldo en caja" value={formatCopShort(financeStats.balance)} detail="Ingresos confirmados − egresos pagados" icon={WalletCardsIcon} tone="night" />
      </div>

      {!can('finance.approve') && !can('finance.create') ? null : can('finance.approve') && !can('finance.create') ? (
        <div className="mt-5 flex items-start gap-3 rounded-xl border border-gold/30 bg-gold/[0.08] px-4 py-3 text-sm text-ink/70">
          <LockIcon className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
          <p>Como <strong>Presidencia</strong> apruebas o rechazas los gastos que registra Tesorería. El registro y el pago los hace Tesorería.</p>
        </div>
      ) : can('finance.create') ? (
        <div className="mt-5 flex items-start gap-3 rounded-xl border border-gold/30 bg-gold/[0.08] px-4 py-3 text-sm text-ink/70">
          <LockIcon className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
          <p>Como <strong>Tesorería</strong> registras ingresos y gastos, y pagas los aprobados. La <strong>aprobación</strong> de un gasto la hace Presidencia.</p>
        </div>
      ) : null}

      <section className="mt-6 rounded-2xl border border-ink/[0.08] bg-white p-5">
        <div>
          <h2 className="font-display text-base font-semibold">Flujo de caja</h2>
          <p className="mt-1 text-xs text-ink/50">Ingresos y egresos mensuales · millones COP</p>
        </div>
        {flow.length > 0 ? (
          <>
            <div className="mt-5 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={flow} margin={{ top: 4, right: 4, bottom: 0, left: -25 }}>
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#768094' }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={(v) => `$${v}M`} tick={{ fontSize: 11, fill: '#768094' }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v: number, n: string) => [`$${v.toFixed(1)} M`, n === 'income' ? 'Ingresos' : 'Egresos']} contentStyle={{ borderRadius: 12, border: '1px solid #e8e7e2', fontSize: 12 }} />
                  <Bar dataKey="income" name="income" fill="#0F1B3D" radius={[5, 5, 0, 0]} barSize={18} />
                  <Bar dataKey="expense" name="expense" fill="#C9973B" radius={[5, 5, 0, 0]} barSize={18} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 flex gap-5 text-xs text-ink/60">
              <span className="flex items-center gap-2"><i className="h-2 w-2 rounded-full bg-night" />Ingresos</span>
              <span className="flex items-center gap-2"><i className="h-2 w-2 rounded-full bg-gold" />Egresos (pagados)</span>
            </div>
          </>
        ) : (
          <div className="mt-5 flex h-72 items-center justify-center rounded-xl bg-canvas/50 text-sm text-ink/40">Sin movimientos registrados aún.</div>
        )}
      </section>

      <section className="mt-6 overflow-hidden rounded-2xl border border-ink/[0.08] bg-white">
        <div className="border-b border-ink/[0.07] px-5 py-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-base font-semibold">Libro contable</h2>
              <p className="mt-1 text-xs text-ink/50">{movements.length} movimientos registrados</p>
            </div>
          </div>
          <label className="relative mt-3 block max-w-md">
            <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/40" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por concepto, categoría o estado" className="w-full rounded-xl border border-ink/10 bg-canvas/45 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-night focus:ring-4 focus:ring-night/10" />
          </label>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left">
            <thead className="bg-canvas/65 text-[10px] uppercase tracking-[0.12em] text-ink/45">
              <tr>
                <th className="px-5 py-3 font-semibold">Fecha</th>
                <th className="px-5 py-3 font-semibold">Concepto</th>
                <th className="px-5 py-3 font-semibold">Categoría</th>
                <th className="px-5 py-3 font-semibold">Estado</th>
                <th className="px-5 py-3 text-right font-semibold">Valor</th>
                <th className="px-5 py-3 text-right font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/[0.07]">
              {filteredMovements.map((movement) => (
                <MovementRow key={movement.id} movement={movement} onEdit={setEditing} />
              ))}
              {filteredMovements.length === 0 ? (
                <tr><td colSpan={6} className="px-5 py-12 text-center text-sm text-ink/50">{movements.length === 0 ? 'Aún no hay movimientos registrados.' : 'No hay movimientos que coincidan.'}</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      {can('finance.create') ? <AportesSection /> : null}

      {modalKind ? <MovementModal kind={modalKind} onClose={() => setModalKind(null)} /> : null}
      {editing ? <EditMovementModal movement={editing} onClose={() => setEditing(null)} /> : null}
    </div>
  )
}

function AportesSection() {
  const { aportes, affiliates, generateAportes, payAporte, cuotaMensual } = useDemo()
  const periods = recentPeriods(6)
  const [period, setPeriod] = useState(periods[0])

  const nameOf = (id: string) => affiliates.find((a) => a.id === id)?.name ?? 'Afiliado'
  const rows = aportes.filter((a) => a.period === period)
  const recaudado = rows.filter((a) => a.status === 'Pagado').reduce((s, a) => s + a.amount, 0)
  const pendiente = rows.filter((a) => a.status === 'Pendiente').reduce((s, a) => s + a.amount, 0)

  return (
    <section className="mt-6 overflow-hidden rounded-2xl border border-ink/[0.08] bg-white">
      <div className="flex flex-col gap-3 border-b border-ink/[0.07] p-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="font-display text-base font-semibold">Aportes sindicales</h2>
          <p className="mt-1 text-xs text-ink/50">Cuota mensual: {formatCop(cuotaMensual)} · recaudado {formatCop(recaudado)} · pendiente {formatCop(pendiente)}</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={period} onChange={(e) => setPeriod(e.target.value)} className="rounded-xl border border-ink/12 bg-canvas/45 px-3 py-2.5 text-sm outline-none focus:border-night">
            {periods.map((p) => <option key={p} value={p}>{periodLabel(p)}</option>)}
          </select>
          <button onClick={() => generateAportes(period)} className="inline-flex items-center gap-2 rounded-xl bg-night px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-night-deep"><PlusIcon className="h-4 w-4" />Generar corte</button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-left">
          <thead className="bg-canvas/65 text-[10px] uppercase tracking-[0.12em] text-ink/45">
            <tr>
              <th className="px-5 py-3 font-semibold">Afiliado</th>
              <th className="px-5 py-3 font-semibold">Valor</th>
              <th className="px-5 py-3 font-semibold">Estado</th>
              <th className="px-5 py-3 text-right font-semibold">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/[0.07]">
            {rows.map((a) => (
              <tr key={a.id} className="transition hover:bg-canvas/50">
                <td className="px-5 py-3 text-sm font-medium text-ink">{nameOf(a.affiliateId)}</td>
                <td className="px-5 py-3 text-sm text-ink/60">{formatCop(a.amount)}</td>
                <td className="px-5 py-3"><StatusBadge tone={a.status === 'Pagado' ? 'positive' : 'warning'}>{a.status}{a.status === 'Pagado' && a.method ? ` · ${a.method}` : ''}</StatusBadge></td>
                <td className="px-5 py-3 text-right">
                  {a.status === 'Pendiente' ? (
                    <button onClick={() => payAporte(a.id, 'Nómina')} className="rounded-lg border border-ink/12 px-3 py-1.5 text-xs font-semibold text-night transition hover:border-night hover:bg-night/5">Marcar pagado</button>
                  ) : <span className="text-xs text-ink/35">—</span>}
                </td>
              </tr>
            ))}
            {rows.length === 0 ? <tr><td colSpan={4} className="px-5 py-12 text-center text-sm text-ink/50">No hay aportes para {periodLabel(period)}. Genera el corte para los afiliados activos.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function movementActions(movement: Movement, canApprove: boolean, canPay: boolean): Array<{ label: string; next: MovementStatus; danger?: boolean }> {
  if (movement.kind !== 'Egreso') return []
  if (movement.status === 'Por aprobar' && canApprove) return [{ label: 'Aprobar gasto', next: 'Aprobado' }, { label: 'Rechazar', next: 'Rechazado', danger: true }]
  if (movement.status === 'Aprobado' && canPay) return [{ label: 'Marcar como pagado', next: 'Pagado' }]
  return []
}

function MovementRow({ movement, onEdit }: { movement: Movement; onEdit: (m: Movement) => void }) {
  const { setMovementStatus, deleteMovement, notify } = useDemo()
  const { can } = useSession()
  const statusActions = movementActions(movement, can('finance.approve'), can('finance.pay'))
  const canManage = can('finance.create')

  function apply(next: MovementStatus) {
    setMovementStatus(movement.id, next)
    const verb = next === 'Aprobado' ? 'aprobado' : next === 'Rechazado' ? 'rechazado' : 'pagado'
    notify(`Gasto ${verb}: ${movement.concept}.`, next === 'Rechazado' ? 'warning' : 'success')
  }

  function handleDelete() {
    if (window.confirm(`¿Eliminar el movimiento "${movement.concept}"?`)) deleteMovement(movement.id, movement.concept)
  }

  const menuActions: RowAction[] = statusActions.map((a) => ({ label: a.label, danger: a.danger, onClick: () => apply(a.next) }))
  if (canManage) {
    menuActions.push({ label: 'Editar', onClick: () => onEdit(movement) })
    menuActions.push({ label: 'Eliminar', danger: true, onClick: handleDelete })
  }
  // Un egreso en trámite que este rol no puede mover ni editar: candado.
  const lockedPending = movement.kind === 'Egreso' && (movement.status === 'Por aprobar' || movement.status === 'Aprobado') && menuActions.length === 0

  return (
    <tr className="transition hover:bg-canvas/50">
      <td className="px-5 py-4 text-sm text-ink/55">{movement.date}</td>
      <td className="px-5 py-4 text-sm font-medium text-ink">{movement.concept}</td>
      <td className="px-5 py-4 text-sm text-ink/55">{movement.category}</td>
      <td className="px-5 py-4"><StatusBadge tone={statusTone[movement.status]}>{movement.status}</StatusBadge></td>
      <td className={`px-5 py-4 text-right text-sm font-semibold ${movement.kind === 'Ingreso' ? 'text-emerald-700' : 'text-brick'}`}>
        {movement.kind === 'Ingreso' ? '+' : '−'} {formatCop(movement.amount)}
      </td>
      <td className="px-5 py-4 text-right">
        {menuActions.length > 0 ? (
          <RowMenu label={`Acciones para ${movement.concept}`} actions={menuActions} />
        ) : lockedPending ? (
          <span className="inline-flex items-center justify-center rounded-lg p-1.5 text-ink/25" title={movement.status === 'Por aprobar' ? 'La aprobación la realiza Presidencia.' : 'El pago lo realiza Tesorería.'}>
            <LockIcon className="h-4 w-4" />
          </span>
        ) : (
          <span className="text-ink/25">—</span>
        )}
      </td>
    </tr>
  )
}

function EditMovementModal({ movement, onClose }: { movement: Movement; onClose: () => void }) {
  const { updateMovement } = useDemo()
  const categories = movement.kind === 'Ingreso' ? incomeCategories : expenseCategories
  const [concept, setConcept] = useState(movement.concept)
  const [category, setCategory] = useState(movement.category)
  const [amountText, setAmountText] = useState(String(movement.amount))
  const [dateISO, setDateISO] = useState('')

  const amount = Number(amountText.replace(/\D/g, ''))
  const valid = concept.trim() !== '' && amount > 0
  const inputClass = 'w-full rounded-xl border border-ink/12 bg-canvas/45 px-3 py-2.5 text-sm outline-none focus:border-night focus:ring-4 focus:ring-night/10'

  function save() {
    if (!valid) return
    updateMovement(movement.id, { concept: concept.trim(), category, amount, date: dateISO ? isoToLabel(dateISO) : movement.date })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-night/45 p-4">
      <section role="dialog" aria-modal="true" className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gold">{movement.kind}</p>
            <h2 className="mt-1 font-display text-xl font-semibold">Editar movimiento</h2>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-ink/50 hover:bg-canvas" aria-label="Cerrar"><XIcon className="h-5 w-5" /></button>
        </div>

        <div className="mt-5 space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-ink/70">Concepto <span className="text-brick">*</span></span>
            <input value={concept} onChange={(e) => setConcept(e.target.value)} className={inputClass} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-ink/70">Categoría</span>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputClass}>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-ink/70">Fecha</span>
            <input type="date" value={dateISO} onChange={(e) => setDateISO(e.target.value)} className={inputClass} />
            <span className="mt-1 block text-xs text-ink/50">Actual: {movement.date}. Deja vacío para conservarla.</span>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-ink/70">Valor <span className="text-brick">*</span></span>
            <input value={amountText} onChange={(e) => setAmountText(e.target.value)} inputMode="numeric" className={inputClass} />
            {amount > 0 ? <span className="mt-1 block text-xs text-ink/50">{formatCop(amount)}</span> : null}
          </label>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-ink/60 hover:bg-canvas">Cancelar</button>
          <button onClick={save} disabled={!valid} className="rounded-xl bg-night px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-night-deep disabled:opacity-40">Guardar cambios</button>
        </div>
      </section>
    </div>
  )
}

function MovementModal({ kind, onClose }: { kind: MovementKind; onClose: () => void }) {
  const { addMovement } = useDemo()
  const categories = kind === 'Ingreso' ? incomeCategories : expenseCategories
  const [concept, setConcept] = useState('')
  const [category, setCategory] = useState(categories[0])
  const [amountText, setAmountText] = useState('')
  const [dateISO, setDateISO] = useState(todayISO())

  const amount = Number(amountText.replace(/\D/g, ''))
  const valid = concept.trim() !== '' && amount > 0 && dateISO !== ''

  function submit() {
    if (!valid) return
    addMovement({ concept: concept.trim(), category, kind, amount, date: isoToLabel(dateISO) })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-night/45 p-4">
      <section role="dialog" aria-modal="true" className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gold">{kind === 'Ingreso' ? 'Ingreso' : 'Egreso'}</p>
            <h2 className="mt-1 font-display text-xl font-semibold">{kind === 'Ingreso' ? 'Registrar ingreso' : 'Registrar gasto'}</h2>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-ink/50 hover:bg-canvas" aria-label="Cerrar"><XIcon className="h-5 w-5" /></button>
        </div>
        <p className="mt-1 text-sm text-ink/50">
          {kind === 'Ingreso' ? 'El ingreso quedará confirmado al registrarlo.' : 'El gasto quedará por aprobar por Presidencia.'}
        </p>

        <div className="mt-5 space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-ink/70">Concepto <span className="text-brick">*</span></span>
            <input value={concept} onChange={(e) => setConcept(e.target.value)} placeholder={kind === 'Ingreso' ? 'Aportes, reintegro…' : 'Descripción del gasto'} className="w-full rounded-xl border border-ink/12 bg-canvas/45 px-3 py-2.5 text-sm outline-none focus:border-night focus:ring-4 focus:ring-night/10" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-ink/70">Categoría</span>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full rounded-xl border border-ink/12 bg-canvas/45 px-3 py-2.5 text-sm outline-none focus:border-night focus:ring-4 focus:ring-night/10">
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-ink/70">Fecha <span className="text-brick">*</span></span>
            <input type="date" value={dateISO} onChange={(e) => setDateISO(e.target.value)} className="w-full rounded-xl border border-ink/12 bg-canvas/45 px-3 py-2.5 text-sm outline-none focus:border-night focus:ring-4 focus:ring-night/10" />
            <span className="mt-1 block text-xs text-ink/50">Puedes registrar movimientos de meses anteriores.</span>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-ink/70">Valor <span className="text-brick">*</span></span>
            <input value={amountText} onChange={(e) => setAmountText(e.target.value)} inputMode="numeric" placeholder="$ 0" className="w-full rounded-xl border border-ink/12 bg-canvas/45 px-3 py-2.5 text-sm outline-none focus:border-night focus:ring-4 focus:ring-night/10" />
            {amount > 0 ? <span className="mt-1 block text-xs text-ink/50">{formatCop(amount)}</span> : null}
          </label>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-ink/60 hover:bg-canvas">Cancelar</button>
          <button onClick={submit} disabled={!valid} className="rounded-xl bg-night px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-night-deep disabled:opacity-40">
            {kind === 'Ingreso' ? 'Registrar ingreso' : 'Registrar gasto'}
          </button>
        </div>
      </section>
    </div>
  )
}
