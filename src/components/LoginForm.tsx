import React, { useState } from 'react'
import { MailIcon, LockIcon, EyeIcon, EyeOffIcon, ArrowRightIcon, AlertCircleIcon } from 'lucide-react'
import { Role, roleLabel, roleSummary, roles } from '../store/session'
import { useDemo } from '../store/DemoStore'

type LoginFormProps = {
  onDirectivaLogin: (role: Role) => void
  onAfiliadoLogin: (id: string) => void
}

type Mode = 'directiva' | 'afiliado'

export function LoginForm({ onDirectivaLogin, onAfiliadoLogin }: LoginFormProps) {
  const { affiliates } = useDemo()
  const [mode, setMode] = useState<Mode>('directiva')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [role, setRole] = useState<Role>('secretaria')
  const [error, setError] = useState('')

  function switchMode(next: Mode) {
    setMode(next)
    setError('')
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (mode === 'directiva') {
      onDirectivaLogin(role)
      return
    }
    // Afiliado: valida contra el padrón (correo + contraseña) y estado Activo.
    const found = affiliates.find(
      (a) => a.email.trim().toLowerCase() === email.trim().toLowerCase() && a.password === password,
    )
    if (!found) {
      setError('Correo o contraseña incorrectos.')
      return
    }
    if (found.status !== 'Activo') {
      setError(
        found.status === 'Pendiente'
          ? 'Tu afiliación está pendiente de aprobación por la Presidencia.'
          : found.status === 'Suspendido'
            ? 'Tu afiliación está suspendida. Consulta con la Secretaría.'
            : 'Tu afiliación fue retirada.',
      )
      return
    }
    onAfiliadoLogin(found.id)
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-sm" noValidate>
      <div className="mb-8 flex items-center gap-2.5 lg:hidden">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-night">
          <span className="font-display text-lg font-700 leading-none text-gold">S</span>
        </div>
        <span className="font-display text-lg font-600 tracking-[0.16em] text-ink">SERDNP</span>
      </div>

      <div className="mb-6">
        <h2 className="font-display text-2xl font-600 text-ink">Iniciar sesión</h2>
        <p className="mt-2 text-sm leading-relaxed text-ink/55">Ingresa según tu tipo de usuario</p>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-1 rounded-xl bg-canvas p-1">
        <button type="button" onClick={() => switchMode('directiva')} className={`rounded-lg py-2 text-sm font-600 transition ${mode === 'directiva' ? 'bg-white text-night shadow-sm' : 'text-ink/55'}`}>Directiva</button>
        <button type="button" onClick={() => switchMode('afiliado')} className={`rounded-lg py-2 text-sm font-600 transition ${mode === 'afiliado' ? 'bg-white text-night shadow-sm' : 'text-ink/55'}`}>Afiliado</button>
      </div>

      <div className="mb-4">
        <label htmlFor="email" className="mb-1.5 block text-sm font-500 text-ink/80">Correo electrónico</label>
        <div className="relative">
          <MailIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-ink/35" strokeWidth={2} />
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setError('') }}
            placeholder={mode === 'afiliado' ? 'tu-correo@dnp.gov.co' : 'nombre@dnp.gov.co'}
            className="w-full rounded-xl border border-ink/12 bg-canvas/40 py-3 pl-11 pr-4 text-sm text-ink outline-none transition placeholder:text-ink/35 focus:border-night focus:bg-white focus:ring-4 focus:ring-night/10"
          />
        </div>
      </div>

      <div className="mb-4">
        <label htmlFor="password" className="mb-1.5 block text-sm font-500 text-ink/80">Contraseña</label>
        <div className="relative">
          <LockIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-ink/35" strokeWidth={2} />
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError('') }}
            placeholder="••••••••"
            className="w-full rounded-xl border border-ink/12 bg-canvas/40 py-3 pl-11 pr-11 text-sm text-ink outline-none transition placeholder:text-ink/35 focus:border-night focus:bg-white focus:ring-4 focus:ring-night/10"
          />
          <button type="button" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-ink/40 transition hover:text-ink/70">
            {showPassword ? <EyeOffIcon className="h-4.5 w-4.5" strokeWidth={2} /> : <EyeIcon className="h-4.5 w-4.5" strokeWidth={2} />}
          </button>
        </div>
      </div>

      {mode === 'directiva' ? (
        <div className="mb-6">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-500 text-ink/80">Ingresar como</span>
            <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-600 uppercase tracking-wide text-[#9a6b20]">Demo</span>
          </div>
          <div className="grid gap-2">
            {roles.map((item) => (
              <button type="button" key={item} onClick={() => setRole(item)} aria-pressed={role === item} className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition ${role === item ? 'border-night bg-night/[0.04] ring-2 ring-night/15' : 'border-ink/12 hover:border-ink/25'}`}>
                <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${role === item ? 'border-night' : 'border-ink/30'}`}>
                  {role === item ? <span className="h-2 w-2 rounded-full bg-night" /> : null}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-600 text-ink">{roleLabel[item]}</span>
                  <span className="block text-xs text-ink/50">{roleSummary[item]}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="mb-6 rounded-xl border border-ink/10 bg-canvas/40 px-3 py-2.5 text-xs text-ink/55">
          Entra con el <strong>correo</strong> y la <strong>contraseña</strong> que te asignó la Secretaría. Podrás ingresar cuando tu afiliación esté <strong>aprobada</strong>.
        </div>
      )}

      {error ? (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-brick/25 bg-red-50 px-3 py-2.5 text-sm text-brick">
          <AlertCircleIcon className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      <button type="submit" className="group flex w-full items-center justify-center gap-2 rounded-xl bg-night py-3.5 text-sm font-600 text-white shadow-lg shadow-night/20 transition hover:bg-night-deep focus:outline-none focus:ring-4 focus:ring-night/20">
        {mode === 'directiva' ? 'Ingresar al sistema' : 'Entrar a mi portal'}
        <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-0.5" strokeWidth={2.2} />
      </button>
    </form>
  )
}
