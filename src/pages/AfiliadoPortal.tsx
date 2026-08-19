import React, { useState } from 'react'
import { BadgeCheckIcon, Building2Icon, BriefcaseIcon, CalendarDaysIcon, CheckCircle2Icon, CircleDollarSignIcon, DownloadIcon, FileTextIcon, HashIcon, IdCardIcon, LogOutIcon, MailIcon, MapPinIcon, PhoneIcon, TagIcon, UserRoundIcon, VoteIcon, WalletIcon } from 'lucide-react'
import { useDemo } from '../store/DemoStore'
import { StatusBadge } from '../components/StatusBadge'
import { Ballot, totalVotes, votePct } from '../store/governance'
import { Doc, formatFileSize } from '../store/documents'
import { periodLabel } from '../store/contributions'
import { formatCop } from '../store/finance'

type Tab = 'perfil' | 'aportes' | 'votaciones' | 'comunicados' | 'documentos'

const tabs: Array<{ key: Tab; label: string }> = [
  { key: 'perfil', label: 'Mi perfil' },
  { key: 'aportes', label: 'Mis aportes' },
  { key: 'votaciones', label: 'Votaciones' },
  { key: 'comunicados', label: 'Comunicados' },
  { key: 'documentos', label: 'Documentos' },
]

const statusTone: Record<string, 'positive' | 'warning' | 'negative' | 'neutral'> = {
  Activo: 'positive', Pendiente: 'warning', Suspendido: 'warning', Retirado: 'negative',
}

export function AfiliadoPortal({ affiliateId, onLogout }: { affiliateId: string; onLogout: () => void }) {
  const { affiliates, ballots, comunicados, docs } = useDemo()
  const me = affiliates.find((a) => a.id === affiliateId)
  const [tab, setTab] = useState<Tab>('perfil')

  if (!me) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-canvas p-6 text-center">
        <p className="text-sm text-ink/60">Tu registro de afiliado ya no está disponible.</p>
        <button onClick={onLogout} className="rounded-xl bg-night px-4 py-2.5 text-sm font-semibold text-white">Volver al inicio</button>
      </div>
    )
  }

  const initials = me.name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase()
  const openBallots = ballots.filter((b) => b.status === 'En curso')
  const myComunicados = comunicados.filter((c) => /todos/i.test(c.audience) || /activos/i.test(c.audience))

  return (
    <div className="min-h-screen bg-canvas">
      <header className="border-b border-ink/[0.08] bg-night text-white">
        <div className="mx-auto flex max-w-[1100px] items-center justify-between px-5 py-4 sm:px-8">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gold"><span className="font-display text-lg font-bold text-night">S</span></div>
            <div>
              <p className="font-display text-sm font-semibold leading-tight tracking-[0.14em]">SERDNP</p>
              <p className="text-[11px] text-white/55">Portal del afiliado</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2.5 sm:flex">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gold/20 font-display text-xs font-semibold text-gold">{initials}</div>
              <div className="min-w-0"><p className="truncate text-xs font-semibold">{me.name}</p><p className="truncate text-[11px] text-white/50">Afiliado</p></div>
            </div>
            <button onClick={onLogout} className="flex items-center gap-1.5 rounded-xl border border-white/15 px-3 py-2 text-xs font-semibold text-white/80 transition hover:bg-white/10"><LogOutIcon className="h-3.5 w-3.5" />Salir</button>
          </div>
        </div>
        <div className="mx-auto flex max-w-[1100px] gap-1 px-5 sm:px-8">
          {tabs.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)} className={`relative px-3 py-3 text-sm font-medium transition ${tab === t.key ? 'text-white' : 'text-white/55 hover:text-white/80'}`}>
              {t.label}
              {tab === t.key ? <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-gold" /> : null}
            </button>
          ))}
        </div>
      </header>

      <main className="mx-auto max-w-[1100px] px-5 py-8 sm:px-8">
        {tab === 'perfil' ? <Perfil me={me} /> : null}
        {tab === 'aportes' ? <MisAportes affiliateId={me.id} /> : null}
        {tab === 'votaciones' ? <Votaciones ballots={openBallots} affiliateId={me.id} /> : null}
        {tab === 'comunicados' ? <Comunicados items={myComunicados} /> : null}
        {tab === 'documentos' ? <Documentos docs={docs} /> : null}
      </main>
    </div>
  )
}

