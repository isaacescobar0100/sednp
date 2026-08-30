import React, { useState } from 'react'
import { ArrowDownLeftIcon, ArrowUpRightIcon, CircleDollarSignIcon, LockIcon, PlusIcon, SearchIcon, WalletCardsIcon, XIcon } from 'lucide-react'
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { MetricCard } from '../components/MetricCard'
import { SectionTitle } from '../components/SectionTitle'
import { StatusBadge } from '../components/StatusBadge'
import { useDemo } from '../store/DemoStore'
import { useSession } from '../store/session'
import { RowMenu, RowAction } from '../components/RowMenu'
import { FirmaKey, Movement, MovementKind, MovementStatus, TOPE_CAJA_SMMLV, ejecucionPorRubro, ejecutadoRubro, expenseCategories, firmaLabel, firmasCount, formatCop, formatCopShort, incomeCategories, isoToLabel, monthlyFlow, movementsToCsv, nivelGasto, nivelLabel, requiereActaAsamblea, todayISO } from '../store/finance'
import { TOPE_EXTRAORDINARIA, mesesVencidos, periodLabel, recentPeriods } from '../store/contributions'
import { abrirSoporte, nombreSoporte, subirSoporte } from '../store/storageApi'
import { Pagination, paginate } from '../components/Pagination'

const MOV_PAGE = 12
const APORTE_PAGE = 12

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
  const [movPage, setMovPage] = useState(1)
  const flow = monthlyFlow(movements)
  const q = query.trim().toLowerCase()
  const filteredMovements = q === '' ? movements : movements.filter((m) => `${m.concept} ${m.category} ${m.kind} ${m.status}`.toLowerCase().includes(q))
  const movPageRows = paginate(filteredMovements, movPage, MOV_PAGE)

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

      <CaucionExportBar />

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
            <input value={query} onChange={(e) => { setQuery(e.target.value); setMovPage(1) }} placeholder="Buscar por concepto, categoría o estado" className="w-full rounded-xl border border-ink/10 bg-canvas/45 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-night focus:ring-4 focus:ring-night/10" />
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
              {movPageRows.map((movement) => (
                <MovementRow key={movement.id} movement={movement} onEdit={setEditing} />
              ))}
              {filteredMovements.length === 0 ? (
                <tr><td colSpan={6} className="px-5 py-12 text-center text-sm text-ink/50">{movements.length === 0 ? 'Aún no hay movimientos registrados.' : 'No hay movimientos que coincidan.'}</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <Pagination page={movPage} size={MOV_PAGE} total={filteredMovements.length} onPage={setMovPage} />
      </section>

      {can('finance.create') || can('finance.approve') ? <AportesSection /> : null}

      <PresupuestoSection />

      {can('finance.create') ? <CajaMenorSection /> : null}

      {modalKind ? <MovementModal kind={modalKind} onClose={() => setModalKind(null)} /> : null}
      {editing ? <EditMovementModal movement={editing} onClose={() => setEditing(null)} /> : null}
    </div>
  )
}

// Días entre hoy y una fecha ISO (negativo si ya pasó).
function diasHasta(iso: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null
  const [y, m, d] = iso.split('-').map(Number)
  const target = new Date(y, m - 1, d).getTime()
  const today = new Date()
  const base = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()
  return Math.round((target - base) / 86_400_000)
}

// Barra con alerta de caución del Tesorero (Art. 26) y exportación a SIIGO.
function CaucionExportBar() {
  const { movements, caucionVence } = useDemo()
  const dias = caucionVence ? diasHasta(caucionVence) : null
  const caucionAlerta = dias !== null && dias <= 30

  function exportar() {
    const csv = movementsToCsv(movements)
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'movimientos-siigo.csv'
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="text-xs text-ink/55">
        {caucionVence ? (
          caucionAlerta
            ? <span className="font-semibold text-rose-600">⚠ Caución del Tesorero {dias !== null && dias < 0 ? 'vencida' : `vence en ${dias} días`} — renovar (Art. 26).</span>
            : <span>Caución del Tesorero vigente (vence {caucionVence}).</span>
        ) : <span className="text-ink/40">Caución del Tesorero: sin registrar (defínela en Parámetros).</span>}
      </div>
      <button onClick={exportar} disabled={movements.length === 0} className="inline-flex items-center gap-2 self-start rounded-xl border border-ink/12 px-4 py-2.5 text-sm font-semibold text-night transition hover:bg-canvas disabled:opacity-40 sm:self-auto">
        Exportar movimientos (SIIGO CSV)
      </button>
    </div>
  )
}

