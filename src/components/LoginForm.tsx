import React, { useState } from 'react'
import { MailIcon, LockIcon, EyeIcon, EyeOffIcon, ArrowRightIcon } from 'lucide-react'

type LoginFormProps = {
  onLogin: () => void
}

export function LoginForm({ onLogin }: LoginFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onLogin()
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-sm" noValidate>
      <div className="mb-8 flex items-center gap-2.5 lg:hidden">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-night">
          <span className="font-display text-lg font-700 leading-none text-gold">S</span>
        </div>
        <span className="font-display text-lg font-600 tracking-[0.16em] text-ink">SERDNP</span>
      </div>

      <div className="mb-8">
        <h2 className="font-display text-2xl font-600 text-ink">Iniciar sesión</h2>
        <p className="mt-2 text-sm leading-relaxed text-ink/55">
          Ingresa tus credenciales institucionales para continuar
        </p>
      </div>

      <div className="mb-4">
        <label htmlFor="email" className="mb-1.5 block text-sm font-500 text-ink/80">
          Correo electrónico
        </label>
        <div className="relative">
          <MailIcon
            className="pointer-events-none absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-ink/35"
            strokeWidth={2}
          />
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="nombre@dnp.gov.co"
            className="w-full rounded-xl border border-ink/12 bg-canvas/40 py-3 pl-11 pr-4 text-sm text-ink outline-none transition placeholder:text-ink/35 focus:border-night focus:bg-white focus:ring-4 focus:ring-night/10"
          />
        </div>
      </div>

      <div className="mb-4">
        <label htmlFor="password" className="mb-1.5 block text-sm font-500 text-ink/80">
          Contraseña
        </label>
        <div className="relative">
          <LockIcon
            className="pointer-events-none absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-ink/35"
            strokeWidth={2}
          />
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full rounded-xl border border-ink/12 bg-canvas/40 py-3 pl-11 pr-11 text-sm text-ink outline-none transition placeholder:text-ink/35 focus:border-night focus:bg-white focus:ring-4 focus:ring-night/10"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-ink/40 transition hover:text-ink/70"
          >
            {showPassword ? (
              <EyeOffIcon className="h-4.5 w-4.5" strokeWidth={2} />
            ) : (
              <EyeIcon className="h-4.5 w-4.5" strokeWidth={2} />
            )}
          </button>
        </div>
      </div>

      <div className="mb-6 flex items-center justify-between">
        <label htmlFor="remember" className="flex cursor-pointer select-none items-center gap-2">
          <input
            id="remember"
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            className="h-4 w-4 rounded border-ink/25 text-night accent-night focus:ring-night/30"
          />
          <span className="text-sm text-ink/70">Recordarme</span>
        </label>
        <a
          href="#"
          className="text-sm font-500 text-night underline-offset-2 transition hover:text-gold hover:underline"
        >
          ¿Olvidaste tu contraseña?
        </a>
      </div>

      <button
        type="submit"
        className="group flex w-full items-center justify-center gap-2 rounded-xl bg-night py-3.5 text-sm font-600 text-white shadow-lg shadow-night/20 transition hover:bg-night-deep focus:outline-none focus:ring-4 focus:ring-night/20"
      >
        Ingresar al sistema
        <ArrowRightIcon
          className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
          strokeWidth={2.2}
        />
      </button>

      <div className="my-6 flex items-center gap-3">
        <span className="h-px flex-1 bg-ink/10" />
        <span className="text-xs font-500 uppercase tracking-wide text-ink/40">o</span>
        <span className="h-px flex-1 bg-ink/10" />
      </div>

      <p className="text-center text-sm text-ink/60">
        ¿Aún no estás afiliado?{' '}
        <a
          href="#"
          className="font-600 text-night underline-offset-2 transition hover:text-gold hover:underline"
        >
          Solicita tu afiliación
        </a>
      </p>
    </form>
  )
}