function Perfil({ me }: { me: ReturnType<typeof useDemo>['affiliates'][number] }) {
  const { porcentajeCuota, aportes } = useDemo()
  const initials = me.name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase()
  const cuota = Math.round((me.asignacionBasica || 0) * porcentajeCuota)
  const misPendientes = aportes.filter((a) => a.affiliateId === me.id && a.status === 'Pendiente').length

  return (
    <div className="space-y-6">
      {/* Hero */}
      <section className="overflow-hidden rounded-3xl border border-ink/[0.08] bg-gradient-to-br from-night to-night-deep text-white shadow-[0_16px_40px_rgba(15,27,61,0.18)]">
        <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:p-8">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-gold font-display text-3xl font-bold text-night shadow-lg">{initials}</div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gold">Mi afiliación</p>
            <h1 className="mt-1 truncate font-display text-2xl font-semibold sm:text-3xl">{me.name}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 font-medium text-white/80"><HashIcon className="h-3.5 w-3.5 text-gold" />{me.solicitudNo || '—'}</span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 font-medium text-white/80"><TagIcon className="h-3.5 w-3.5 text-gold" />{me.type || '—'}</span>
              {me.aprobacionActa ? <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 font-medium text-white/80"><BadgeCheckIcon className="h-3.5 w-3.5 text-gold" />Acta {me.aprobacionActa}</span> : null}
            </div>
          </div>
          <div className="shrink-0 sm:self-start">
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${me.status === 'Activo' ? 'bg-emerald-400/20 text-emerald-200' : me.status === 'Retirado' ? 'bg-rose-400/20 text-rose-200' : 'bg-amber-400/20 text-amber-200'}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${me.status === 'Activo' ? 'bg-emerald-300' : me.status === 'Retirado' ? 'bg-rose-300' : 'bg-amber-300'}`} />{me.status}
            </span>
          </div>
        </div>
      </section>

      {/* Resumen */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={WalletIcon} label="Asignación básica" value={me.asignacionBasica ? formatCop(me.asignacionBasica) : '—'} />
        <StatCard icon={CircleDollarSignIcon} label={`Cuota mensual (${(porcentajeCuota * 100).toLocaleString('es-CO', { maximumFractionDigits: 2 })}%)`} value={cuota ? formatCop(cuota) : '—'} />
        <StatCard icon={CheckCircle2Icon} label="Aportes pendientes" value={misPendientes === 0 ? 'Al día' : `${misPendientes} pendiente(s)`} tone={misPendientes === 0 ? 'green' : 'gold'} />
        <StatCard icon={CalendarDaysIcon} label="Afiliado desde" value={me.joinDate || '—'} />
      </div>

      {/* Grupos de información */}
      <div className="grid gap-6 lg:grid-cols-2">
        <InfoCard title="Datos personales" icon={UserRoundIcon} items={[
          { icon: IdCardIcon, label: 'Documento', value: me.doc },
          { icon: MailIcon, label: 'Correo', value: me.email, truncate: true },
          { icon: PhoneIcon, label: 'Teléfono', value: me.phone || '—' },
          { icon: MapPinIcon, label: 'Dirección', value: me.address || '—' },
        ]} />
        <InfoCard title="Información laboral" icon={BriefcaseIcon} items={[
          { icon: BriefcaseIcon, label: 'Cargo titular', value: me.cargoTitular || '—' },
          { icon: BriefcaseIcon, label: 'Cargo que ocupa', value: me.role || '—' },
          { icon: Building2Icon, label: 'Dependencia', value: me.dependency || '—' },
          { icon: TagIcon, label: 'Tipo de vinculación', value: me.type || '—' },
        ]} />
      </div>

      <InfoCard title="Afiliación" icon={BadgeCheckIcon} columns={3} items={[
        { icon: HashIcon, label: 'No. de solicitud', value: me.solicitudNo || '—' },
        { icon: CalendarDaysIcon, label: 'Fecha de vinculación', value: me.joinDate || '—' },
        { icon: BadgeCheckIcon, label: 'Aprobación', value: me.aprobacionActa ? `Acta ${me.aprobacionActa}` : 'Pendiente' },
      ]} />
    </div>
  )
}

function StatCard({ icon: Icon, label, value, tone = 'night' }: { icon: typeof WalletIcon; label: string; value: string; tone?: 'night' | 'gold' | 'green' }) {
  const toneCls = tone === 'green' ? 'bg-emerald-50 text-emerald-600' : tone === 'gold' ? 'bg-gold/15 text-gold' : 'bg-canvas text-night'
  return (
    <div className="rounded-2xl border border-ink/[0.08] bg-white p-4">
      <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${toneCls}`}><Icon className="h-5 w-5" strokeWidth={1.8} /></div>
      <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink/40">{label}</p>
      <p className="mt-0.5 truncate font-display text-lg font-semibold text-ink">{value}</p>
    </div>
  )
}

