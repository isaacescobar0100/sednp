import React, { Suspense, lazy, useEffect, useState } from 'react'
import { AppShell } from './components/AppShell'
import { DemoProvider, useDemo } from './store/DemoStore'
import { SessionProvider, useSession, Role } from './store/session'
import { AuthProvider, useAuth } from './store/auth'
import { AuthScreen } from './components/AuthScreen'
import { MfaChallenge } from './components/MfaChallenge'
import { SuperAdminScreen } from './components/SuperAdminPanel'
import { PublicRegistroPage } from './pages/PublicRegistroPage'
import { PublicSite } from './components/PublicSite'
import { logoCacheado, marcaCacheada } from './store/brandCache'
import { esEntradaAdmin, esHostPlataforma, hostPerteneceASindicato, urlDeSindicato } from './store/platform'
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
const LibroPage = lazy(() => import('./pages/LibroPage').then((m) => ({ default: m.LibroPage })))
const PublicacionesPage = lazy(() => import('./pages/PublicacionesPage').then((m) => ({ default: m.PublicacionesPage })))
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
  libro: { key: 'libro', label: 'Libro de Actas y Resoluciones', subtitle: 'Registro inmutable de actos institucionales' },
  publicaciones: { key: 'publicaciones', label: 'Página web', subtitle: 'Publicaciones del sitio público (CMS)' },
  reportes: { key: 'reportes', label: 'Reportes', subtitle: 'Análisis e indicadores consolidados' },
  parametros: { key: 'parametros', label: 'Parámetros', subtitle: 'Catálogos y datos maestros del sistema' },
}

export function App() {
  const params = new URLSearchParams(window.location.search)
  // Link público de auto-afiliación: .../?afiliacion=<slug> → formulario público.
  const slugAfiliacion = params.get('afiliacion')
  if (slugAfiliacion) return <PublicRegistroPage slug={slugAfiliacion} />
  return <RootSwitcher />
}

// La cara pública (sitio web) es lo primero que se ve. "Ingresar" (o
// .../?app=1 / #app) entra al sistema (login o, si hay sesión, al panel).
// La ENTRADA DE PLATAFORMA (host de plataforma o /admin) lleva directo al login
// de administración de Sindika. Ver store/platform.ts.

// ¿Hay una sesión de Supabase guardada? (token en localStorage). Sirve para que,
// en el dominio pelado, un usuario ya autenticado entre directo al sistema y la
// URL quede limpia (sin /app), mientras que un visitante ve la web pública.
function tieneSesionGuardada(): boolean {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && k.startsWith('sb-') && k.endsWith('-auth-token') && localStorage.getItem(k)) return true
    }
  } catch { /* sin storage */ }
  return false
}

function RootSwitcher() {
  const [path, setPath] = useState(() => window.location.pathname)
  useEffect(() => {
    const onPop = () => setPath(window.location.pathname)
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])
  // El sistema usa URLs limpias por módulo (ej. /parametros), sin prefijo /app.
  // Con sesión iniciada, la raíz y las rutas de módulo entran al sistema; el sitio
  // público se ve sin sesión, o forzado con ?web=1 (para que un directivo vea su web).
  const params = new URLSearchParams(window.location.search)
  const forcePublic = params.get('web') === '1'
  const primerSeg = path.replace(/^\//, '').split('/')[0]
  const esModulo = Object.prototype.hasOwnProperty.call(modules, primerSeg)
  const appMode = !forcePublic && (
    path === '/ingresar' || path === '/app' || path.startsWith('/app/') ||
    params.get('app') === '1' || window.location.hash === '#app' ||
    esEntradaAdmin() ||
    (tieneSesionGuardada() && (path === '/' || esModulo))
  )
  const enter = () => { window.history.pushState({}, '', '/ingresar'); setPath('/ingresar') }
  if (appMode) {
    return (
      <AuthProvider>
        <DemoProvider>
          <Root />
        </DemoProvider>
      </AuthProvider>
    )
  }
  return <PublicSite onEnter={enter} />
}

// Marca en pantallas de carga: logo del sindicato si ya se conoce; si no, Sindika.
function BrandMark({ size = 56 }: { size?: number }) {
  const { org } = useAuth()
  const src = org?.logoUrl || logoCacheado()
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
    // El administrador de la plataforma SIEMPRE ve la marca Sindika en la pestaña,
    // aunque su cuenta pertenezca a un sindicato. Los demás ven la de su sindicato.
    // Marca Sindika si eres admin O estás en el host de plataforma (aunque el
    // perfil aún no cargue), para que la pestaña nunca muestre un sindicato ahí.
    const esAdmin = Boolean(profile?.platformAdmin) || esHostPlataforma()
    document.title = esAdmin ? 'Sindika' : (org?.nombre || marcaCacheada()?.nombre || 'Sindika')
    const href = esAdmin ? '/sindika.png' : (org?.logoUrl || logoCacheado())
    let link = document.querySelector<HTMLLinkElement>("link[rel='icon']")
    if (!link) { link = document.createElement('link'); link.rel = 'icon'; document.head.appendChild(link) }
    link.href = href
  }, [org, profile?.platformAdmin])

  if (loading) return <Splash />
  if (!session) return <AuthScreen />
  if (needsMfa) return <MfaChallenge />
  if (!profile) return <Splash text="Preparando tu cuenta…" />

  // Administrador de la plataforma (Sindika): pantalla propia, sin rol de sindicato.
  if (profile.platformAdmin) return <SuperAdminScreen />

  // La cuenta pertenece a OTRO sindicato: no puede entrar por esta puerta.
  // (Los datos ya están aislados por RLS; esto endurece el aislamiento por dominio.)
  if (org && !hostPerteneceASindicato(org.slug, org.dominio)) return <CuentaOtroSindicato onLogout={signOut} />

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
  // Deja la URL limpia (sin /app ni /ingresar) también en el portal del afiliado.
  useEffect(() => {
    const p = window.location.pathname
    if (p.startsWith('/app') || p === '/ingresar') window.history.replaceState({}, '', '/')
  }, [])
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

