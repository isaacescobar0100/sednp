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
  const { signIn, resetPassword } = useAuth()
  // Modo del formulario: iniciar sesión, pedir enlace de recuperación, o aviso enviado.
  const [modo, setModo] = useState<'login' | 'reset' | 'enviado'>('login')
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

  function resetCaptcha() {
    captchaRef.current?.resetCaptcha()
    setCaptchaToken('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!captchaToken) { setError('Completa la verificación de seguridad.'); return }
    setError(''); setBusy(true)
    try {
      if (modo === 'reset') {
        // Enviar enlace de recuperación al correo ingresado (el del propio usuario).
        const { error } = await resetPassword(email, captchaToken)
        resetCaptcha()
        if (error) setError(error)
        else setModo('enviado')
        return
      }
      const { error } = await signIn(email, password, captchaToken)
      if (error) {
        setError(error)
        // Un token de hCaptcha es de un solo uso: reiniciar para el próximo intento.
        resetCaptcha()
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
            <h2 className="font-display text-2xl font-semibold text-ink">{modo === 'login' ? (admin ? 'Acceso de administración' : 'Iniciar sesión') : 'Recuperar contraseña'}</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink/55">{modo === 'login' ? (admin ? 'Acceso exclusivo del equipo de Sindika.' : 'Ingresa con tu correo y contraseña.') : 'Escribe tu correo y te enviaremos un enlace para crear una nueva contraseña.'}</p>
          </div>

          {idleNotice ? (
            <div className="mb-4 rounded-xl border border-gold/30 bg-gold/[0.08] px-3 py-2.5 text-sm text-ink/70">
              Tu sesión se cerró por inactividad. Vuelve a ingresar.
            </div>
          ) : null}

          {modo === 'enviado' ? (
            <div className="text-center">
              <div className="mb-4 rounded-xl border border-emerald-600/25 bg-emerald-50 px-4 py-4 text-sm text-emerald-800">
                <p className="font-semibold">Revisa tu correo</p>
                <p className="mt-1 text-emerald-700">Si <b>{email}</b> tiene una cuenta, te enviamos un enlace para crear una nueva contraseña. Revisa también spam.</p>
              </div>
              <button type="button" onClick={() => { setModo('login'); setError(''); setPassword('') }} className="text-xs font-semibold text-ink/55 transition hover:text-ink">← Volver a iniciar sesión</button>
            </div>
          ) : (
          <>
          <Field id="email" label="Correo electrónico" icon={MailIcon}>
            <input id="email" type="email" autoComplete="email" value={email} onChange={(e) => { setEmail(e.target.value); setError('') }} placeholder="tu-correo@correo.com" className={inputClass} />
          </Field>

          {modo === 'login' ? (
            <Field id="password" label="Contraseña" icon={LockIcon}>
              <input id="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(e) => { setPassword(e.target.value); setError('') }} placeholder="••••••••" className={`${inputClass} pr-11`} />
              <button type="button" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-ink/40 transition hover:text-ink/70">
                {showPassword ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
              </button>
            </Field>
          ) : null}
          {modo === 'login' ? (
            <div className="-mt-2 mb-4 text-right">
              <button type="button" onClick={() => { setModo('reset'); setError(''); resetCaptcha() }} className="text-xs font-semibold text-night/70 transition hover:text-night">¿Olvidaste tu contraseña?</button>
            </div>
          ) : null}

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
            {busy ? 'Procesando…' : modo === 'reset' ? 'Enviar enlace' : 'Ingresar'}
            {!busy ? <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-0.5" strokeWidth={2.2} /> : null}
          </button>

          {modo === 'reset' ? (
            <div className="mt-4 text-center">
              <button type="button" onClick={() => { setModo('login'); setError(''); resetCaptcha() }} className="text-xs font-semibold text-ink/55 transition hover:text-ink">← Volver a iniciar sesión</button>
            </div>
          ) : null}

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
          </>
          )}
        </form>
      </section>
    </main>
  )
}

// Pantalla para fijar una nueva contraseña tras abrir el enlace de recuperación.
export function NuevaClaveScreen() {
  const { updatePassword, signOut } = useAuth()
  const [pass, setPass] = useState('')
  const [pass2, setPass2] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (pass.length < 8) { setError('La contraseña debe tener al menos 8 caracteres.'); return }
    if (pass !== pass2) { setError('Las contraseñas no coinciden.'); return }
    setError(''); setBusy(true)
    const { error } = await updatePassword(pass)
    setBusy(false)
    if (error) setError(error)
    // Si sale bien, recoveryMode pasa a false y la app continúa ya con sesión.
  }

  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-canvas px-6 py-12">
      <form onSubmit={submit} className="w-full max-w-sm">
        <div className="mb-6 flex items-center gap-2.5">
          <img src="/sindika.png" alt="Sindika" className="h-9 w-9 object-contain" />
          <span className="font-display text-lg font-semibold tracking-[0.14em] text-ink">Sindika</span>
        </div>
        <h2 className="font-display text-2xl font-semibold text-ink">Crear nueva contraseña</h2>
        <p className="mt-2 text-sm leading-relaxed text-ink/55">Escribe tu nueva contraseña. Debe tener al menos 8 caracteres.</p>

        <div className="mt-6 mb-4">
          <label htmlFor="np" className="mb-1.5 block text-sm font-medium text-ink/80">Nueva contraseña</label>
          <div className="relative">
            <LockIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/35" strokeWidth={2} />
            <input id="np" type={show ? 'text' : 'password'} autoComplete="new-password" value={pass} onChange={(e) => { setPass(e.target.value); setError('') }} placeholder="••••••••" className={`${inputClass} pr-11`} />
            <button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? 'Ocultar' : 'Mostrar'} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-ink/40 transition hover:text-ink/70">
              {show ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
            </button>
          </div>
        </div>
        <div className="mb-4">
          <label htmlFor="np2" className="mb-1.5 block text-sm font-medium text-ink/80">Repite la contraseña</label>
          <div className="relative">
            <LockIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/35" strokeWidth={2} />
            <input id="np2" type={show ? 'text' : 'password'} autoComplete="new-password" value={pass2} onChange={(e) => { setPass2(e.target.value); setError('') }} placeholder="••••••••" className={inputClass} />
          </div>
        </div>

        {error ? (
          <div className="mb-4 flex items-start gap-2 rounded-xl border border-brick/25 bg-red-50 px-3 py-2.5 text-sm text-brick">
            <AlertCircleIcon className="mt-0.5 h-4 w-4 shrink-0" /><span>{error}</span>
          </div>
        ) : null}

        <button type="submit" disabled={busy} className="group flex w-full items-center justify-center gap-2 rounded-xl bg-night py-3.5 text-sm font-semibold text-white shadow-lg shadow-night/20 transition hover:bg-night-deep focus:outline-none focus:ring-4 focus:ring-night/20 disabled:opacity-50">
          {busy ? 'Guardando…' : 'Guardar contraseña'}
          {!busy ? <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-0.5" strokeWidth={2.2} /> : null}
        </button>
        <div className="mt-4 text-center">
          <button type="button" onClick={() => { void signOut() }} className="text-xs font-semibold text-ink/55 transition hover:text-ink">Cancelar</button>
        </div>
      </form>
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
