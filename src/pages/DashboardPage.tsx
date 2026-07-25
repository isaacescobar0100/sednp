import React from 'react'
import { ArrowDownLeftIcon, ArrowUpRightIcon, CalendarDaysIcon, CircleDollarSignIcon, LucideIcon, ScaleIcon, UsersRoundIcon, VoteIcon, WalletCardsIcon } from 'lucide-react'
import { Area, AreaChart, Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { MetricCard } from '../components/MetricCard'
import { SectionTitle } from '../components/SectionTitle'
import { useDemo } from '../store/DemoStore'
import { useSession } from '../store/session'
import { expensesByCategory, formatCopShort, monthlyFlow } from '../store/finance'
import { memberCount } from '../store/committees'

type Kpi = { key: string; show: boolean; label: string; value: string; detail: string; icon: LucideIcon; tone: 'night' | 'gold' | 'green' | 'brick' }

export function DashboardPage() {
  const { stats, financeStats, disciplineStats, sessions, movements, affiliates, cases, comunicados, docs, ballots, committees } = useDemo()
  const { user, canSeeModule } = useSession()

  const firstName = user.name.split(' ')[0]
  const openBallots = ballots.filter((b) => b.status === 'En curso').length
  const showVoteAlert = canSeeModule('gobernanza') && openBallots > 0
  const upcomingSessions = sessions.filter((s) => s.status === 'Programada').slice(0, 4)
  const revenue = monthlyFlow(movements)
  const byCategory = expensesByCategory(movements)
  const hasCategory = byCategory.some((c) => c.value > 0)

  const activeDetail = stats.pending > 0 ? `${stats.pending} solicitud(es) en revisión` : 'Sin solicitudes pendientes'
  const caseDetail = disciplineStats.nearDue > 0 ? `${disciplineStats.nearDue} caso(s) próximo(s) a vencer` : 'Sin casos próximos a vencer'
  const hasDistribution = stats.distribution.some((d) => d.value > 0)

  // KPIs candidatos; se muestran solo los del ámbito visible para el rol (máx. 4).
  const casesToRule = cases.filter((c) => c.status === 'En trámite' && c.stageIndex === 3).length
  const committeeMembers = committees.reduce((s, c) => s + memberCount(c), 0)
  const kpis: Kpi[] = ([
    { key: 'afil-act', show: canSeeModule('afiliacion'), label: 'Afiliados activos', value: stats.active.toLocaleString('es-CO'), detail: activeDetail, icon: UsersRoundIcon, tone: 'night' },
    { key: 'recaudo', show: canSeeModule('financiero'), label: 'Recaudo confirmado', value: formatCopShort(financeStats.income), detail: `Por aprobar: ${formatCopShort(financeStats.pendingAmount)}`, icon: CircleDollarSignIcon, tone: 'gold' },
    { key: 'procesos', show: canSeeModule('disciplinario'), label: 'Procesos activos', value: String(disciplineStats.active), detail: caseDetail, icon: ScaleIcon, tone: 'brick' },
    { key: 'votaciones', show: canSeeModule('gobernanza'), label: 'Votaciones en curso', value: String(openBallots), detail: openBallots > 0 ? 'Participa antes del cierre' : 'Sin votaciones abiertas', icon: VoteIcon, tone: 'night' },
    { key: 'saldo', show: canSeeModule('financiero'), label: 'Saldo en caja', value: formatCopShort(financeStats.balance), detail: 'Ingresos − egresos pagados', icon: WalletCardsIcon, tone: 'green' },
    { key: 'por-aprobar', show: canSeeModule('financiero'), label: 'Gastos por aprobar', value: formatCopShort(financeStats.pendingAmount), detail: `${financeStats.pendingCount} pendiente(s)`, icon: ArrowDownLeftIcon, tone: 'brick' },
    { key: 'afil-pend', show: canSeeModule('afiliacion'), label: 'Afiliaciones pendientes', value: String(stats.pending), detail: 'Por aprobar', icon: UsersRoundIcon, tone: 'gold' },
    { key: 'por-vencer', show: canSeeModule('disciplinario'), label: 'Procesos por vencer', value: String(disciplineStats.nearDue), detail: '≤ 5 días de término', icon: ScaleIcon, tone: 'gold' },
    { key: 'egresos', show: canSeeModule('financiero'), label: 'Egresos pagados', value: formatCopShort(financeStats.expensesPaid), detail: 'Gastos ejecutados', icon: ArrowUpRightIcon, tone: 'night' },
    { key: 'fallo', show: canSeeModule('disciplinario'), label: 'Expedientes para fallo', value: String(casesToRule), detail: 'En etapa de decisión', icon: ScaleIcon, tone: 'brick' },
    { key: 'comites', show: canSeeModule('comites'), label: 'Comités', value: String(committees.length), detail: `${committeeMembers} integrantes`, icon: UsersRoundIcon, tone: 'night' },
    { key: 'total-exp', show: canSeeModule('disciplinario'), label: 'Total expedientes', value: String(cases.length), detail: 'En el sistema', icon: ScaleIcon, tone: 'night' },
  ] as Kpi[]).filter((k) => k.show).slice(0, 4)

  // Actividad reciente derivada de lo más nuevo en cada módulo.
  const recent: Array<{ title: string; detail: string; area: string }> = []
  if (comunicados[0]) recent.push({ title: 'Comunicado enviado', detail: `${comunicados[0].subject} · ${comunicados[0].audience}`, area: 'Comunicaciones' })
  if (movements[0]) recent.push({ title: movements[0].kind === 'Ingreso' ? 'Ingreso registrado' : 'Gasto registrado', detail: `${movements[0].concept} · ${movements[0].status}`, area: 'Financiero' })
  if (affiliates[0]) recent.push({ title: 'Afiliado registrado', detail: `${affiliates[0].name} · ${affiliates[0].status}`, area: 'Afiliación' })
  if (cases[0]) recent.push({ title: 'Expediente', detail: `${cases[0].code} · ${cases[0].subject}`, area: 'Disciplinario' })
  if (docs[0]) recent.push({ title: 'Documento cargado', detail: docs[0].code, area: 'Documental' })
  const recentActivity = recent.slice(0, 4)

  return (
    <div className="mx-auto max-w-[1440px]">
      <SectionTitle eyebrow="Resumen institucional" title={`Buen día, ${firstName}`} description="Resumen en tiempo real de la organización." />

      {showVoteAlert ? (
        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-gold/30 bg-gold/[0.08] px-5 py-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold/20"><VoteIcon className="h-5 w-5 text-[#9a6b20]" /></div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-ink">{openBallots} votación{openBallots > 1 ? 'es' : ''} en curso</p>
            <p className="text-xs text-ink/55">Hay consultas abiertas. Participa desde el módulo <strong>Gobernanza</strong> antes del cierre.</p>
          </div>
          <span className="shrink-0 rounded-full bg-gold/20 px-3 py-1 text-xs font-bold text-[#9a6b20]">Pendiente</span>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k) => <MetricCard key={k.key} label={k.label} value={k.value} detail={k.detail} icon={k.icon} tone={k.tone} />)}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <section className="rounded-2xl border border-ink/[0.08] bg-white p-5 xl:col-span-2">
          <div className="mb-5"><h2 className="font-display text-base font-semibold">Recaudo mensual</h2><p className="mt-1 text-xs text-ink/50">Ingresos confirmados por mes · millones COP</p></div>
          {revenue.length > 0 ? (
            <div className="h-64"><ResponsiveContainer width="100%" height="100%"><AreaChart data={revenue} margin={{ top: 8, right: 4, bottom: 0, left: -24 }}><defs><linearGradient id="revenueArea" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#C9973B" stopOpacity={0.34} /><stop offset="100%" stopColor="#C9973B" stopOpacity={0} /></linearGradient></defs><XAxis dataKey="month" tick={{ fontSize: 11, fill: '#768094' }} axisLine={false} tickLine={false} /><YAxis tickFormatter={(v) => `$${v}M`} tick={{ fontSize: 11, fill: '#768094' }} axisLine={false} tickLine={false} /><Tooltip formatter={(value: number) => [`$${value.toFixed(1)} M`, 'Recaudo']} contentStyle={{ borderRadius: 12, border: '1px solid #e8e7e2', fontSize: 12 }} /><Area type="monotone" dataKey="income" stroke="#C9973B" strokeWidth={2.5} fill="url(#revenueArea)" /></AreaChart></ResponsiveContainer></div>
          ) : <EmptyChart>Sin ingresos registrados aún.</EmptyChart>}
        </section>
        <section className="rounded-2xl border border-ink/[0.08] bg-white p-5"><h2 className="font-display text-base font-semibold">Tipo de vinculación</h2><p className="mt-1 text-xs text-ink/50">Distribución de afiliados activos</p>
          {hasDistribution ? (
            <>
              <div className="relative mt-2 h-44"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={stats.distribution} dataKey="value" innerRadius={50} outerRadius={70} paddingAngle={4} stroke="none">{stats.distribution.map((entry) => <Cell key={entry.name} fill={entry.color} />)}</Pie><Tooltip formatter={(value: number) => [`${value} afiliados`, '']} /></PieChart></ResponsiveContainer><div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"><span className="font-display text-xl font-semibold tabular-nums">{stats.active.toLocaleString('es-CO')}</span><span className="text-[10px] text-ink/45">activos</span></div></div>
              <div className="space-y-2">{stats.distribution.map((item) => <div className="flex items-center justify-between text-xs" key={item.name}><span className="flex items-center gap-2 text-ink/60"><i className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />{item.name}</span><span className="font-semibold text-ink">{item.value}</span></div>)}</div>
            </>
          ) : <EmptyChart>Sin afiliados activos aún.</EmptyChart>}
        </section>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <section className="rounded-2xl border border-ink/[0.08] bg-white p-5 xl:col-span-2"><div className="mb-5"><h2 className="font-display text-base font-semibold">Egresos por categoría</h2><p className="mt-1 text-xs text-ink/50">Gastos comprometidos (aprobados y pagados) · millones COP</p></div>
          {hasCategory ? (
            <div className="h-56"><ResponsiveContainer width="100%" height="100%"><BarChart data={byCategory} margin={{ top: 0, right: 8, bottom: 0, left: -22 }}><XAxis dataKey="category" tick={{ fontSize: 11, fill: '#768094' }} axisLine={false} tickLine={false} /><YAxis tickFormatter={(v) => `$${v}M`} tick={{ fontSize: 11, fill: '#768094' }} axisLine={false} tickLine={false} /><Tooltip formatter={(value: number) => [`$${value} M`, 'Egresos']} cursor={{ fill: '#F7F6F2' }} contentStyle={{ borderRadius: 12, border: '1px solid #e8e7e2', fontSize: 12 }} /><Bar dataKey="value" fill="#0F1B3D" radius={[6, 6, 0, 0]} barSize={30} /></BarChart></ResponsiveContainer></div>
          ) : <EmptyChart>Sin egresos registrados aún.</EmptyChart>}
        </section>
        <section className="rounded-2xl border border-ink/[0.08] bg-white p-5"><div className="mb-4 flex items-center justify-between"><div><h2 className="font-display text-base font-semibold">Próximas sesiones</h2><p className="mt-1 text-xs text-ink/50">Agenda de órganos directivos</p></div><CalendarDaysIcon className="h-5 w-5 text-gold" /></div><div className="space-y-3">{upcomingSessions.length > 0 ? upcomingSessions.map((s) => <AgendaItem key={s.id} date={`${s.day} ${s.month}`} title={s.title} detail={s.detail} />) : <p className="rounded-xl bg-canvas/60 px-4 py-6 text-center text-xs text-ink/45">No hay sesiones programadas.</p>}</div></section>
      </div>

      <section className="mt-6 rounded-2xl border border-ink/[0.08] bg-white p-5"><div className="mb-4 flex items-center justify-between"><div><h2 className="font-display text-base font-semibold">Actividad reciente</h2><p className="mt-1 text-xs text-ink/50">Últimos movimientos en la organización</p></div></div>
        {recentActivity.length > 0 ? (
          <div className="grid divide-y divide-ink/[0.07] md:grid-cols-2 md:divide-x md:divide-y-0">{recentActivity.map((item, index) => <div className={`flex gap-3 py-3 ${index % 2 ? 'md:pl-5' : 'md:pr-5'}`} key={item.title}><div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-gold" /><div className="min-w-0 flex-1"><p className="text-sm font-medium text-ink">{item.title}</p><p className="mt-1 text-xs text-ink/50">{item.detail}</p></div><span className="text-[10px] font-semibold uppercase tracking-wider text-ink/35">{item.area}</span></div>)}</div>
        ) : <p className="py-8 text-center text-sm text-ink/45">Sin actividad todavía. Empieza a registrar datos en los módulos.</p>}
      </section>
    </div>
  )
}

function EmptyChart({ children }: { children: React.ReactNode }) {
  return <div className="flex h-56 items-center justify-center rounded-xl bg-canvas/50 text-sm text-ink/40">{children}</div>
}

function AgendaItem({ date, title, detail }: { date: string; title: string; detail: string }) {
  return <div className="flex gap-3"><div className="w-10 rounded-lg bg-canvas py-1.5 text-center text-[10px] font-bold leading-tight text-night">{date}</div><div><p className="text-xs font-semibold text-ink">{title}</p><p className="mt-0.5 text-[11px] text-ink/50">{detail}</p></div></div>
}
