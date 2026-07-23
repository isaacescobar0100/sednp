import React from 'react'
import { ActivityIcon, CalendarDaysIcon, CircleDollarSignIcon, ScaleIcon, UsersRoundIcon } from 'lucide-react'
import { Area, AreaChart, Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { MetricCard } from '../components/MetricCard'
import { SectionTitle } from '../components/SectionTitle'
import { StatusBadge } from '../components/StatusBadge'
import { affiliateDistribution, budgetExecution, monthlyRevenue } from '../data/mockData'

const recentActivity = [
  ['Nueva afiliación aprobada', 'Juliana Ospina · hace 38 min', 'Afiliación'],
  ['Acta publicada', 'Sesión Junta Directiva 08 · hace 2 h', 'Gobernanza'],
  ['Gasto registrado', 'Taller de bienestar · hace 4 h', 'Financiero'],
  ['Comunicado enviado', 'Convocatoria Asamblea General · ayer', 'Comunicaciones'],
]

export function DashboardPage() {
  return (
    <div className="mx-auto max-w-[1440px]">
      <SectionTitle eyebrow="Resumen institucional" title="Buen día, María Fernanda" description="Aquí tienes el pulso de la organización al cierre de abril de 2026." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Afiliados activos" value="312" detail="+4 afiliaciones durante abril" icon={UsersRoundIcon} tone="night" />
        <MetricCard label="Recaudo mensual" value="$14,2 M" detail="8,6% más que el mes anterior" icon={CircleDollarSignIcon} tone="gold" />
        <MetricCard label="Ejecución presupuestal" value="68%" detail="Dentro del rango proyectado" icon={ActivityIcon} tone="green" />
        <MetricCard label="Procesos activos" value="3" detail="1 caso próximo a vencer" icon={ScaleIcon} tone="brick" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <section className="rounded-2xl border border-ink/[0.08] bg-white p-5 xl:col-span-2">
          <div className="mb-5 flex items-start justify-between"><div><h2 className="font-display text-base font-semibold">Recaudo mensual</h2><p className="mt-1 text-xs text-ink/50">Aportes sindicales en millones COP · últimos 12 meses</p></div><StatusBadge tone="positive">+8,6%</StatusBadge></div>
          <div className="h-64"><ResponsiveContainer width="100%" height="100%"><AreaChart data={monthlyRevenue} margin={{ top: 8, right: 4, bottom: 0, left: -24 }}><defs><linearGradient id="revenueArea" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#C9973B" stopOpacity={0.34}/><stop offset="100%" stopColor="#C9973B" stopOpacity={0}/></linearGradient></defs><XAxis dataKey="month" tick={{ fontSize: 11, fill: '#768094' }} axisLine={false} tickLine={false}/><YAxis tickFormatter={(v) => `$${v}M`} tick={{ fontSize: 11, fill: '#768094' }} axisLine={false} tickLine={false}/><Tooltip formatter={(value: number) => [`$${value.toFixed(1)} M`, 'Recaudo']} contentStyle={{ borderRadius: 12, border: '1px solid #e8e7e2', fontSize: 12 }}/><Area type="monotone" dataKey="value" stroke="#C9973B" strokeWidth={2.5} fill="url(#revenueArea)" /></AreaChart></ResponsiveContainer></div>
        </section>
        <section className="rounded-2xl border border-ink/[0.08] bg-white p-5"><h2 className="font-display text-base font-semibold">Tipo de vinculación</h2><p className="mt-1 text-xs text-ink/50">Distribución de afiliados activos</p><div className="relative mt-2 h-44"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={affiliateDistribution} dataKey="value" innerRadius={50} outerRadius={70} paddingAngle={4} stroke="none">{affiliateDistribution.map((entry) => <Cell key={entry.name} fill={entry.color}/>)}</Pie><Tooltip formatter={(value: number) => [`${value} afiliados`, '']}/></PieChart></ResponsiveContainer><div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"><span className="font-display text-xl font-semibold">312</span><span className="text-[10px] text-ink/45">activos</span></div></div><div className="space-y-2">{affiliateDistribution.map((item) => <div className="flex items-center justify-between text-xs" key={item.name}><span className="flex items-center gap-2 text-ink/60"><i className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }}/>{item.name}</span><span className="font-semibold text-ink">{item.value}</span></div>)}</div></section>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <section className="rounded-2xl border border-ink/[0.08] bg-white p-5 xl:col-span-2"><div className="mb-5"><h2 className="font-display text-base font-semibold">Ejecución por categoría</h2><p className="mt-1 text-xs text-ink/50">Presupuesto comprometido frente al plan anual</p></div><div className="h-56"><ResponsiveContainer width="100%" height="100%"><BarChart data={budgetExecution} margin={{ top: 0, right: 8, bottom: 0, left: -22 }}><XAxis dataKey="category" tick={{fontSize:11, fill:'#768094'}} axisLine={false} tickLine={false}/><YAxis unit="%" tick={{fontSize:11, fill:'#768094'}} axisLine={false} tickLine={false}/><Tooltip formatter={(value: number) => [`${value}%`, 'Ejecución']} cursor={{ fill: '#F7F6F2' }} contentStyle={{ borderRadius:12, border:'1px solid #e8e7e2', fontSize:12 }}/><Bar dataKey="value" fill="#0F1B3D" radius={[6,6,0,0]} barSize={30}/></BarChart></ResponsiveContainer></div></section>
        <section className="rounded-2xl border border-ink/[0.08] bg-white p-5"><div className="mb-4 flex items-center justify-between"><div><h2 className="font-display text-base font-semibold">Próximas sesiones</h2><p className="mt-1 text-xs text-ink/50">Agenda de órganos directivos</p></div><CalendarDaysIcon className="h-5 w-5 text-gold" /></div><div className="space-y-3"><AgendaItem date="08 MAY" title="Junta Directiva Ordinaria" detail="9:00 a. m. · Sala 4B"/><AgendaItem date="15 MAY" title="Comité de Bienestar" detail="2:00 p. m. · Virtual"/><AgendaItem date="30 MAY" title="Asamblea extraordinaria" detail="8:30 a. m. · Auditorio"/></div></section>
      </div>

      <section className="mt-6 rounded-2xl border border-ink/[0.08] bg-white p-5"><div className="mb-4 flex items-center justify-between"><div><h2 className="font-display text-base font-semibold">Actividad reciente</h2><p className="mt-1 text-xs text-ink/50">Movimientos relevantes en la organización</p></div><button className="text-xs font-semibold text-night hover:text-gold">Ver toda la actividad</button></div><div className="grid divide-y divide-ink/[0.07] md:grid-cols-2 md:divide-x md:divide-y-0">{recentActivity.map(([title, detail, area], index) => <div className={`flex gap-3 py-3 ${index % 2 ? 'md:pl-5' : 'md:pr-5'}`} key={title}><div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-gold"/><div className="min-w-0 flex-1"><p className="text-sm font-medium text-ink">{title}</p><p className="mt-1 text-xs text-ink/50">{detail}</p></div><span className="text-[10px] font-semibold uppercase tracking-wider text-ink/35">{area}</span></div>)}</div></section>
    </div>
  )
}

function AgendaItem({date,title,detail}:{date:string;title:string;detail:string}) { return <div className="flex gap-3"><div className="w-10 rounded-lg bg-canvas py-1.5 text-center text-[10px] font-bold leading-tight text-night">{date}</div><div><p className="text-xs font-semibold text-ink">{title}</p><p className="mt-0.5 text-[11px] text-ink/50">{detail}</p></div></div> }
