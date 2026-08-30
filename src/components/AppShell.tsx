import React, { useState } from 'react'
import { BellIcon, HistoryIcon, LogOutIcon, SearchIcon, ShieldCheckIcon } from 'lucide-react'
import { AppSidebar, MobileMenuButton } from './AppSidebar'
import { MfaSettings } from './MfaSettings'
import { AuditLog } from './AuditLog'
import { useDemo } from '../store/DemoStore'
import { roleLabel, useSession } from '../store/session'
import { ModuleKey, ModuleMeta } from '../types/navigation'

type AppShellProps = {
  activeModule: ModuleKey
  module: ModuleMeta
  onNavigate: (module: ModuleKey) => void
  onLogout: () => void
  children: React.ReactNode
}

export function AppShell({ activeModule, module, onNavigate, onLogout, children }: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [securityOpen, setSecurityOpen] = useState(false)
  const [auditOpen, setAuditOpen] = useState(false)
  const { role } = useSession()
  const canAudit = role === 'presidencia' || role === 'fiscal'

  return (
    <div className="min-h-screen w-full bg-canvas">
      <AppSidebar activeModule={activeModule} onNavigate={onNavigate} mobileOpen={mobileOpen} onMobileOpenChange={setMobileOpen} onLogout={onLogout} />
      <div className="min-h-screen lg:pl-[248px]">
        <header className="sticky top-0 z-20 flex h-[72px] items-center justify-between border-b border-ink/[0.08] bg-canvas/95 px-5 backdrop-blur sm:px-8">
          <div className="flex min-w-0 items-center gap-2 sm:gap-4">
            <MobileMenuButton onClick={() => setMobileOpen(true)} />
            <div className="min-w-0">
              <p className="truncate font-display text-sm font-semibold text-ink sm:text-base">{module.label}</p>
              <p className="hidden text-xs text-ink/50 sm:block">{module.subtitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <GlobalSearch onNavigate={onNavigate} />
            <UserChip />
            <NotificationsBell onNavigate={onNavigate} />
            {canAudit ? <AuditButton onClick={() => setAuditOpen(true)} /> : null}
            <SecurityButton onClick={() => setSecurityOpen(true)} />
            <LogoutButton onLogout={onLogout} />
          </div>
        </header>
        <main className="p-5 sm:p-8">{children}</main>
      </div>
      {securityOpen ? <MfaSettings onClose={() => setSecurityOpen(false)} /> : null}
      {auditOpen ? <AuditLog onClose={() => setAuditOpen(false)} /> : null}
    </div>
  )
}

function SecurityButton({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} title="Seguridad · verificación en dos pasos" aria-label="Seguridad" className="rounded-xl p-2 text-ink/60 transition hover:bg-white hover:text-night">
      <ShieldCheckIcon className="h-5 w-5" strokeWidth={1.8} />
    </button>
  )
}

function AuditButton({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} title="Auditoría · quién cambió qué" aria-label="Auditoría" className="rounded-xl p-2 text-ink/60 transition hover:bg-white hover:text-night">
      <HistoryIcon className="h-5 w-5" strokeWidth={1.8} />
    </button>
  )
}

function GlobalSearch({ onNavigate }: { onNavigate: (module: ModuleKey) => void }) {
  const { affiliates, docs } = useDemo()
  const { canSeeModule } = useSession()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const q = query.trim().toLowerCase()

  const results: Array<{ key: string; label: string; sub: string; module: ModuleKey }> = []
  if (q.length >= 2) {
    if (canSeeModule('afiliacion')) {
      affiliates.filter((a) => `${a.name} ${a.doc}`.toLowerCase().includes(q)).slice(0, 5).forEach((a) => results.push({ key: `a-${a.id}`, label: a.name, sub: `Afiliado · ${a.doc}`, module: 'afiliacion' }))
    }
    if (canSeeModule('documental')) {
      docs.filter((d) => `${d.title} ${d.code}`.toLowerCase().includes(q)).slice(0, 5).forEach((d) => results.push({ key: `d-${d.id}`, label: d.title, sub: `Documento · ${d.code}`, module: 'documental' }))
    }
  }

  function go(module: ModuleKey) {
    onNavigate(module)
    setOpen(false)
    setQuery('')
  }

  return (
    <div className="relative hidden md:block">
      <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/40" />
      <input
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        aria-label="Buscar afiliados o documentos"
        placeholder="Buscar afiliados, documentos…"
        className="w-56 rounded-xl border border-ink/10 bg-white py-2 pl-9 pr-3 text-xs outline-none transition focus:border-night focus:ring-4 focus:ring-night/10"
      />
      {open && q.length >= 2 ? (
        <>
          <button className="fixed inset-0 z-30 cursor-default" aria-hidden="true" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-11 z-40 max-h-80 w-80 overflow-y-auto rounded-xl border border-ink/10 bg-white py-1 shadow-xl shadow-night/10">
            {results.length > 0 ? (
              results.map((r) => (
                <button key={r.key} onClick={() => go(r.module)} className="flex w-full flex-col items-start px-4 py-2.5 text-left transition hover:bg-canvas">
                  <span className="text-sm font-medium text-ink">{r.label}</span>
                  <span className="text-xs text-ink/50">{r.sub}</span>
                </button>
              ))
            ) : (
              <p className="px-4 py-4 text-center text-xs text-ink/45">Sin resultados para "{query.trim()}".</p>
            )}
          </div>
        </>
      ) : null}
    </div>
  )
}

