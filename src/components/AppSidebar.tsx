import React from 'react'
import {
  BarChart3Icon,
  BellIcon,
  BriefcaseBusinessIcon,
  FileCheck2Icon,
  FolderArchiveIcon,
  GavelIcon,
  LandmarkIcon,
  LayoutDashboardIcon,
  LogOutIcon,
  MenuIcon,
  SlidersHorizontalIcon,
  UsersRoundIcon,
  XIcon,
} from 'lucide-react'
import { ModuleKey } from '../types/navigation'
import { roleLabel, useSession } from '../store/session'
import { useAuth } from '../store/auth'

type AppSidebarProps = {
  activeModule: ModuleKey
  onNavigate: (module: ModuleKey) => void
  mobileOpen: boolean
  onMobileOpenChange: (isOpen: boolean) => void
  onLogout: () => void
}

const items: Array<{ key: ModuleKey; label: string; icon: typeof LayoutDashboardIcon }> = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboardIcon },
  { key: 'afiliacion', label: 'Afiliación', icon: UsersRoundIcon },
  { key: 'financiero', label: 'Financiero', icon: LandmarkIcon },
  { key: 'gobernanza', label: 'Gobernanza', icon: BriefcaseBusinessIcon },
  { key: 'disciplinario', label: 'Disciplinario', icon: GavelIcon },
  { key: 'comites', label: 'Comités', icon: FileCheck2Icon },
  { key: 'comunicaciones', label: 'Comunicaciones', icon: BellIcon },
  { key: 'documental', label: 'Documental', icon: FolderArchiveIcon },
  { key: 'reportes', label: 'Reportes', icon: BarChart3Icon },
  { key: 'parametros', label: 'Parámetros', icon: SlidersHorizontalIcon },
]

export function MobileMenuButton({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="rounded-lg p-2 text-ink/65 lg:hidden" aria-label="Abrir navegación">
      <MenuIcon className="h-5 w-5" />
    </button>
  )
}

export function AppSidebar({ activeModule, onNavigate, mobileOpen, onMobileOpenChange, onLogout }: AppSidebarProps) {
  const { user, role, canSeeModule } = useSession()
  const { org } = useAuth()
  const brandName = org?.nombre ?? 'SERDNP'
  // Logo del sindicato si lo tiene; si no, el de Sindika. (org null = contexto SERDNP.)
  const brandLogo = org ? (org.logoUrl || '/sindika.png') : '/logo.png'
  const visibleItems = items.filter((item) => canSeeModule(item.key))
  return (
    <>
      {mobileOpen ? <button aria-label="Cerrar navegación" onClick={() => onMobileOpenChange(false)} className="fixed inset-0 z-30 bg-night/35 lg:hidden" /> : null}
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-[248px] flex-col overflow-hidden bg-night text-white transition-transform duration-200 lg:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="relative border-b border-white/10 px-5 pb-5 pt-6">
          <button className="absolute right-3 top-4 rounded-lg p-2 text-white/60 lg:hidden" onClick={() => onMobileOpenChange(false)} aria-label="Cerrar navegación">
            <XIcon className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white p-1 shadow-sm">
              <img src={brandLogo} alt={brandName} className="h-full w-full object-contain" />
            </div>
            <span className="min-w-0 font-display text-sm font-semibold leading-tight tracking-[0.03em] line-clamp-2">{brandName}</span>
          </div>
          <div className="mt-4 flex h-0.5 w-28 overflow-hidden rounded-full">
            <span className="flex-1 bg-gold" /><span className="flex-1 bg-[#3D5AAE]" /><span className="flex-1 bg-brick" />
          </div>
        </div>

        <nav className="scroll-slim relative z-10 flex-1 space-y-1 overflow-y-auto overscroll-contain px-3 py-5" aria-label="Módulos principales">
          <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">Gestión sindical</p>
          {visibleItems.map(({ key, label, icon: Icon }) => {
            const active = activeModule === key
            return (
              <button key={key} onClick={() => { onNavigate(key); onMobileOpenChange(false) }} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition ${active ? 'bg-white/12 font-semibold text-white shadow-sm' : 'text-white/62 hover:bg-white/7 hover:text-white'}`}>
                <Icon className={`h-[18px] w-[18px] ${active ? 'text-gold' : 'text-white/50'}`} strokeWidth={1.8} />
                {label}
              </button>
            )
          })}
        </nav>

        <div aria-hidden="true" className="pointer-events-none absolute bottom-0 left-0 right-0 h-32 opacity-55">
          <svg viewBox="0 0 248 120" preserveAspectRatio="none" className="h-full w-full">
            <path d="M0 84 L28 52 L57 74 L90 28 L122 76 L153 43 L184 72 L216 34 L248 66 L248 120 L0 120 Z" fill="#16244F" />
            <path d="M0 100 L39 67 L76 100 L112 54 L151 101 L188 66 L224 94 L248 77 L248 120 L0 120 Z" fill="#0A1230" />
          </svg>
        </div>
        <div className="relative z-10 border-t border-white/10 p-3">
          <div className="mb-2 flex items-center gap-3 px-2 py-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gold/20 font-display text-xs font-semibold text-gold">{user.initials}</div>
            <div className="min-w-0"><p className="truncate text-xs font-semibold">{user.name}</p><p className="truncate text-[11px] text-white/50">{roleLabel[role]}</p></div>
          </div>
          <button onClick={onLogout} className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-sm text-white/58 transition hover:bg-white/7 hover:text-white">
            <LogOutIcon className="h-4 w-4" /> Cerrar sesión
          </button>
          <p className="mt-2 px-2 text-center text-[10px] text-white/30">con tecnología de <span className="font-semibold text-white/50">Sindika</span></p>
        </div>
      </aside>
    </>
  )
}
