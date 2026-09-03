import React, { useRef, useState } from 'react'
import HCaptcha from '@hcaptcha/react-hcaptcha'
import { AlertCircleIcon, ArrowRightIcon, EyeIcon, EyeOffIcon, LockIcon, MailIcon } from 'lucide-react'
import { BrandPanel } from './BrandPanel'
import { useAuth } from '../store/auth'

// Sitekey pública de hCaptcha (protección contra bots/fuerza bruta). Es pública
// por diseño; el secret vive en Supabase. Configurable por variable de entorno.
const HCAPTCHA_SITEKEY = import.meta.env.VITE_HCAPTCHA_SITEKEY || 'e794b07e-8a8a-41e8-ad54-7262d900da40'

// Solo inicio de sesión: las cuentas (directiva y afiliados) las crea la
// administración. No hay auto-registro.
export function AuthScreen() {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [captchaToken, setCaptchaToken] = useState('')
  const captchaRef = useRef<HCaptcha>(null)

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
      <BrandPanel />
      <section className="flex flex-1 items-center justify-center overflow-y-auto px-6 py-12 sm:px-10">
        <form onSubmit={handleSubmit} className="w-full max-w-sm" noValidate>
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <img src="/sindika.png" alt="Sindika" className="h-9 w-9 object-contain" />
            <span className="font-display text-lg font-semibold tracking-[0.14em] text-ink">Sindika</span>
          </div>

          <div className="mb-6">
            <h2 className="font-display text-2xl font-semibold text-ink">Iniciar sesión</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink/55">Ingresa con tu correo y contraseña.</p>
          </div>

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

          <button type="submit" disabled={busy || !captchaToken} className="group flex w-full items-center justify-center gap-2 rounded-xl bg-night py-3.5 text-sm font-semibold text-white shadow-lg shadow-night/20 transition hover:bg-night-deep focus:outline-none focus:ring-4 focus:ring-night/20 disabled:opacity-50">
            {busy ? 'Procesando…' : 'Ingresar'}
            {!busy ? <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-0.5" strokeWidth={2.2} /> : null}
          </button>

          <p className="mt-5 text-center text-xs text-ink/45">
            Las cuentas las habilita la administración del sindicato. Si no puedes entrar, contacta a la Secretaría.
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
