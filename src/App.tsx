import React, { Suspense, lazy, useEffect, useState } from 'react'
import { AppShell } from './components/AppShell'
import { DemoProvider, useDemo } from './store/DemoStore'
import { SessionProvider, useSession, Role } from './store/session'
import { AuthProvider, useAuth } from './store/auth'
import { AuthScreen } from './components/AuthScreen'
import { MfaChallenge } from './components/MfaChallenge'
import { SuperAdminScreen } from './components/SuperAdminPanel'
import { ModuleKey, ModuleMeta } from './types/navigation'

// Carga diferida por módulo (code-splitting): cada página se descarga solo
// cuando se abre, aligerando la primera carga.
const AfiliadoPortal = lazy(() => import('./pages/AfiliadoPortal').then((m) => ({ default: m.AfiliadoPortal })))
const AfiliacionPage = lazy(() => import('./pages/AfiliacionPage').then((m) => ({ default: m.AfiliacionPage })))
const ComitesPage = lazy(() => import('./pages/ComitesPage').then((m) => ({ default: m.ComitesPage })))
const ComunicacionesPage = lazy(() => import('./pages/ComunicacionesPage').then((m) => ({ default: m.ComunicacionesPage })))
const DashboardPage = lazy(() => import('./pages/DashboardPage').then((m) => ({ default: m.DashboardPage })))
const DisciplinarioPage = lazy(() => import('./pages/DisciplinarioPage').then((m) => ({ default: m.DisciplinarioPage })))
const DocumentalPage = lazy(() => import('./pages/DocumentalPage').then((m) => ({ default: m.DocumentalPage })))
const FinancieroPage = lazy(() => import('./pages/FinancieroPage').then((m) => ({ default: m.FinancieroPage })))
const GobernanzaPage = lazy(() => import('./pages/GobernanzaPage').then((m) => ({ default: m.GobernanzaPage })))
const ParametrosPage = lazy(() => import('./pages/ParametrosPage').then((m) => ({ default: m.ParametrosPage })))
const ReportesPage = lazy(() => import('./pages/ReportesPage').then((m) => ({ default: m.ReportesPage })))

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

// Marca en pantallas de carga: logo del sindicato si ya se conoce; si no, Sindika.
function BrandMark({ size = 56 }: { size?: number }) {
  const { org } = useAuth()
  const src = org?.logoUrl || '/sindika.png'
  return <img src={src} alt={org?.nombre ?? 'Sindika'} style={{ height: size }} className="w-auto object-contain" />
}

function Splash({ text }: { text?: string }) {
  return (
    <div className="flex h-screen w-full flex-col items-center justify-center gap-4 bg-canvas">
      <BrandMark size={56} />
      <p className="text-sm text-ink/50">{text ?? 'Cargando…'}</p>
    </div>
  )
}

function PageLoader() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <span className="h-8 w-8 animate-spin rounded-full border-2 border-ink/15 border-t-night" />
    </div>
  )
}

function Root() {
  const { loading, session, profile, org, needsMfa, signOut } = useAuth()

  // Pestaña del navegador (título + favicon) según el sindicato; si no, Sindika.
  useEffect(() => {
    document.title = org?.nombre ? `${org.nombre} · Sindika` : 'Sindika'
    const href = org?.logoUrl || '/sindika.png'
    let link = document.querySelector<HTMLLinkElement>("link[rel='icon']")
    if (!link) { link = document.createElement('link'); link.rel = 'icon'; document.head.appendChild(link) }
    link.href = href
  }, [org])

  if (loading) return <Splash />
  if (!session) return <AuthScreen />
  if (needsMfa) return <MfaChallenge />
  if (!profile) return <Splash text="Preparando tu cuenta…" />

  // Administrador de la plataforma (Sindika): pantalla propia, sin rol de sindicato.
  if (profile.platformAdmin) return <SuperAdminScreen />

  // Sindicato suspendido (p. ej. por falta de pago): se bloquea el acceso.
  if (org && !org.activo) return <SindicatoSuspendido onLogout={signOut} />

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
        <BrandMark size={56} />
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
  return (
    <Suspense fallback={<Splash />}>
      <AfiliadoPortal affiliateId={me.id} onLogout={signOut} />
    </Suspense>
  )
}

// Pantalla cuando el sindicato está suspendido (control de pago del SaaS).
function SindicatoSuspendido({ onLogout }: { onLogout: () => void }) {
  const { org } = useAuth()
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-canvas p-6 text-center">
      <BrandMark size={56} />
      <h1 className="font-display text-xl font-semibold text-ink">Acceso suspendido</h1>
      <p className="max-w-md text-sm text-ink/60">
        El acceso de <b>{org?.nombre ?? 'tu sindicato'}</b> está temporalmente suspendido.
        Para reactivarlo, comunícate con la administración de Sindika.
      </p>
      <button onClick={onLogout} className="rounded-xl bg-night px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-night-deep">Cerrar sesión</button>
    </div>
  )
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
      <Suspense fallback={<PageLoader />}>
        <ActivePage module={effectiveModule} />
      </Suspense>
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
