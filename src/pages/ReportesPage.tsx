import React from 'react'
import { DownloadIcon, ScaleIcon, UsersRoundIcon, WalletCardsIcon, CircleDollarSignIcon } from 'lucide-react'
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { MetricCard } from '../components/MetricCard'
import { SectionTitle } from '../components/SectionTitle'
import { useDemo } from '../store/DemoStore'
import { formatCopShort } from '../store/finance'
import { CaseStatus } from '../store/discipline'
import { memberCount } from '../store/committees'

export function ReportesPage() {
  const { stats, financeStats, disciplineStats, cases, ballots, docs, comunicados, committees } = useDemo()

  const affiliatesByStatus = [
    { name: 'Activos', value: stats.active, color: '#0F1B3D' },
    { name: 'Pendientes', value: stats.pending, color: '#C9973B' },
    { name: 'Suspendidos', value: stats.suspended, color: '#B23A3A' },
    { name: 'Retirados', value: stats.retired, color: '#768094' },
  ]

  const financeCompare = [
    { name: 'Ingresos', value: +(financeStats.income / 1_000_000).toFixed(1), color: '#0F1B3D' },
    { name: 'Egresos pagados', value: +(financeStats.expensesPaid / 1_000_000).toFixed(1), color: '#C9973B' },
    { name: 'Por aprobar', value: +(financeStats.pendingAmount / 1_000_000).toFixed(1), color: '#B23A3A' },
  ]

  const caseStatuses: CaseStatus[] = ['En trámite', 'Sancionado', 'Absuelto', 'Archivado']
  const casesByStatus = caseStatuses.map((s) => ({ status: s, count: cases.filter((c) => c.status === s).length }))
  const openBallots = ballots.filter((b) => b.status === 'En curso').length
  const closedBallots = ballots.filter((b) => b.status === 'Cerrada').length
  const totalMembers = committees.reduce((acc, c) => acc + memberCount(c), 0)
  const commRecipients = comunicados.reduce((acc, c) => acc + c.recipients, 0)

  function exportCsv() {
    const rows: Array<[string, string | number]> = [
      ['Indicador', 'Valor'],
      ['Afiliados activos', stats.active],
      ['Afiliados pendientes', stats.pending],
      ['Afiliados suspendidos', stats.suspended],
      ['Afiliados retirados', stats.retired],
      ['Total padrón', stats.total],
      ['Ingresos confirmados (COP)', financeStats.income],
      ['Egresos pagados (COP)', financeStats.expensesPaid],
      ['Gastos por aprobar (COP)', financeStats.pendingAmount],
      ['Saldo en caja (COP)', financeStats.balance],
      ['Procesos disciplinarios activos', disciplineStats.active],
      ['Procesos próximos a vencer', disciplineStats.nearDue],
      ['Votaciones en curso', openBallots],
      ['Votaciones cerradas', closedBallots],
      ['Documentos en repositorio', docs.length],
      ['Comunicados enviados', comunicados.length],
      ['Comités', committees.length],
      ['Integrantes en comités', totalMembers],
    ]
    const csv = rows.map((r) => r.join(';')).join('\n')
    const url = URL.createObjectURL(new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'reporte-consolidado-serdnp.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="mx-auto max-w-[1440px]">
      <SectionTitle
        eyebrow="Análisis institucional"
        title="Reportes"
        description="Indicadores consolidados en tiempo real desde todos los módulos."
        action={
          <button onClick={exportCsv} className="inline-flex items-center gap-2 rounded-xl bg-night px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-night/15 transition hover:bg-night-deep">
            <DownloadIcon className="h-4 w-4" />
            Exportar CSV
          </button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Afiliados activos" value={stats.active.toLocaleString('es-CO')} detail={`${stats.total} en el padrón`} icon={UsersRoundIcon} tone="night" />
        <MetricCard label="Recaudo confirmado" value={formatCopShort(financeStats.income)} detail={`Por aprobar: ${formatCopShort(financeStats.pendingAmount)}`} icon={CircleDollarSignIcon} tone="gold" />
        <MetricCard label="Saldo en caja" value={formatCopShort(financeStats.balance)} detail="Ingresos − egresos pagados" icon={WalletCardsIcon} tone="green" />
        <MetricCard label="Procesos activos" value={String(disciplineStats.active)} detail={`${disciplineStats.nearDue} próximo(s) a vencer`} icon={ScaleIcon} tone="brick" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <ReportCard title="Afiliados por estado" detail="Distribución actual del padrón">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={affiliatesByStatus} margin={{ top: 8, right: 5, bottom: 0, left: -20 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#768094' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#768094' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip formatter={(v: number) => [`${v} afiliados`, '']} contentStyle={{ borderRadius: 12, border: '1px solid #e8e7e2', fontSize: 12 }} cursor={{ fill: '#F7F6F2' }} />
                <Bar dataKey="value" radius={[5, 5, 0, 0]} barSize={40}>
                  {affiliatesByStatus.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ReportCard>

        <ReportCard title="Comparativo financiero" detail="Millones COP · en tiempo real">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={financeCompare} margin={{ top: 8, right: 5, bottom: 0, left: -20 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#768094' }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={(v) => `$${v}M`} tick={{ fontSize: 11, fill: '#768094' }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v: number) => [`$${v} M`, '']} contentStyle={{ borderRadius: 12, border: '1px solid #e8e7e2', fontSize: 12 }} cursor={{ fill: '#F7F6F2' }} />
                <Bar dataKey="value" radius={[5, 5, 0, 0]} barSize={40}>
                  {financeCompare.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ReportCard>
      </div>

      <section className="mt-6 rounded-2xl border border-ink/[0.08] bg-white p-5">
        <h2 className="font-display text-base font-semibold">Resumen operativo consolidado</h2>
        <p className="mt-1 text-xs text-ink/50">Cifras vivas de todos los módulos del sistema</p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatTile label="Expedientes disciplinarios" items={casesByStatus.map((c) => [c.status, c.count])} />
          <StatTile label="Votaciones" items={[['En curso', openBallots], ['Cerradas', closedBallots]]} />
          <StatTile label="Gobernanza documental" items={[['Documentos', docs.length], ['Comunicados', comunicados.length], ['Destinatarios', commRecipients]]} />
          <StatTile label="Comités" items={[['Comités activos', committees.length], ['Integrantes', totalMembers]]} />
        </div>
        <p className="mt-6 border-t border-ink/[0.07] pt-4 text-xs text-ink/50">Fuente: datos operativos del sistema al momento de la consulta. Exporta el consolidado en CSV con el botón superior.</p>
      </section>
    </div>
  )
}

function ReportCard({ title, detail, children }: { title: string; detail: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-ink/[0.08] bg-white p-5">
      <h2 className="font-display text-base font-semibold">{title}</h2>
      <p className="mt-1 text-xs text-ink/50">{detail}</p>
      <div className="mt-4">{children}</div>
    </section>
  )
}

function StatTile({ label, items }: { label: string; items: Array<[string, number]> }) {
  return (
    <div className="rounded-xl border border-ink/[0.08] bg-canvas/40 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink/45">{label}</p>
      <dl className="mt-3 space-y-1.5">
        {items.map(([name, value]) => (
          <div key={name} className="flex items-center justify-between text-sm">
            <dt className="text-ink/60">{name}</dt>
            <dd className="font-semibold tabular-nums text-ink">{value.toLocaleString('es-CO')}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
