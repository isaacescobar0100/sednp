import React, { useState } from 'react'
import { AppShell } from './components/AppShell'
import { LoginScreen } from './components/LoginScreen'
import { AfiliacionPage } from './pages/AfiliacionPage'
import { ComitesPage } from './pages/ComitesPage'
import { ComunicacionesPage } from './pages/ComunicacionesPage'
import { DashboardPage } from './pages/DashboardPage'
import { DisciplinarioPage } from './pages/DisciplinarioPage'
import { DocumentalPage } from './pages/DocumentalPage'
import { FinancieroPage } from './pages/FinancieroPage'
import { GobernanzaPage } from './pages/GobernanzaPage'
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
}

export function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [activeModule, setActiveModule] = useState<ModuleKey>('dashboard')

  if (!isLoggedIn) {
    return <LoginScreen onLogin={() => setIsLoggedIn(true)} />
  }

  return (
    <AppShell
      activeModule={activeModule}
      module={modules[activeModule]}
      onNavigate={setActiveModule}
      onLogout={() => setIsLoggedIn(false)}
    >
      <ActivePage module={activeModule} />
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
  }
}