type InfoItem = { icon: typeof WalletIcon; label: string; value: string; truncate?: boolean }

function InfoCard({ title, icon: Icon, items, columns = 2 }: { title: string; icon: typeof WalletIcon; items: InfoItem[]; columns?: 2 | 3 }) {
  return (
    <section className="rounded-2xl border border-ink/[0.08] bg-white p-5 sm:p-6">
      <div className="mb-4 flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-canvas text-night"><Icon className="h-4 w-4" strokeWidth={1.8} /></div>
        <h2 className="font-display text-sm font-semibold text-ink">{title}</h2>
      </div>
      <dl className={`grid gap-4 sm:grid-cols-2 ${columns === 3 ? 'lg:grid-cols-3' : ''}`}>
        {items.map((it) => (
          <div key={it.label} className="flex items-start gap-3">
            <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-canvas/70 text-gold"><it.icon className="h-3.5 w-3.5" strokeWidth={1.9} /></div>
            <div className="min-w-0">
              <dt className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink/40">{it.label}</dt>
              <dd className={`text-sm font-medium text-ink/85 ${it.truncate ? 'truncate' : 'break-words'}`}>{it.value}</dd>
            </div>
          </div>
        ))}
      </dl>
    </section>
  )
}

function MisAportes({ affiliateId }: { affiliateId: string }) {
  const { aportes, payAporte } = useDemo()
  const mine = aportes.filter((a) => a.affiliateId === affiliateId).sort((x, y) => (x.period < y.period ? 1 : -1))
  const pendiente = mine.filter((a) => a.status === 'Pendiente').reduce((s, a) => s + a.amount, 0)
  const pagadoTotal = mine.filter((a) => a.status === 'Pagado').reduce((s, a) => s + a.amount, 0)
  const alDia = pendiente === 0

  if (mine.length === 0) {
    return <EmptyState icon={CircleDollarSignIcon} text="Aún no tienes aportes registrados. La tesorería genera el corte de cada mes." />
  }

  return (
    <div className="space-y-6">
      {/* Estado de cuenta (hero) */}
      <section className={`overflow-hidden rounded-3xl border p-6 sm:p-8 ${alDia ? 'border-emerald-600/20 bg-gradient-to-br from-emerald-50 to-white' : 'border-brick/20 bg-gradient-to-br from-brick/[0.06] to-white'}`}>
        <div className="flex items-center gap-4">
          <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${alDia ? 'bg-emerald-600 text-white' : 'bg-brick text-white'}`}>
            {alDia ? <CheckCircle2Icon className="h-7 w-7" /> : <WalletIcon className="h-7 w-7" />}
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gold">Estado de cuenta</p>
            <h2 className="mt-0.5 font-display text-2xl font-semibold text-ink sm:text-3xl">{alDia ? 'Estás al día' : `Debes ${formatCop(pendiente)}`}</h2>
            <p className="mt-0.5 text-sm text-ink/55">{alDia ? 'No tienes aportes pendientes. ¡Gracias!' : 'Tienes aportes pendientes de pago.'}</p>
          </div>
        </div>
        <div className="mt-6 grid grid-cols-3 gap-4 border-t border-ink/[0.07] pt-5">
          <div><p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink/40">Total pagado</p><p className="mt-0.5 font-display text-lg font-semibold text-ink">{formatCop(pagadoTotal)}</p></div>
          <div><p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink/40">Pendiente</p><p className={`mt-0.5 font-display text-lg font-semibold ${alDia ? 'text-ink' : 'text-brick'}`}>{formatCop(pendiente)}</p></div>
          <div><p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink/40">Aportes</p><p className="mt-0.5 font-display text-lg font-semibold text-ink">{mine.length}</p></div>
        </div>
      </section>

      {/* Historial */}
      <div className="overflow-hidden rounded-2xl border border-ink/[0.08] bg-white">
        <div className="border-b border-ink/[0.07] px-5 py-4"><h3 className="font-display text-base font-semibold">Historial de aportes</h3></div>
        <div className="divide-y divide-ink/[0.07]">
          {mine.map((a) => {
            const pagado = a.status === 'Pagado'
            return (
              <article key={a.id} className="flex items-center gap-3 px-5 py-4">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${pagado ? 'bg-emerald-50 text-emerald-600' : 'bg-gold/15 text-gold'}`}><CircleDollarSignIcon className="h-5 w-5" /></div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-ink">{periodLabel(a.period)}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <span className="text-xs text-ink/50">{formatCop(a.amount)}</span>
                    {a.tipo === 'Extraordinaria' ? <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">Extraordinaria{a.acta ? ` · Acta ${a.acta}` : ''}</span> : null}
                    {a.anticipada ? <span className="rounded-md bg-sky-100 px-1.5 py-0.5 text-[10px] font-semibold text-sky-700">Anticipada · vacaciones</span> : null}
                    {pagado && a.method ? <span className="text-[11px] text-ink/40">· pagado por {a.method}</span> : null}
                  </div>
                </div>
                {pagado ? (
                  <StatusBadge tone="positive">Pagado</StatusBadge>
                ) : (
                  <button onClick={() => payAporte(a.id, 'Portal')} className="shrink-0 rounded-xl bg-night px-4 py-2 text-sm font-semibold text-white transition hover:bg-night-deep">Pagar {formatCop(a.amount)}</button>
                )}
              </article>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function Votaciones({ ballots, affiliateId }: { ballots: Ballot[]; affiliateId: string }) {
  if (ballots.length === 0) {
    return <EmptyState icon={VoteIcon} text="No hay votaciones abiertas en este momento." />
  }
  return <div className="space-y-5">{ballots.map((b) => <BallotVote key={b.id} ballot={b} affiliateId={affiliateId} />)}</div>
}

function BallotVote({ ballot, affiliateId }: { ballot: Ballot; affiliateId: string }) {
  const { castAffiliateVote } = useDemo()
  const voted = (ballot.votedBy ?? []).includes(affiliateId)
  const total = totalVotes(ballot)

  return (
    <section className="overflow-hidden rounded-2xl border border-ink/[0.08] bg-white">
      <div className="flex items-start justify-between gap-3 border-b border-ink/[0.07] p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold/15 text-gold"><VoteIcon className="h-5 w-5" /></div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gold">Votación en curso{ballot.secreta ? ' · secreta' : ''}</p>
            <h2 className="mt-0.5 font-display text-lg font-semibold leading-snug">{ballot.title}</h2>
            <p className="mt-1 text-xs text-ink/50">Cierre: {ballot.closesAt}</p>
          </div>
        </div>
        {voted ? <StatusBadge tone="positive">Ya votaste</StatusBadge> : null}
      </div>

      <div className="p-5">
        {voted ? (
          <div className="space-y-3">
            <Bar label="A favor" pct={votePct(ballot.favor, total)} count={ballot.favor} color="bg-night" />
            <Bar label="En contra" pct={votePct(ballot.contra, total)} count={ballot.contra} color="bg-brick" />
            <Bar label="Abstención" pct={votePct(ballot.abstencion, total)} count={ballot.abstencion} color="bg-gold" />
            <p className="flex items-center gap-1.5 pt-1 text-xs text-emerald-700"><CheckCircle2Icon className="h-3.5 w-3.5" />Gracias por participar.{ballot.secreta ? ' Tu voto es secreto.' : ''}</p>
          </div>
        ) : (
          <>
            <p className="mb-3 text-xs text-ink/45">Elige tu opción{ballot.secreta ? ' (voto secreto: no se revela tu elección)' : ''}:</p>
            <div className="grid gap-2 sm:grid-cols-3">
              {([['favor', 'A favor', 'hover:border-night hover:bg-night/5'], ['contra', 'En contra', 'hover:border-brick hover:bg-brick/5'], ['abstencion', 'Abstenerme', 'hover:border-gold hover:bg-gold/5']] as const).map(([choice, label, hover]) => (
                <button key={choice} onClick={() => castAffiliateVote(ballot.id, choice, affiliateId)} className={`rounded-xl border border-ink/12 px-4 py-3 text-sm font-semibold text-night transition ${hover}`}>{label}</button>
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  )
}

function Comunicados({ items }: { items: ReturnType<typeof useDemo>['comunicados'] }) {
  if (items.length === 0) return <EmptyState icon={MailIcon} text="No tienes comunicados por ahora." />
  return (
    <div className="space-y-3">
      {items.map((c) => (
        <article key={c.id} className="flex items-start gap-4 rounded-2xl border border-ink/[0.08] bg-white p-5 transition hover:shadow-[0_8px_24px_rgba(15,27,61,0.06)]">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-night text-white"><MailIcon className="h-5 w-5 text-gold" /></div>
          <div className="min-w-0 flex-1">
            <h3 className="font-display text-sm font-semibold text-ink">{c.subject}</h3>
            <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink/50"><span className="inline-flex items-center gap-1 rounded-full bg-canvas px-2 py-0.5 font-medium text-ink/60">{c.audience}</span><span>{c.date}</span></p>
          </div>
          <StatusBadge tone={c.status === 'Entregado' ? 'positive' : 'warning'}>{c.status}</StatusBadge>
        </article>
      ))}
    </div>
  )
}

function Documentos({ docs }: { docs: Doc[] }) {
  const { notify } = useDemo()
  if (docs.length === 0) return <EmptyState icon={FileTextIcon} text="No hay documentos publicados." />

  function download(doc: Doc) {
    if (doc.dataUrl) {
      const a = document.createElement('a')
      a.href = doc.dataUrl
      a.download = doc.fileName
      a.click()
      notify(`Descargando ${doc.fileName}…`, 'info')
      return
    }
    const body = `SIG-SERDNP\nDocumento: ${doc.title}\nCódigo: ${doc.code}\nArchivo: ${doc.fileName}\n\nFicha de referencia (archivo no almacenado en la demo).`
    const url = URL.createObjectURL(new Blob([body], { type: 'text/plain;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `${doc.code}.txt`
    a.click()
    URL.revokeObjectURL(url)
    notify(`Descargando ficha de ${doc.code}…`, 'info')
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {docs.map((doc) => (
        <article key={doc.id} className="flex flex-col rounded-2xl border border-ink/[0.08] bg-white p-5 transition hover:shadow-[0_8px_24px_rgba(15,27,61,0.06)]">
          <div className="flex items-start justify-between">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gold/15 text-gold"><FileTextIcon className="h-5 w-5" /></div>
            <StatusBadge tone="night">{doc.type}</StatusBadge>
          </div>
          <h2 className="mt-4 font-display text-sm font-semibold leading-snug text-ink">{doc.title}</h2>
          <p className="mt-1 font-mono text-[11px] text-ink/45">{doc.code}</p>
          <div className="mt-4 flex items-center justify-between border-t border-ink/[0.07] pt-3">
            <span className="text-xs text-ink/50">{doc.date} · {formatFileSize(doc.fileSize)}</span>
            <button onClick={() => download(doc)} className="inline-flex items-center gap-1.5 rounded-lg border border-ink/12 px-2.5 py-1.5 text-xs font-semibold text-night transition hover:border-night hover:bg-canvas" aria-label={`Descargar ${doc.title}`}><DownloadIcon className="h-3.5 w-3.5" />Descargar</button>
          </div>
        </article>
      ))}
    </div>
  )
}

function Bar({ label, pct, count, color }: { label: string; pct: number; count: number; color: string }) {
  return (
    <div>
      <div className="mb-1.5 flex justify-between text-xs"><span className="font-semibold text-ink/70">{label}</span><span className="text-ink/55">{pct}% · {count} votos</span></div>
      <div className="h-2.5 overflow-hidden rounded-full bg-canvas"><div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} /></div>
    </div>
  )
}

function EmptyState({ icon: Icon, text }: { icon: typeof VoteIcon; text: string }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-3xl border border-dashed border-ink/15 bg-white px-6 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-canvas text-ink/30"><Icon className="h-7 w-7" /></div>
      <p className="max-w-sm text-sm text-ink/50">{text}</p>
    </div>
  )
}