function NotificationsBell({ onNavigate }: { onNavigate: (module: ModuleKey) => void }) {
  const { stats, financeStats, movements, cases, ballots } = useDemo()
  const { can } = useSession()
  const [open, setOpen] = useState(false)

  const items: Array<{ label: string; module: ModuleKey }> = []
  if (can('affiliates.changeStatus') && stats.pending > 0) items.push({ label: `${stats.pending} afiliación(es) por aprobar`, module: 'afiliacion' })
  if (can('finance.approve') && financeStats.pendingCount > 0) items.push({ label: `${financeStats.pendingCount} gasto(s) por aprobar`, module: 'financiero' })
  if (can('finance.pay')) {
    const toPay = movements.filter((m) => m.kind === 'Egreso' && m.status === 'Aprobado').length
    if (toPay > 0) items.push({ label: `${toPay} gasto(s) por pagar`, module: 'financiero' })
  }
  if (can('discipline.rule')) {
    const toRule = cases.filter((c) => c.status === 'En trámite' && c.stageIndex === 4).length
    if (toRule > 0) items.push({ label: `${toRule} expediente(s) para fallo`, module: 'disciplinario' })
  }
  const openVotes = ballots.filter((b) => b.status === 'En curso').length
  if (openVotes > 0 && (can('governance.close') || can('governance.manage'))) {
    items.push({ label: `${openVotes} votación(es) ${can('governance.close') ? 'por cerrar' : 'en curso'}`, module: 'gobernanza' })
  }

  function go(module: ModuleKey) {
    onNavigate(module)
    setOpen(false)
  }

  return (
    <div className="relative">
      <button onClick={() => setOpen((v) => !v)} aria-label="Notificaciones" className="relative rounded-xl p-2 text-ink/60 transition hover:bg-white hover:text-night">
        <BellIcon className="h-5 w-5" strokeWidth={1.8} />
        {items.length > 0 ? <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-brick px-1 text-[10px] font-bold text-white">{items.length}</span> : null}
      </button>
      {open ? (
        <>
          <button className="fixed inset-0 z-30 cursor-default" aria-hidden="true" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-11 z-40 w-72 overflow-hidden rounded-xl border border-ink/10 bg-white py-1 shadow-xl shadow-night/10">
            <p className="px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-ink/40">Pendientes</p>
            {items.length > 0 ? (
              items.map((it) => (
                <button key={it.label} onClick={() => go(it.module)} className="flex w-full items-start gap-2.5 px-4 py-2.5 text-left transition hover:bg-canvas">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-gold" />
                  <span className="text-sm text-ink/75">{it.label}</span>
                </button>
              ))
            ) : (
              <p className="px-4 py-5 text-center text-xs text-ink/45">No tienes pendientes.</p>
            )}
          </div>
        </>
      ) : null}
    </div>
  )
}

function LogoutButton({ onLogout }: { onLogout: () => void }) {
  return (
    <button onClick={onLogout} title="Cerrar sesión" className="inline-flex items-center gap-1.5 rounded-xl border border-ink/10 px-2.5 py-2 text-xs font-semibold text-ink/60 transition hover:border-brick/30 hover:text-brick">
      <LogOutIcon className="h-3.5 w-3.5" /><span className="hidden lg:inline">Salir</span>
    </button>
  )
}

// Ficha del usuario autenticado (nombre + rol). Ya no hay cambiador de rol:
// cada persona opera con el rol de su cuenta.
function UserChip() {
  const { role, user } = useSession()
  return (
    <div className="inline-flex items-center gap-2 rounded-xl border border-ink/10 bg-white px-2 py-1.5">
      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-night font-display text-[11px] font-semibold text-gold">{user.initials}</div>
      <div className="hidden min-w-0 leading-tight sm:block">
        <p className="max-w-[140px] truncate text-xs font-semibold text-ink">{user.name}</p>
        <p className="text-[10px] text-ink/50">{roleLabel[role]}</p>
      </div>
    </div>
  )
}
