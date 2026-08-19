import React, { useState } from 'react'
import { CheckCircle2Icon, CircleDollarSignIcon, DownloadIcon, FileTextIcon, IdCardIcon, LogOutIcon, MailIcon, VoteIcon } from 'lucide-react'
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
  const rows: Array<[string, string]> = [
    ['No. de solicitud', me.solicitudNo || '—'],
    ['Documento', me.doc],
    ['Correo', me.email],
    ['Teléfono', me.phone || '—'],
    ['Dirección', me.address || '—'],
    ['Cargo titular', me.cargoTitular || '—'],
    ['Cargo que ocupa', me.role || '—'],
    ['Dependencia', me.dependency || '—'],
    ['Tipo de vinculación', me.type || '—'],
    ['Asignación básica', me.asignacionBasica ? formatCop(me.asignacionBasica) : '—'],
    ['Fecha de vinculación', me.joinDate || '—'],
    ['Aprobación', me.aprobacionActa ? `Acta ${me.aprobacionActa}` : '—'],
  ]
  return (
    <section className="rounded-2xl border border-ink/[0.08] bg-white p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gold">Mi afiliación</p>
          <h1 className="mt-1 font-display text-2xl font-semibold text-ink">{me.name}</h1>
        </div>
        <StatusBadge tone={statusTone[me.status] ?? 'neutral'}>{me.status}</StatusBadge>
      </div>
      <dl className="mt-6 grid gap-x-8 gap-y-4 sm:grid-cols-2">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center gap-3 border-b border-ink/[0.06] pb-3">
            <IdCardIcon className="h-4 w-4 shrink-0 text-gold" />
            <div className="min-w-0">
              <dt className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink/40">{label}</dt>
              <dd className="truncate text-sm text-ink/80">{value}</dd>
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

  if (mine.length === 0) {
    return <EmptyState icon={CircleDollarSignIcon} text="Aún no tienes aportes registrados. La tesorería genera el corte de cada mes." />
  }

  return (
    <div className="space-y-5">
      <section className={`rounded-2xl border p-5 ${pendiente > 0 ? 'border-brick/25 bg-brick/[0.05]' : 'border-emerald-600/25 bg-emerald-50'}`}>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gold">Estado de cuenta</p>
        <h2 className="mt-1 font-display text-2xl font-semibold text-ink">{pendiente > 0 ? `Debes ${formatCop(pendiente)}` : 'Estás al día'}</h2>
        <p className="mt-1 text-sm text-ink/55">{pendiente > 0 ? 'Tienes aportes pendientes de pago.' : 'No tienes aportes pendientes. ¡Gracias!'}</p>
      </section>

      <div className="overflow-hidden rounded-2xl border border-ink/[0.08] bg-white">
        <div className="border-b border-ink/[0.07] px-5 py-4"><h3 className="font-display text-base font-semibold">Historial de aportes</h3></div>
        <div className="divide-y divide-ink/[0.07]">
          {mine.map((a) => (
            <article key={a.id} className="flex items-center justify-between gap-3 px-5 py-4">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-ink">{periodLabel(a.period)}{a.tipo === 'Extraordinaria' ? ` · extraordinaria${a.acta ? ` (Acta ${a.acta})` : ''}` : ''}{a.anticipada ? ' · anticipada (vacaciones)' : ''}</p>
                <p className="mt-0.5 text-xs text-ink/50">{formatCop(a.amount)}{a.status === 'Pagado' && a.method ? ` · pagado por ${a.method}` : ''}</p>
              </div>
              {a.status === 'Pagado' ? (
                <StatusBadge tone="positive">Pagado</StatusBadge>
              ) : (
                <button onClick={() => payAporte(a.id, 'Portal')} className="rounded-xl bg-night px-4 py-2 text-sm font-semibold text-white transition hover:bg-night-deep">Pagar {formatCop(a.amount)}</button>
              )}
            </article>
          ))}
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
    <section className="rounded-2xl border border-ink/[0.08] bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gold">Votación en curso</p>
          <h2 className="mt-1 font-display text-lg font-semibold">{ballot.title}</h2>
          <p className="mt-1 text-sm text-ink/50">Cierre: {ballot.closesAt}</p>
        </div>
        {voted ? <StatusBadge tone="positive">Ya votaste</StatusBadge> : null}
      </div>

      {voted ? (
        <div className="mt-5 space-y-3">
          <Bar label="A favor" pct={votePct(ballot.favor, total)} count={ballot.favor} color="bg-night" />
          <Bar label="En contra" pct={votePct(ballot.contra, total)} count={ballot.contra} color="bg-brick" />
          <Bar label="Abstención" pct={votePct(ballot.abstencion, total)} count={ballot.abstencion} color="bg-gold" />
          <p className="flex items-center gap-1.5 pt-1 text-xs text-emerald-700"><CheckCircle2Icon className="h-3.5 w-3.5" />Gracias por participar.</p>
        </div>
      ) : (
        <div className="mt-5 flex flex-wrap gap-2">
          {([['favor', 'A favor'], ['contra', 'En contra'], ['abstencion', 'Abstenerme']] as const).map(([choice, label]) => (
            <button key={choice} onClick={() => castAffiliateVote(ballot.id, choice, affiliateId)} className="rounded-xl border border-ink/12 px-4 py-2.5 text-sm font-semibold text-night transition hover:border-night hover:bg-night/5">{label}</button>
          ))}
        </div>
      )}
    </section>
  )
}

function Comunicados({ items }: { items: ReturnType<typeof useDemo>['comunicados'] }) {
  if (items.length === 0) return <EmptyState icon={MailIcon} text="No tienes comunicados por ahora." />
  return (
    <div className="overflow-hidden rounded-2xl border border-ink/[0.08] bg-white">
      <div className="divide-y divide-ink/[0.07]">
        {items.map((c) => (
          <article key={c.id} className="flex items-start gap-3 px-5 py-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-night/7"><MailIcon className="h-4 w-4 text-night" /></div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold text-ink">{c.subject}</h3>
              <p className="mt-1 text-xs text-ink/50">{c.audience} · {c.date}</p>
            </div>
            <StatusBadge tone={c.status === 'Entregado' ? 'positive' : 'warning'}>{c.status}</StatusBadge>
          </article>
        ))}
      </div>
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
        <article key={doc.id} className="rounded-xl border border-ink/[0.08] bg-white p-4">
          <div className="flex items-start justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold/12"><FileTextIcon className="h-5 w-5 text-[#9a6b20]" /></div>
            <StatusBadge tone="night">{doc.type}</StatusBadge>
          </div>
          <h2 className="mt-4 font-display text-sm font-semibold leading-snug text-ink">{doc.title}</h2>
          <p className="mt-2 text-xs text-ink/50">{doc.code}</p>
          <div className="mt-4 flex items-center justify-between border-t border-ink/[0.07] pt-3 text-xs text-ink/50">
            <span>{doc.date} · {formatFileSize(doc.fileSize)}</span>
            <button onClick={() => download(doc)} className="rounded-lg p-1.5 text-night transition hover:bg-canvas" aria-label={`Descargar ${doc.title}`}><DownloadIcon className="h-4 w-4" /></button>
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
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-ink/15 bg-white px-6 py-14 text-center">
      <Icon className="h-8 w-8 text-ink/25" />
      <p className="text-sm text-ink/50">{text}</p>
    </div>
  )
}
