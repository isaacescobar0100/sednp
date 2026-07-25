import React, { useState } from 'react'
import { AppShell } from './components/AppShell'
import { DemoProvider } from './store/DemoStore'
import { SessionProvider, useSession } from './store/session'
import { LoginScreen } from './components/LoginScreen'
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

type Auth = null | { type: 'directiva' } | { type: 'afiliado'; id: string }

export function App() {
  return (
    <SessionProvider>
      <DemoProvider>
        <AppBody />
      </DemoProvider>
    </SessionProvider>
  )
}

function AppBody() {
  const { setRole, canSeeModule } = useSession()
  const [auth, setAuth] = useState<Auth>(null)
  const [activeModule, setActiveModule] = useState<ModuleKey>('dashboard')

  if (!auth) {
    return (
      <LoginScreen
        onDirectivaLogin={(role) => {
          setRole(role)
          setAuth({ type: 'directiva' })
        }}
        onAfiliadoLogin={(id) => setAuth({ type: 'afiliado', id })}
      />
    )
  }

  if (auth.type === 'afiliado') {
    return <AfiliadoPortal affiliateId={auth.id} onLogout={() => setAuth(null)} />
  }

  // Si el rol activo no puede ver el módulo seleccionado (p. ej. tras cambiar de
  // rol), se muestra Dashboard sin borrar la selección previa.
  const effectiveModule: ModuleKey = canSeeModule(activeModule) ? activeModule : 'dashboard'

  return (
    <AppShell
      activeModule={effectiveModule}
      module={modules[effectiveModule]}
      onNavigate={setActiveModule}
      onLogout={() => setAuth(null)}
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
