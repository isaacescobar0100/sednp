import React, { useState } from 'react'
import { BellIcon, ChevronDownIcon, SearchIcon } from 'lucide-react'
import { AppSidebar, MobileMenuButton } from './AppSidebar'
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
            <label className="relative hidden md:block">
              <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/40" />
              <input aria-label="Buscar en SIG-SERDNP" placeholder="Buscar" className="w-48 rounded-xl border border-ink/10 bg-white py-2 pl-9 pr-3 text-xs outline-none transition focus:border-night focus:ring-4 focus:ring-night/10" />
            </label>
            <button aria-label="Notificaciones" className="relative rounded-xl p-2 text-ink/60 transition hover:bg-white hover:text-night">
              <BellIcon className="h-5 w-5" strokeWidth={1.8} /><span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-brick" />
            </button>
            <button className="hidden items-center gap-1 text-xs font-medium text-ink/70 sm:flex"><span>Periodo 2026</span><ChevronDownIcon className="h-3.5 w-3.5" /></button>
          </div>
        </header>
        <main className="p-5 sm:p-8">{children}</main>
      </div>
    </div>
  )
}
