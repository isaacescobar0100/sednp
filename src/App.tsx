import React, { useState } from 'react'
import { AppShell } from './components/AppShell'
import { DemoProvider, useDemo } from './store/DemoStore'
import { SessionProvider, useSession, Role } from './store/session'
import { AuthProvider, useAuth } from './store/auth'
import { AuthScreen } from './components/AuthScreen'
import { AfiliadoPortal } from './pages/AfiliadoPortal'
import { AfiliacionPage } from './pages/AfiliacionPage'
import { ComitesPage } from './pages/ComitesPage'
import { ComunicacionesPage } from './pages/ComunicacionesPage'
import { DashboardPage } from './pages/DashboardPage'
import { DisciplinarioPage } from './pages/DisciplinarioPage'
import { DocumentalPage } from './pages/DocumentalPage'
import { FinancieroPage } from './pages/FinancieroPage'
import { GobernanzaPage } from './pages/GobernanzaPage'
import { ParametrosPage } from './pages/ParametrosPage'
import { ReportesPage } from './pages/ReportesPage'
import { ModuleKey, ModuleMeta } from './types/navigation'

const modules: Record<ModuleKey, ModuleMeta> = {
  dashboard: { key: 'dashboard', label: 'Dashboard', subtitle: 'Resumen general de la organización' },
  afiliacion: { key: 'afiliacion', label: 'Afiliación', subtitle: 'Base y novedades de afiliados' },
  financiero: { key: 'financiero', label: 'Financiero', subtitle: 'Tesorería, recaudo y presupuesto' },
  gobernanza: { key: 'gobernanza', label: 'Gobernanza', subtitle: 'Sesiones, actas y decisiones' },
  disciplinario: { key: 'disciplinario', label: 'Disciplinario', subtitle: 'Expedientes y términos procesales' },
  comites: { key: 'comites', label: 'Comités', subtitle: 'Espacios de trabajo colaborativo' },
  comunicaciones: { key: 'comunicaciones', label: 'Comunicaciones', subtitle: 'Relación con afiliados' },
  documental: { key: 'documental', label: 'Documental', subtitle: 'Repositorio institucional' },
  reportes: { key: 'reportes', label: 'Reportes', subtitle: 'Análisis e indicadores consolidados' },
  parametros: { key: 'parametros', label: 'Parámetros', subtitle: 'Catálogos y datos maestros del sistema' },
}

export function App() {
  return (
    <AuthProvider>
      <DemoProvider>
        <Root />
      </DemoProvider>
    </AuthProvider>
  )
}

function Splash({ text }: { text?: string }) {
  return (
    <div className="flex h-screen w-full flex-col items-center justify-center gap-4 bg-canvas">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-night"><span className="font-display text-2xl font-bold text-gold">S</span></div>
      <p className="text-sm text-ink/50">{text ?? 'Cargando…'}</p>
    </div>
  )
}

function Root() {
  const { loading, session, profile } = useAuth()

  if (loading) return <Splash />
  if (!session) return <AuthScreen />
  if (!profile) return <Splash text="Preparando tu cuenta…" />

  if (profile.role === 'afiliado') return <AfiliadoGate />

  return (
    <SessionProvider role={profile.role as Role} userName={profile.full_name}>
      <DirectivaApp />
    </SessionProvider>
  )
}

// Portal del afiliado: vincula la cuenta autenticada con su ficha del padrón.
// Durante la migración, el enlace se hace por correo; luego será por user_id.
function AfiliadoGate() {
  const { session, signOut } = useAuth()
  const { affiliates } = useDemo()
  const email = session?.user.email?.trim().toLowerCase() ?? ''
  const me = affiliates.find((a) => a.email.trim().toLowerCase() === email)

  if (!me || me.status !== 'Activo') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-canvas p-6 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-night"><span className="font-display text-2xl font-bold text-gold">S</span></div>
        <p className="max-w-md text-sm text-ink/60">
          {!me
            ? 'Tu cuenta aún no está vinculada a una afiliación. La Secretaría debe registrarte con este correo y la Presidencia aprobar tu afiliación.'
            : me.status === 'Pendiente'
              ? 'Tu afiliación está pendiente de aprobación por la Junta Directiva.'
              : me.status === 'Suspendido'
                ? 'Tu afiliación está suspendida. Consulta con la Secretaría.'
                : 'Tu afiliación fue retirada.'}
        </p>
        <button onClick={signOut} className="rounded-xl bg-night px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-night-deep">Cerrar sesión</button>
      </div>
    )
  }
  return <AfiliadoPortal affiliateId={me.id} onLogout={signOut} />
}

function DirectivaApp() {
  const { canSeeModule } = useSession()
  const { signOut } = useAuth()
  const [activeModule, setActiveModule] = useState<ModuleKey>('dashboard')
  const effectiveModule: ModuleKey = canSeeModule(activeModule) ? activeModule : 'dashboard'

  return (
    <AppShell
      activeModule={effectiveModule}
      module={modules[effectiveModule]}
      onNavigate={setActiveModule}
      onLogout={signOut}
    >
      <ActivePage module={effectiveModule} />
    </AppShell>
  )
}

function ActivePage({ module }: { module: ModuleKey }) {
  switch (module) {
    case 'dashboard': return <DashboardPage />
    case 'afiliacion': return <AfiliacionPage />
    case 'financiero': return <FinancieroPage />
    case 'gobernanza': return <GobernanzaPage />
    case 'disciplinario': return <DisciplinarioPage />
    case 'comites': return <ComitesPage />
    case 'comunicaciones': return <ComunicacionesPage />
    case 'documental': return <DocumentalPage />
    case 'reportes': return <ReportesPage />
    case 'parametros': return <ParametrosPage />
  }
}
