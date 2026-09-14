import React, { useEffect, useRef, useState } from 'react'
import HCaptcha from '@hcaptcha/react-hcaptcha'
import { AlertCircleIcon, ArrowRightIcon, EyeIcon, EyeOffIcon, GlobeIcon, LockIcon, MailIcon, ShieldCheckIcon } from 'lucide-react'
import { BrandPanel } from './BrandPanel'
import { useAuth } from '../store/auth'
import { esEntradaAdmin } from '../store/platform'

// Sitekey pública de hCaptcha (protección contra bots/fuerza bruta). Es pública
// por diseño; el secret vive en Supabase. Configurable por variable de entorno.
const HCAPTCHA_SITEKEY = import.meta.env.VITE_HCAPTCHA_SITEKEY || 'e794b07e-8a8a-41e8-ad54-7262d900da40'

// Solo inicio de sesión: las cuentas (directiva y afiliados) las crea la
// administración. No hay auto-registro.
export function AuthScreen() {
  const { signIn } = useAuth()
  // ¿Es la entrada de ADMINISTRACIÓN de Sindika (host de plataforma o /admin)?
  // El login de admin es visualmente distinto al de los sindicatos.
  const admin = esEntradaAdmin()
  // Deja la URL del login limpia: /admin para la administración, /ingresar para
  // los sindicatos (evita que quede /comites u otra ruta al cerrar sesión).
  useEffect(() => {
    const destino = admin ? '/admin' : '/ingresar'
    if (window.location.pathname !== destino) window.history.replaceState({}, '', destino)
  }, [admin])
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [captchaToken, setCaptchaToken] = useState('')
  const captchaRef = useRef<HCaptcha>(null)
  // Aviso si la sesión anterior se cerró por inactividad.
  const [idleNotice] = useState(() => {
    try { if (sessionStorage.getItem('idleLogout')) { sessionStorage.removeItem('idleLogout'); return true } } catch { /* sin storage */ }
    return false
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!captchaToken) { setError('Completa la verificación de seguridad.'); return }
    setError(''); setBusy(true)
    try {
      const { error } = await signIn(email, password, captchaToken)
      if (error) {
        setError(error)
        // Un token de hCaptcha es de un solo uso: reiniciar para el próximo intento.
        captchaRef.current?.resetCaptcha()
        setCaptchaToken('')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="flex h-screen w-full overflow-hidden bg-canvas">
      {admin ? <AdminBrandPanel /> : <BrandPanel />}
      <section className="flex flex-1 items-center justify-center overflow-y-auto px-6 py-12 sm:px-10">
        <form onSubmit={handleSubmit} className="w-full max-w-sm" noValidate>
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <img src="/sindika.png" alt="Sindika" className="h-9 w-9 object-contain" />
            <span className="font-display text-lg font-semibold tracking-[0.14em] text-ink">Sindika</span>
          </div>

          <div className="mb-6">
            {admin ? <p className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#2456e6]">Administración de la plataforma</p> : null}
            <h2 className="font-display text-2xl font-semibold text-ink">{admin ? 'Acceso de administración' : 'Iniciar sesión'}</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink/55">{admin ? 'Acceso exclusivo del equipo de Sindika.' : 'Ingresa con tu correo y contraseña.'}</p>
          </div>

          {idleNotice ? (
            <div className="mb-4 rounded-xl border border-gold/30 bg-gold/[0.08] px-3 py-2.5 text-sm text-ink/70">
              Tu sesión se cerró por inactividad. Vuelve a ingresar.
            </div>
          ) : null}

          <Field id="email" label="Correo electrónico" icon={MailIcon}>
            <input id="email" type="email" autoComplete="email" value={email} onChange={(e) => { setEmail(e.target.value); setError('') }} placeholder="tu-correo@dnp.gov.co" className={inputClass} />
          </Field>

          <Field id="password" label="Contraseña" icon={LockIcon}>
            <input id="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(e) => { setPassword(e.target.value); setError('') }} placeholder="••••••••" className={`${inputClass} pr-11`} />
            <button type="button" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-ink/40 transition hover:text-ink/70">
              {showPassword ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
            </button>
          </Field>

          <div className="mb-4 flex justify-center">
            <HCaptcha
              ref={captchaRef}
              sitekey={HCAPTCHA_SITEKEY}
              onVerify={(token) => { setCaptchaToken(token); setError('') }}
              onExpire={() => setCaptchaToken('')}
              onError={() => setCaptchaToken('')}
            />
          </div>

          {error ? (
            <div className="mb-4 flex items-start gap-2 rounded-xl border border-brick/25 bg-red-50 px-3 py-2.5 text-sm text-brick">
              <AlertCircleIcon className="mt-0.5 h-4 w-4 shrink-0" /><span>{error}</span>
            </div>
          ) : null}

          <button type="submit" disabled={busy || !captchaToken} className={`group flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-semibold text-white shadow-lg transition focus:outline-none focus:ring-4 disabled:opacity-50 ${admin ? 'bg-[#2456e6] shadow-[#2456e6]/25 hover:bg-[#1c46c9] focus:ring-[#2456e6]/25' : 'bg-night shadow-night/20 hover:bg-night-deep focus:ring-night/20'}`}>
            {busy ? 'Procesando…' : 'Ingresar'}
            {!busy ? <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-0.5" strokeWidth={2.2} /> : null}
          </button>

          <p className="mt-5 text-center text-xs text-ink/45">
            {admin
              ? 'Acceso restringido al administrador de Sindika.'
              : 'Las cuentas las habilita la administración del sindicato. Si no puedes entrar, contacta a la Secretaría.'}
          </p>

          {!admin ? (
            <div className="mt-4 text-center">
              <a href="/?web=1" className="inline-flex items-center gap-1.5 rounded-xl border border-ink/12 px-4 py-2 text-xs font-semibold text-ink/70 transition hover:border-night hover:text-night">
                <GlobeIcon className="h-3.5 w-3.5" />Ver la página web
              </a>
            </div>
          ) : null}
        </form>
      </section>
    </main>
  )
}

// Panel de marca del login de ADMINISTRACIÓN: identidad propia de Sindika
// (azul corporativo de la landing), distinto del de los sindicatos (SERDNP).
function AdminBrandPanel() {
  return (
    <section
      className="relative hidden overflow-hidden text-white lg:flex lg:w-[46%] xl:w-[42%]"
      style={{ background: 'linear-gradient(150deg,#0b2461 0%,#173aa8 55%,#2456e6 100%)' }}
    >
      <div aria-hidden="true" className="absolute -right-28 -top-28 h-80 w-80 rounded-full bg-white/10 blur-3xl" />
      <div aria-hidden="true" className="absolute -bottom-24 -left-20 h-72 w-72 rounded-full bg-white/[0.06] blur-3xl" />
      <div className="relative z-10 flex w-full flex-col justify-between px-10 py-12 xl:px-14">
        <div>
          <img src="/sindika-dark.png" alt="Sindika" className="h-16 w-auto drop-shadow-xl" />
          <div className="mt-5 h-1 w-28 rounded-full bg-white/40" />
        </div>

        <div className="max-w-md">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/55">Administración</p>
          <h1 className="font-display text-3xl font-600 leading-tight text-white xl:text-4xl">
            Panel de control de Sindika
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-white/75">
            Gestiona los sindicatos, sus cobros y sus accesos desde un solo lugar.
          </p>
        </div>

        <div className="flex items-center gap-3 rounded-xl border border-white/15 bg-white/[0.06] px-4 py-3.5 backdrop-blur-sm">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15">
            <ShieldCheckIcon className="h-4.5 w-4.5 text-white" strokeWidth={2} />
          </div>
          <p className="text-sm text-white/85">Acceso exclusivo del equipo de Sindika</p>
        </div>
      </div>
    </section>
  )
}

const inputClass = 'w-full rounded-xl border border-ink/12 bg-canvas/40 py-3 pl-11 pr-4 text-sm text-ink outline-none transition placeholder:text-ink/35 focus:border-night focus:bg-white focus:ring-4 focus:ring-night/10'

function Field({ id, label, icon: Icon, children }: { id: string; label: string; icon: typeof MailIcon; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-ink/80">{label}</label>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/35" strokeWidth={2} />
        {children}
      </div>
    </div>
  )
}
