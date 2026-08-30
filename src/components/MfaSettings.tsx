import React, { useEffect, useState } from 'react'
import { AlertCircleIcon, CheckCircle2Icon, ShieldCheckIcon, ShieldIcon, XIcon } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../store/auth'

type Step = 'loading' | 'none' | 'enrolling' | 'active'

// Activar/desactivar la verificación en dos pasos (TOTP) de la cuenta.
// No depende de correo ni SMS: usa una app autenticadora en el celular.
export function MfaSettings({ onClose }: { onClose: () => void }) {
  const { refreshMfa } = useAuth()
  const [step, setStep] = useState<Step>('loading')
  const [factorId, setFactorId] = useState('')      // factor en proceso de alta
  const [activeId, setActiveId] = useState('')      // factor ya verificado
  const [qr, setQr] = useState('')
  const [secret, setSecret] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => { void load() }, [])

  async function load() {
    const { data } = await supabase.auth.mfa.listFactors()
    const verified = data?.totp?.find((f) => f.status === 'verified')
    if (verified) { setActiveId(verified.id); setStep('active') }
    else setStep('none')
  }

  async function startEnroll() {
    setBusy(true); setError('')
    // Limpia factores a medio configurar para no chocar al re-intentar.
    const { data: list } = await supabase.auth.mfa.listFactors()
    for (const f of list?.totp ?? []) {
      if (f.status !== 'verified') await supabase.auth.mfa.unenroll({ factorId: f.id })
    }
    // `issuer` es el nombre que muestra la app autenticadora (no depende del dominio).
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: `SERDNP-${Date.now()}`, issuer: 'SERDNP' })
    if (error || !data) { setError('No se pudo iniciar la activación. Inténtalo de nuevo.'); setBusy(false); return }
    setFactorId(data.id)
    setQr(data.totp.qr_code)
    setSecret(data.totp.secret)
    setStep('enrolling')
    setBusy(false)
  }

  async function confirmEnroll(e: React.FormEvent) {
    e.preventDefault()
    if (code.trim().length < 6) return
    setBusy(true); setError('')
    const ch = await supabase.auth.mfa.challenge({ factorId })
    if (ch.error || !ch.data) { setError('No se pudo verificar. Inténtalo de nuevo.'); setBusy(false); return }
    const { error } = await supabase.auth.mfa.verify({ factorId, challengeId: ch.data.id, code: code.trim() })
    if (error) { setError('Código incorrecto. Revisa tu app e inténtalo otra vez.'); setCode(''); setBusy(false); return }
    setCode('')
    await refreshMfa()
    setActiveId(factorId)
    setStep('active')
    setBusy(false)
  }

  async function disable() {
    if (!confirm('¿Desactivar la verificación en dos pasos de tu cuenta?')) return
    setBusy(true); setError('')
    const { error } = await supabase.auth.mfa.unenroll({ factorId: activeId })
    if (error) { setError('No se pudo desactivar. Es posible que debas volver a iniciar sesión.'); setBusy(false); return }
    setActiveId('')
    await refreshMfa()
    setStep('none')
    setBusy(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-night/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl border border-ink/10 bg-white p-6 shadow-2xl shadow-night/20" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-night/5 text-night"><ShieldCheckIcon className="h-5 w-5" /></div>
            <div>
              <h3 className="font-display text-base font-semibold text-ink">Verificación en dos pasos</h3>
              <p className="text-xs text-ink/50">Protege tu cuenta con un código de tu celular</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Cerrar" className="rounded-lg p-1.5 text-ink/40 transition hover:bg-canvas hover:text-ink"><XIcon className="h-4 w-4" /></button>
        </div>

        {step === 'loading' ? <p className="py-8 text-center text-sm text-ink/50">Cargando…</p> : null}

        {step === 'none' ? (
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-xl bg-canvas p-4">
              <ShieldIcon className="mt-0.5 h-5 w-5 shrink-0 text-ink/40" />
              <p className="text-sm leading-relaxed text-ink/70">
                Tu cuenta <strong>no tiene 2FA activo</strong>. Al activarlo, además de tu contraseña te pediremos un código de 6 dígitos de tu app autenticadora cada vez que inicies sesión.
              </p>
            </div>
            {error ? <ErrBox msg={error} /> : null}
            <button onClick={startEnroll} disabled={busy} className="w-full rounded-xl bg-night py-3 text-sm font-semibold text-white transition hover:bg-night-deep disabled:opacity-50">
              {busy ? 'Preparando…' : 'Activar verificación en dos pasos'}
            </button>
          </div>
        ) : null}

        {step === 'enrolling' ? (
          <form onSubmit={confirmEnroll} className="space-y-4">
            <ol className="space-y-3 text-sm text-ink/70">
              <li><strong>1.</strong> Instala <em>Google Authenticator</em> o <em>Authy</em> en tu celular.</li>
              <li><strong>2.</strong> Escanea este código con la app:</li>
            </ol>
            <div className="flex justify-center rounded-xl border border-ink/10 bg-white p-3">
              {qr ? <img src={qr} alt="Código QR para 2FA" className="h-44 w-44" /> : null}
            </div>
            <div className="rounded-lg bg-canvas p-3 text-center">
              <p className="text-[10px] uppercase tracking-wide text-ink/40">¿No puedes escanear? Ingresa esta clave</p>
              <p className="mt-1 select-all break-all font-mono text-xs text-ink/80">{secret}</p>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink/80">3. Escribe el código de 6 dígitos que muestra la app</label>
              <input
                value={code}
                onChange={(e) => { setCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setError('') }}
                inputMode="numeric" autoComplete="one-time-code" autoFocus placeholder="000000"
                className="w-full rounded-xl border border-ink/12 bg-canvas/40 py-3 text-center font-display text-xl tracking-[0.35em] text-ink outline-none focus:border-night focus:bg-white focus:ring-4 focus:ring-night/10"
              />
            </div>
            {error ? <ErrBox msg={error} /> : null}
            <div className="flex gap-2">
              <button type="button" onClick={() => { setStep('none'); setError('') }} className="flex-1 rounded-xl border border-ink/12 py-3 text-sm font-semibold text-ink/60 transition hover:bg-canvas">Cancelar</button>
              <button type="submit" disabled={busy || code.length < 6} className="flex-1 rounded-xl bg-night py-3 text-sm font-semibold text-white transition hover:bg-night-deep disabled:opacity-50">{busy ? 'Verificando…' : 'Confirmar'}</button>
            </div>
          </form>
        ) : null}

        {step === 'active' ? (
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <CheckCircle2Icon className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
              <p className="text-sm leading-relaxed text-emerald-900">
                <strong>2FA activo.</strong> Cada inicio de sesión pedirá el código de tu app autenticadora.
              </p>
            </div>
            {error ? <ErrBox msg={error} /> : null}
            <button onClick={disable} disabled={busy} className="w-full rounded-xl border border-brick/25 py-3 text-sm font-semibold text-brick transition hover:bg-red-50 disabled:opacity-50">
              {busy ? 'Procesando…' : 'Desactivar 2FA'}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  )
}

function ErrBox({ msg }: { msg: string }) {
  return (
    <div className="flex items-start gap-2 rounded-xl border border-brick/25 bg-red-50 px-3 py-2.5 text-sm text-brick">
      <AlertCircleIcon className="mt-0.5 h-4 w-4 shrink-0" /><span>{msg}</span>
    </div>
  )
}
