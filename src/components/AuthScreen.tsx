import React, { useState } from 'react'
import { AlertCircleIcon, ArrowRightIcon, CheckCircle2Icon, EyeIcon, EyeOffIcon, LockIcon, MailIcon, UserIcon } from 'lucide-react'
import { BrandPanel } from './BrandPanel'
import { Logo } from './Logo'
import { useAuth } from '../store/auth'

type Mode = 'login' | 'signup'

export function AuthScreen() {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState<Mode>('login')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)

  function switchMode(next: Mode) {
    setMode(next); setError(''); setInfo('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setInfo(''); setBusy(true)
    try {
      if (mode === 'login') {
        const { error } = await signIn(email, password)
        if (error) setError(error)
      } else {
        if (fullName.trim().length < 3) { setError('Escribe tu nombre completo.'); return }
        if (password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres.'); return }
        const { error, needsConfirmation } = await signUp(email, password, fullName)
        if (error) setError(error)
        else if (needsConfirmation) setInfo('Cuenta creada. Revisa tu correo para confirmarla y luego inicia sesión.')
        // Si no requiere confirmación, el cambio de sesión te ingresa automáticamente.
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="flex h-screen w-full overflow-hidden bg-canvas">
      <BrandPanel />
      <section className="flex flex-1 items-center justify-center overflow-y-auto px-6 py-12 sm:px-10">
        <form onSubmit={handleSubmit} className="w-full max-w-sm" noValidate>
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <Logo size={36} />
            <span className="font-display text-lg font-semibold tracking-[0.16em] text-ink">SERDNP</span>
          </div>

          <div className="mb-6">
            <h2 className="font-display text-2xl font-semibold text-ink">{mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink/55">{mode === 'login' ? 'Ingresa con tu correo y contraseña.' : 'Regístrate como afiliado del sindicato.'}</p>
          </div>

          <div className="mb-6 grid grid-cols-2 gap-1 rounded-xl bg-canvas p-1">
            <button type="button" onClick={() => switchMode('login')} className={`rounded-lg py-2 text-sm font-semibold transition ${mode === 'login' ? 'bg-white text-night shadow-sm' : 'text-ink/55'}`}>Iniciar sesión</button>
            <button type="button" onClick={() => switchMode('signup')} className={`rounded-lg py-2 text-sm font-semibold transition ${mode === 'signup' ? 'bg-white text-night shadow-sm' : 'text-ink/55'}`}>Registrarme</button>
          </div>

          {mode === 'signup' ? (
            <Field id="name" label="Nombre completo" icon={UserIcon}>
              <input id="name" type="text" autoComplete="name" value={fullName} onChange={(e) => { setFullName(e.target.value); setError('') }} placeholder="Nombres y apellidos" className={inputClass} />
            </Field>
          ) : null}

          <Field id="email" label="Correo electrónico" icon={MailIcon}>
            <input id="email" type="email" autoComplete="email" value={email} onChange={(e) => { setEmail(e.target.value); setError('') }} placeholder="tu-correo@dnp.gov.co" className={inputClass} />
          </Field>

          <Field id="password" label="Contraseña" icon={LockIcon}>
            <input id="password" type={showPassword ? 'text' : 'password'} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={password} onChange={(e) => { setPassword(e.target.value); setError('') }} placeholder="••••••••" className={`${inputClass} pr-11`} />
            <button type="button" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-ink/40 transition hover:text-ink/70">
              {showPassword ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
            </button>
          </Field>

          {error ? (
            <div className="mb-4 flex items-start gap-2 rounded-xl border border-brick/25 bg-red-50 px-3 py-2.5 text-sm text-brick">
              <AlertCircleIcon className="mt-0.5 h-4 w-4 shrink-0" /><span>{error}</span>
            </div>
          ) : null}
          {info ? (
            <div className="mb-4 flex items-start gap-2 rounded-xl border border-emerald-600/25 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-700">
              <CheckCircle2Icon className="mt-0.5 h-4 w-4 shrink-0" /><span>{info}</span>
            </div>
          ) : null}

          <button type="submit" disabled={busy} className="group flex w-full items-center justify-center gap-2 rounded-xl bg-night py-3.5 text-sm font-semibold text-white shadow-lg shadow-night/20 transition hover:bg-night-deep focus:outline-none focus:ring-4 focus:ring-night/20 disabled:opacity-50">
            {busy ? 'Procesando…' : mode === 'login' ? 'Ingresar' : 'Crear cuenta'}
            {!busy ? <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-0.5" strokeWidth={2.2} /> : null}
          </button>

          <p className="mt-5 text-center text-xs text-ink/45">
            Las cuentas de la Junta Directiva las habilita la administración. Si eres directivo y no puedes entrar, contacta a la Secretaría.
          </p>
        </form>
      </section>
    </main>
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