// Caja menor (Art. 26e): fondo ≤ 1 SMMLV, gastos con soporte, alertas de saldo
// y reembolso que repone el fondo.
function CajaMenorSection() {
  const { cajaFondo, cajaGastos, aperturaCaja, addCajaGasto, reembolsoCaja, smmlv, notify } = useDemo()
  const [fondoText, setFondoText] = useState(String(cajaFondo || ''))
  const [concepto, setConcepto] = useState('')
  const [montoText, setMontoText] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [subiendo, setSubiendo] = useState(false)
  const fileRef = React.useRef<HTMLInputElement>(null)

  const tope = TOPE_CAJA_SMMLV * smmlv
  const nuevoFondo = Number(fondoText.replace(/\D/g, ''))
  const gastado = cajaGastos.reduce((s, g) => s + g.monto, 0)
  const saldo = cajaFondo - gastado
  const pct = cajaFondo > 0 ? Math.round((gastado / cajaFondo) * 100) : 0
  const monto = Number(montoText.replace(/\D/g, ''))
  const gastoValido = concepto.trim() !== '' && monto > 0 && monto <= saldo && !!file
  const fondoExcede = nuevoFondo > tope

  async function registrar() {
    if (!file) return
    setSubiendo(true)
    try {
      const path = await subirSoporte('caja', file)
      addCajaGasto(concepto.trim(), monto, path)
      setConcepto(''); setMontoText(''); setFile(null)
      if (fileRef.current) fileRef.current.value = ''
    } catch {
      notify('No se pudo subir el soporte. Revisa el bucket de Storage.', 'warning')
    } finally {
      setSubiendo(false)
    }
  }

  return (
    <section className="mt-6 overflow-hidden rounded-2xl border border-ink/[0.08] bg-white">
      <div className="flex flex-col gap-3 border-b border-ink/[0.07] p-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="font-display text-base font-semibold">Caja menor</h2>
          <p className="mt-1 text-xs text-ink/50">Fondo administrado por Tesorería · tope 1 SMMLV ({formatCop(tope)}). Cada gasto requiere soporte (Art. 26e).</p>
        </div>
        <div className="flex items-end gap-2">
          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold text-ink/60">Fondo de apertura</span>
            <input value={fondoText} onChange={(e) => setFondoText(e.target.value)} inputMode="numeric" placeholder="Monto ≤ 1 SMMLV" className="w-40 rounded-xl border border-ink/12 bg-canvas/45 px-3 py-2 text-sm outline-none focus:border-night" />
          </label>
          <button onClick={() => aperturaCaja(nuevoFondo)} disabled={nuevoFondo <= 0 || fondoExcede} className="rounded-xl bg-night px-4 py-2 text-sm font-semibold text-white transition hover:bg-night-deep disabled:opacity-40">Abrir / ajustar</button>
        </div>
      </div>

      {fondoExcede ? <p className="px-4 pt-3 text-xs font-medium text-rose-600">El fondo no puede exceder 1 SMMLV ({formatCop(tope)}).</p> : null}

      {cajaFondo > 0 ? (
        <div className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="text-ink/60">Saldo disponible: <strong className="text-ink">{formatCop(saldo)}</strong> de {formatCop(cajaFondo)}</span>
            <span className={`text-xs font-semibold ${pct >= 90 ? 'text-rose-600' : pct >= 70 ? 'text-amber-600' : 'text-ink/45'}`}>{pct}% ejecutado{pct >= 90 ? ' · alerta roja' : pct >= 70 ? ' · alerta amarilla' : ''}</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-ink/[0.06]">
            <div className={`h-full rounded-full ${pct >= 90 ? 'bg-rose-500' : pct >= 70 ? 'bg-amber-500' : 'bg-night'}`} style={{ width: `${Math.min(100, pct)}%` }} />
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_130px_1fr_auto]">
            <input value={concepto} onChange={(e) => setConcepto(e.target.value)} placeholder="Concepto del gasto" className="rounded-xl border border-ink/12 bg-canvas/45 px-3 py-2 text-sm outline-none focus:border-night" />
            <input value={montoText} onChange={(e) => setMontoText(e.target.value)} inputMode="numeric" placeholder="Monto" className="rounded-xl border border-ink/12 bg-canvas/45 px-3 py-2 text-sm outline-none focus:border-night" />
            <input ref={fileRef} type="file" accept="image/*,application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="rounded-xl border border-ink/12 bg-canvas/45 px-3 py-1.5 text-xs outline-none file:mr-2 file:rounded-md file:border-0 file:bg-night file:px-2 file:py-1 file:text-white focus:border-night" title="Soporte: factura o recibo (imagen o PDF)" />
            <button onClick={registrar} disabled={!gastoValido || subiendo} className="rounded-xl bg-night px-4 py-2 text-sm font-semibold text-white transition hover:bg-night-deep disabled:opacity-40">{subiendo ? 'Subiendo…' : 'Registrar'}</button>
          </div>
          <p className="mt-1 text-[11px] text-ink/40">El soporte (factura/recibo) es obligatorio: imagen o PDF (Art. 26e).</p>
          {monto > saldo ? <p className="mt-1 text-[11px] font-medium text-rose-600">El gasto supera el saldo de caja menor.</p> : null}

          {cajaGastos.length > 0 ? (
            <ul className="mt-4 divide-y divide-ink/[0.07] rounded-xl border border-ink/[0.07]">
              {cajaGastos.map((g) => (
                <li key={g.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                  <span className="min-w-0"><span className="font-medium text-ink">{g.concepto}</span> {g.soporte ? <button onClick={() => abrirSoporte(g.soporte)} className="text-xs font-medium text-night underline decoration-dotted underline-offset-2 hover:text-night-deep">· {nombreSoporte(g.soporte)}</button> : null}</span>
                  <span className="shrink-0 text-ink/60">{formatCop(g.monto)}</span>
                </li>
              ))}
            </ul>
          ) : <p className="mt-4 text-xs text-ink/45">Sin gastos registrados en el fondo.</p>}

          {gastado > 0 ? (
            <button onClick={() => reembolsoCaja(gastado)} className="mt-4 rounded-xl border border-night/25 px-4 py-2.5 text-sm font-semibold text-night transition hover:bg-night/5">Reembolsar caja menor ({formatCop(gastado)}) y reponer fondo</button>
          ) : null}
        </div>
      ) : (
        <p className="px-4 py-8 text-center text-sm text-ink/50">Abre el fondo de caja menor para registrar gastos.</p>
      )}
    </section>
  )
}