// La cuenta entró por la dirección de otro sindicato: se la redirige a la suya.
function CuentaOtroSindicato({ onLogout }: { onLogout: () => void }) {
  const { org } = useAuth()
  const url = urlDeSindicato(org?.slug ?? null, org?.dominio ?? null)
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-canvas p-6 text-center">
      <BrandMark size={56} />
      <h1 className="font-display text-xl font-semibold text-ink">Esta no es la dirección de tu sindicato</h1>
      <p className="max-w-md text-sm text-ink/60">
        Tu cuenta pertenece a <b>{org?.nombre ?? 'otro sindicato'}</b>. Por seguridad, ingresa desde tu propia dirección para acceder a tu sistema.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <a href={url} className="rounded-xl bg-night px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-night-deep">Ir a mi sindicato</a>
        <button onClick={onLogout} className="rounded-xl border border-ink/12 px-4 py-2.5 text-sm font-semibold text-ink/60 transition hover:bg-canvas">Cerrar sesión</button>
      </div>
    </div>
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
  // URLs limpias por módulo, SIN prefijo /app: /parametros, /gobernanza…
  // El dashboard vive en la raíz "/". Se lee el módulo de la URL (deep-link y
  // recarga funcionan) y se acepta el formato viejo /app/<modulo>.
  const [pathname, setPathname] = useState(() => window.location.pathname)
  useEffect(() => {
    const onPop = () => setPathname(window.location.pathname)
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])
  // Normaliza /ingresar y enlaces viejos /app/<modulo> → ruta limpia (/ o /<modulo>).
  useEffect(() => {
    const p = window.location.pathname
    if (p === '/ingresar') { window.history.replaceState({}, '', '/'); setPathname('/'); return }
    if (p.startsWith('/app')) {
      const s = p.replace(/^\/app\/?/, '').split('/')[0]
      const clean = s && Object.prototype.hasOwnProperty.call(modules, s) ? `/${s}` : '/'
      window.history.replaceState({}, '', clean)
      setPathname(clean)
    }
  }, [])
  const seg = pathname.replace(/^\/(app\/?)?/, '').split('/')[0]
  const wanted: ModuleKey = Object.prototype.hasOwnProperty.call(modules, seg) ? (seg as ModuleKey) : 'dashboard'
  const activeModule: ModuleKey = canSeeModule(wanted) ? wanted : 'dashboard'

  const navigate = (m: ModuleKey) => {
    const p = m === 'dashboard' ? '/' : `/${m}`
    window.history.pushState({}, '', p)
    setPathname(p)
  }

  return (
    <AppShell
      activeModule={activeModule}
      module={modules[activeModule]}
      onNavigate={navigate}
      onLogout={signOut}
    >
      <Suspense fallback={<PageLoader />}>
        <ActivePage module={activeModule} />
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
    case 'libro': return <LibroPage />
    case 'publicaciones': return <PublicacionesPage />
    case 'reportes': return <ReportesPage />
    case 'parametros': return <ParametrosPage />
  }
}