// Mora en el pago de cuotas: es causal disciplinaria (puede derivar en
// exclusión). Los días/meses exactos se validan contra el estatuto; aquí se
// marca el aporte vencido y, a mayor mora, se agrava el indicador.
function moraDe(a: { status: string; period: string }): { meses: number; grave: boolean } {
  if (a.status !== 'Pendiente') return { meses: 0, grave: false }
  const meses = mesesVencidos(a.period)
  return { meses: Math.max(0, meses), grave: meses >= 2 }
}

function AportesSection() {
  const { aportes, affiliates, generateAportes, payAporte, anticiparAporte, porcentajeCuota } = useDemo()
  const { can } = useSession()
  const canCreate = can('finance.create')
  const canApprove = can('finance.approve')
  const periods = recentPeriods(6)
  const [period, setPeriod] = useState(periods[0])
  const [extraOpen, setExtraOpen] = useState(false)
  const [aportePage, setAportePage] = useState(1)
  const pctLabel = (porcentajeCuota * 100).toLocaleString('es-CO', { maximumFractionDigits: 2 })

  const nameOf = (id: string) => affiliates.find((a) => a.id === id)?.name ?? 'Afiliado'
  const rows = aportes.filter((a) => a.period === period)
  const pageRows = paginate(rows, aportePage, APORTE_PAGE)
  const recaudado = rows.filter((a) => a.status === 'Pagado').reduce((s, a) => s + a.amount, 0)
  const pendiente = rows.filter((a) => a.status === 'Pendiente').reduce((s, a) => s + a.amount, 0)
  const enMora = rows.filter((a) => moraDe(a).meses >= 1).length

  return (
    <section className="mt-6 overflow-hidden rounded-2xl border border-ink/[0.08] bg-white">
      <div className="flex flex-col gap-3 border-b border-ink/[0.07] p-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="font-display text-base font-semibold">Aportes sindicales</h2>
          <p className="mt-1 text-xs text-ink/50">Cuota ordinaria: {pctLabel}% de la asignación básica · recaudado {formatCop(recaudado)} · pendiente {formatCop(pendiente)}{enMora ? ` · ${enMora} en mora` : ''}</p>
          <p className="mt-0.5 text-[11px] text-ink/40">Distribución del recaudo: 80% Junta Directiva Nacional / 20% subdirectivas seccionales (Art. 32) — sin seccionales, 100% JDN.</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={period} onChange={(e) => { setPeriod(e.target.value); setAportePage(1) }} className="rounded-xl border border-ink/12 bg-canvas/45 px-3 py-2.5 text-sm outline-none focus:border-night">
            {periods.map((p) => <option key={p} value={p}>{periodLabel(p)}</option>)}
          </select>
          {canApprove ? <button onClick={() => setExtraOpen(true)} className="inline-flex items-center gap-2 rounded-xl border border-night/25 px-4 py-2.5 text-sm font-semibold text-night transition hover:bg-night/5">Decretar extraordinaria</button> : null}
          {canCreate ? <button onClick={() => generateAportes(period)} className="inline-flex items-center gap-2 rounded-xl bg-night px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-night-deep"><PlusIcon className="h-4 w-4" />Generar corte</button> : null}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[620px] text-left">
          <thead className="bg-canvas/65 text-[10px] uppercase tracking-[0.12em] text-ink/45">
            <tr>
              <th className="px-5 py-3 font-semibold">Afiliado</th>
              <th className="px-5 py-3 font-semibold">Tipo</th>
              <th className="px-5 py-3 font-semibold">Valor</th>
              <th className="px-5 py-3 font-semibold">Estado</th>
              <th className="px-5 py-3 text-right font-semibold">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/[0.07]">
            {pageRows.map((a) => {
              const mora = moraDe(a)
              const enMora = a.status === 'Pendiente' && mora.meses >= 1
              return (
                <tr key={a.id} className="transition hover:bg-canvas/50">
                  <td className="px-5 py-3 text-sm font-medium text-ink">{nameOf(a.affiliateId)}</td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-semibold ${a.tipo === 'Extraordinaria' ? 'bg-amber-100 text-amber-700' : 'bg-ink/[0.06] text-ink/55'}`}>{a.tipo === 'Extraordinaria' ? `Extraordinaria${a.acta ? ` · Acta ${a.acta}` : ''}` : 'Ordinaria'}</span>
                    {a.anticipada ? <span className="ml-1.5 inline-flex rounded-md bg-sky-100 px-2 py-0.5 text-[10px] font-semibold text-sky-700">Anticipada · vacaciones</span> : null}
                  </td>
                  <td className="px-5 py-3 text-sm text-ink/60">{formatCop(a.amount)}</td>
                  <td className="px-5 py-3">
                    <StatusBadge tone={a.status === 'Pagado' ? 'positive' : mora.grave ? 'negative' : enMora ? 'warning' : 'warning'}>{a.status === 'Pagado' ? `Pagado${a.method ? ` · ${a.method}` : ''}` : enMora ? `En mora · ${mora.meses}m${mora.grave ? ' (causal disciplinaria)' : ''}` : 'Pendiente'}</StatusBadge>
                  </td>
                  <td className="px-5 py-3 text-right">
                    {a.status === 'Pendiente' && canCreate ? (
                      <div className="flex items-center justify-end gap-1.5">
                        {!a.anticipada && a.tipo === 'Ordinaria' ? <button onClick={() => anticiparAporte(a.id)} title="Descuento anticipado por vacaciones (Parágrafo Art. 32)" className="rounded-lg border border-ink/12 px-2.5 py-1.5 text-xs font-semibold text-ink/60 transition hover:border-night hover:text-night">Anticipar</button> : null}
                        <button onClick={() => payAporte(a.id, 'Nómina')} className="rounded-lg border border-ink/12 px-3 py-1.5 text-xs font-semibold text-night transition hover:border-night hover:bg-night/5">Marcar pagado</button>
                      </div>
                    ) : <span className="text-xs text-ink/35">—</span>}
                  </td>
                </tr>
              )
            })}
            {rows.length === 0 ? <tr><td colSpan={5} className="px-5 py-12 text-center text-sm text-ink/50">No hay aportes para {periodLabel(period)}. {canCreate ? 'Genera el corte para los afiliados activos.' : ''}</td></tr> : null}
          </tbody>
        </table>
      </div>
      <Pagination page={aportePage} size={APORTE_PAGE} total={rows.length} onPage={setAportePage} />
      {extraOpen ? <ExtraordinariaModal period={period} onClose={() => setExtraOpen(false)} /> : null}
    </section>
  )
}

// La Asamblea decreta una cuota extraordinaria (Art. 33): tope 3% de la
// asignación básica y debe constar en acta.
function ExtraordinariaModal({ period, onClose }: { period: string; onClose: () => void }) {
  const { decretarExtraordinaria } = useDemo()
  const [pct, setPct] = useState('1')
  const [acta, setActa] = useState('')
  const [error, setError] = useState('')
  const topePct = TOPE_EXTRAORDINARIA * 100

  const submit = () => {
    const value = Number(pct.replace(',', '.'))
    if (!Number.isFinite(value) || value <= 0) return setError('Ingresa un porcentaje válido.')
    if (value > topePct) return setError(`El tope estatutario es ${topePct}% (Art. 33).`)
    if (!acta.trim()) return setError('Indica el número de acta de la Asamblea.')
    decretarExtraordinaria(period, value / 100, acta.trim())
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold">Decretar cuota extraordinaria</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-ink/50 hover:bg-canvas"><XIcon className="h-5 w-5" /></button>
        </div>
        <p className="mt-1 text-xs text-ink/50">Periodo {periodLabel(period)}. La Asamblea la aprueba en acta; el tope es {topePct}% de la asignación básica (Art. 33). Se genera un aporte extraordinario por cada afiliado activo.</p>
        <label className="mt-4 block text-xs font-semibold text-ink/60">Porcentaje sobre la asignación básica (%)</label>
        <input value={pct} onChange={(e) => { setPct(e.target.value); setError('') }} inputMode="decimal" className="mt-1 w-full rounded-xl border border-ink/12 bg-canvas/45 px-3 py-2.5 text-sm outline-none focus:border-night" placeholder={`Máx. ${topePct}`} />
        <label className="mt-3 block text-xs font-semibold text-ink/60">Acta de la Asamblea No.</label>
        <input value={acta} onChange={(e) => { setActa(e.target.value); setError('') }} className="mt-1 w-full rounded-xl border border-ink/12 bg-canvas/45 px-3 py-2.5 text-sm outline-none focus:border-night" placeholder="p. ej. 03-2026" />
        {error ? <p className="mt-2 text-xs font-medium text-rose-600">{error}</p> : null}
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-xl border border-ink/12 px-4 py-2.5 text-sm font-semibold text-ink/70 transition hover:bg-canvas">Cancelar</button>
          <button onClick={submit} className="rounded-xl bg-night px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-night-deep">Decretar</button>
        </div>
      </div>
    </div>
  )
}

// Ejecución del presupuesto anual por rubro (Art. 11f/26). El presupuesto se
// define en Parámetros; aquí se controla lo comprometido contra lo aprobado.
function PresupuestoSection() {
  const { movements, presupuestos } = useDemo()
  const filas = ejecucionPorRubro(movements, presupuestos)
  const totalAnual = filas.reduce((s, f) => s + f.anual, 0)
  const totalEjec = filas.reduce((s, f) => s + f.ejecutado, 0)
  const sinPresupuesto = totalAnual === 0

  return (
    <section className="mt-6 overflow-hidden rounded-2xl border border-ink/[0.08] bg-white">
      <div className="border-b border-ink/[0.07] p-4">
        <h2 className="font-display text-base font-semibold">Ejecución presupuestal</h2>
        <p className="mt-1 text-xs text-ink/50">Presupuesto anual por rubro y su ejecución (egresos aprobados o pagados). {sinPresupuesto ? 'Define el presupuesto en Parámetros.' : `Ejecutado ${formatCop(totalEjec)} de ${formatCop(totalAnual)}.`}</p>
      </div>
      <div className="divide-y divide-ink/[0.07]">
        {filas.map((f) => {
          const over = f.anual > 0 && f.ejecutado > f.anual
          return (
            <div key={f.category} className="px-5 py-4">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-ink">{f.category}</span>
                <span className="text-ink/55">{formatCop(f.ejecutado)}{f.anual > 0 ? ` / ${formatCop(f.anual)}` : ' · sin presupuesto'}{f.anual > 0 ? ` · ${f.pct}%` : ''}</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-ink/[0.06]">
                <div className={`h-full rounded-full ${over ? 'bg-rose-500' : 'bg-night'}`} style={{ width: `${f.anual > 0 ? Math.min(100, f.pct) : 0}%` }} />
              </div>
              {over ? <p className="mt-1 text-[11px] font-medium text-rose-600">Ejecución por encima del presupuesto aprobado.</p> : null}
            </div>
          )
        })}
      </div>
    </section>
  )
}

function MovementRow({ movement, onEdit }: { movement: Movement; onEdit: (m: Movement) => void }) {
  const { setMovementStatus, updateMovement, deleteMovement, signMovement, notify } = useDemo()
  const { can, role } = useSession()
  const canManage = can('finance.create')
  const esEgreso = movement.kind === 'Egreso'
  const nFirmas = firmasCount(movement.firmas)
  const misFirma: FirmaKey | null = role === 'presidencia' ? 'presidente' : role === 'tesoreria' ? 'tesorero' : role === 'fiscal' ? 'fiscal' : null
  const [askActa, setAskActa] = useState(false)
  const requiereActa = requiereActaAsamblea(movement.nivel)

  function apply(next: MovementStatus) {
    setMovementStatus(movement.id, next)
    const verb = next === 'Aprobado' ? 'aprobado' : next === 'Rechazado' ? 'rechazado' : 'pagado'
    notify(`Gasto ${verb}: ${movement.concept}.`, next === 'Rechazado' ? 'warning' : 'success')
  }
  function approve() {
    // Gastos 4–10 y >10 SMMLV requieren refrendación de la Asamblea (Art. 34).
    if (requiereActa) { setAskActa(true); return }
    apply('Aprobado')
  }
  function handleDelete() {
    if (window.confirm(`¿Eliminar el movimiento "${movement.concept}"?`)) deleteMovement(movement.id, movement.concept)
  }

  const menuActions: RowAction[] = []
  if (esEgreso) {
    if (movement.status === 'Por aprobar' && can('finance.approve')) {
      menuActions.push({ label: requiereActa ? 'Aprobar (refrendar en Asamblea)' : 'Aprobar gasto', onClick: approve })
      menuActions.push({ label: 'Rechazar', danger: true, onClick: () => apply('Rechazado') })
    }
    if (movement.status === 'Aprobado') {
      if (misFirma && can('finance.sign') && !movement.firmas?.[misFirma]) {
        menuActions.push({ label: `Firmar como ${firmaLabel[misFirma]}`, onClick: () => signMovement(movement.id, misFirma) })
      }
      if (nFirmas === 3 && can('finance.pay')) {
        menuActions.push({ label: 'Marcar como pagado', onClick: () => apply('Pagado') })
      }
    }
  }
  if (canManage) {
    menuActions.push({ label: 'Editar', onClick: () => onEdit(movement) })
    menuActions.push({ label: 'Eliminar', danger: true, onClick: handleDelete })
  }
  const lockedPending = esEgreso && (movement.status === 'Por aprobar' || movement.status === 'Aprobado') && menuActions.length === 0

  return (
    <tr className="transition hover:bg-canvas/50">
      <td className="px-5 py-4 text-sm text-ink/55">{movement.date}</td>
      <td className="px-5 py-4 text-sm">
        <p className="font-medium text-ink">{movement.concept}</p>
        {esEgreso && movement.nivel && (movement.status === 'Por aprobar' || movement.status === 'Aprobado') ? <p className="mt-0.5 text-[11px] text-ink/45">Aprobación: {nivelLabel[movement.nivel]}</p> : null}
        {esEgreso && movement.ordenPago ? <p className="mt-0.5 text-[11px] font-medium text-night/70">Orden de pago {movement.ordenPago}</p> : null}
        {esEgreso && movement.actaAsamblea ? <p className="mt-0.5 text-[11px] text-ink/45">Refrendado por Asamblea · Acta {movement.actaAsamblea}</p> : null}
      </td>
      <td className="px-5 py-4 text-sm text-ink/55">{movement.category}</td>
      <td className="px-5 py-4">
        <StatusBadge tone={statusTone[movement.status]}>{movement.status}</StatusBadge>
        {esEgreso && movement.status === 'Aprobado' ? <p className={`mt-1 text-[11px] ${nFirmas === 3 ? 'text-emerald-700' : 'text-ink/45'}`}>Firmas {nFirmas}/3</p> : null}
      </td>
      <td className={`px-5 py-4 text-right text-sm font-semibold ${movement.kind === 'Ingreso' ? 'text-emerald-700' : 'text-brick'}`}>
        {movement.kind === 'Ingreso' ? '+' : '−'} {formatCop(movement.amount)}
      </td>
      <td className="px-5 py-4 text-right">
        {menuActions.length > 0 ? (
          <RowMenu label={`Acciones para ${movement.concept}`} actions={menuActions} />
        ) : lockedPending ? (
          <span className="inline-flex items-center justify-center rounded-lg p-1.5 text-ink/25" title={movement.status === 'Por aprobar' ? 'Pendiente de aprobación.' : 'Pendiente de firmas / pago.'}>
            <LockIcon className="h-4 w-4" />
          </span>
        ) : (
          <span className="text-ink/25">—</span>
        )}
        {askActa ? (
          <ActaAsambleaModal
            movement={movement}
            onClose={() => setAskActa(false)}
            onConfirm={(acta) => {
              updateMovement(movement.id, { status: 'Aprobado', actaAsamblea: acta })
              notify(`Gasto aprobado y refrendado por la Asamblea (Acta ${acta}).`, 'success')
              setAskActa(false)
            }}
          />
        ) : null}
      </td>
    </tr>
  )
}

// Refrendación de la Asamblea para gastos 4–10 y >10 SMMLV (Art. 34): sin el
// acta no puede aprobarse el gasto.
function ActaAsambleaModal({ movement, onConfirm, onClose }: { movement: Movement; onConfirm: (acta: string) => void; onClose: () => void }) {
  const [acta, setActa] = useState('')
  const dosTercios = movement.nivel === 'asamblea'
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-night/45 p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl text-left" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold">Refrendación de la Asamblea</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-ink/50 hover:bg-canvas"><XIcon className="h-5 w-5" /></button>
        </div>
        <p className="mt-1 text-xs text-ink/55">{nivelLabel[movement.nivel ?? 'jd_asamblea']}. {dosTercios ? 'Requiere aprobación de 2/3 de la Asamblea.' : 'Requiere acta de la Junta y de la Asamblea.'} Registra el acta de la Asamblea que lo refrendó.</p>
        <input value={acta} onChange={(e) => setActa(e.target.value)} placeholder="Acta de Asamblea No." className="mt-4 w-full rounded-xl border border-ink/12 bg-canvas/45 px-3 py-2.5 text-sm outline-none focus:border-night" autoFocus />
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-ink/60 hover:bg-canvas">Cancelar</button>
          <button onClick={() => acta.trim() && onConfirm(acta.trim())} disabled={!acta.trim()} className="rounded-xl bg-night px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-night-deep disabled:opacity-40">Aprobar</button>
        </div>
      </div>
    </div>
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
  const { addMovement, smmlv, presupuestos, movements } = useDemo()
  const categories = kind === 'Ingreso' ? incomeCategories : expenseCategories
  const [concept, setConcept] = useState('')
  const [category, setCategory] = useState(categories[0])
  const [amountText, setAmountText] = useState('')
  const [dateISO, setDateISO] = useState(todayISO())

  const amount = Number(amountText.replace(/\D/g, ''))

  // Control presupuestal (Art. 34 / RN-FIN-026): un egreso no puede exceder el
  // saldo disponible de su rubro; si el rubro no tiene presupuesto, se advierte.
  const esEgreso = kind === 'Egreso'
  const anual = esEgreso ? (presupuestos.find((p) => p.category === category)?.anual ?? 0) : 0
  const ejecutado = esEgreso ? ejecutadoRubro(movements, category) : 0
  const saldo = anual - ejecutado
  const sinPresupuesto = esEgreso && anual === 0
  const excedeSaldo = esEgreso && anual > 0 && amount > saldo

  const valid = concept.trim() !== '' && amount > 0 && dateISO !== '' && !excedeSaldo

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
          {kind === 'Egreso' && amount > 0 ? (
            <div className="rounded-xl border border-gold/25 bg-gold/[0.07] px-3 py-2.5 text-xs text-ink/65">
              Nivel de aprobación: <strong>{nivelLabel[nivelGasto(amount, smmlv)]}</strong>. Todo pago requiere firma de Presidente, Tesorero y Fiscal (Art. 35).
            </div>
          ) : null}
          {esEgreso ? (
            excedeSaldo ? (
              <div className="rounded-xl border border-rose-300 bg-rose-50 px-3 py-2.5 text-xs font-medium text-rose-700">
                El gasto excede el saldo del rubro <strong>{category}</strong>: disponible {formatCop(Math.max(0, saldo))} de {formatCop(anual)}. Sin autorización de la Asamblea no puede erogarse (Art. 34).
              </div>
            ) : sinPresupuesto ? (
              <div className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2.5 text-xs text-amber-700">
                El rubro <strong>{category}</strong> no tiene presupuesto asignado. Defínelo en Parámetros para controlar su ejecución.
              </div>
            ) : (
              <div className="rounded-xl border border-ink/10 bg-canvas/50 px-3 py-2.5 text-xs text-ink/60">
                Saldo del rubro <strong>{category}</strong>: {formatCop(Math.max(0, saldo))} disponible de {formatCop(anual)}.
              </div>
            )
          ) : null}
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
