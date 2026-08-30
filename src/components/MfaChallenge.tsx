import React, { useEffect, useRef, useState } from 'react'
import { AlertCircleIcon, ShieldCheckIcon } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../store/auth'
import { Logo } from './Logo'

// Segundo factor (2FA): tras la contraseña, pide el código de 6 dígitos de la
// app autenticadora. Solo aparece si la cuenta tiene 2FA activo.
export function MfaChallenge() {
  const { refreshMfa, signOut } = useAuth()
  const [factorId, setFactorId] = useState('')
  const [challengeId, setChallengeId] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [ready, setReady] = useState(false)
  const started = useRef(false)

  // Al abrir: busca el factor TOTP verificado y crea un desafío.
  useEffect(() => {
    if (started.current) return
    started.current = true
    ;(async () => {
      const { data, error } = await supabase.auth.mfa.listFactors()
      const totp = data?.totp?.find((f) => f.status === 'verified') ?? data?.totp?.[0]
      if (error || !totp) { setError('No se pudo iniciar la verificación. Cierra sesión e inténtalo de nuevo.'); setReady(true); return }
      setFactorId(totp.id)
      const ch = await supabase.auth.mfa.challenge({ factorId: totp.id })
      if (ch.error || !ch.data) { setError('No se pudo generar el desafío de seguridad.'); setReady(true); return }
      setChallengeId(ch.data.id)
      setReady(true)
    })()
  }, [])

  async function verify(e: React.FormEvent) {
    e.preventDefault()
    if (code.trim().length < 6 || !factorId || !challengeId) return
    setBusy(true); setError('')
    const { error } = await supabase.auth.mfa.verify({ factorId, challengeId, code: code.trim() })
    if (error) {
      setError('Código incorrecto o vencido. Revisa tu app e inténtalo otra vez.')
      setCode('')
      // Un desafío usado/vencido no sirve: generamos otro para el siguiente intento.
      const ch = await supabase.auth.mfa.challenge({ factorId })
      if (ch.data) setChallengeId(ch.data.id)
      setBusy(false)
      return
    }
    // Éxito: la sesión sube a AAL2 y el gate desaparece.
    await refreshMfa()
    setBusy(false)
  }

  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-canvas p-6">
      <form onSubmit={verify} className="w-full max-w-sm rounded-2xl border border-ink/10 bg-white p-7 shadow-xl shadow-night/5">
        <div className="mb-5 flex flex-col items-center gap-3 text-center">
          <Logo size={44} rounded="rounded-xl" />
          <div className="flex items-center gap-2 text-night">
            <ShieldCheckIcon className="h-5 w-5" />
            <h2 className="font-display text-lg font-semibold text-ink">Verificación en dos pasos</h2>
          </div>
          <p className="text-sm leading-relaxed text-ink/55">
            Abre tu app autenticadora (Google Authenticator, Authy…) e ingresa el código de 6 dígitos.
          </p>
        </div>

        <input
          value={code}
          onChange={(e) => { setCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setError('') }}
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus
          placeholder="000000"
          disabled={!ready}
          className="mb-4 w-full rounded-xl border border-ink/12 bg-canvas/40 py-3 text-center font-display text-2xl tracking-[0.4em] text-ink outline-none transition placeholder:text-ink/25 focus:border-night focus:bg-white focus:ring-4 focus:ring-night/10"
        />

        {error ? (
          <div className="mb-4 flex items-start gap-2 rounded-xl border border-brick/25 bg-red-50 px-3 py-2.5 text-sm text-brick">
            <AlertCircleIcon className="mt-0.5 h-4 w-4 shrink-0" /><span>{error}</span>
          </div>
        ) : null}

        <button type="submit" disabled={busy || !ready || code.length < 6} className="w-full rounded-xl bg-night py-3.5 text-sm font-semibold text-white shadow-lg shadow-night/20 transition hover:bg-night-deep focus:outline-none focus:ring-4 focus:ring-night/20 disabled:opacity-50">
          {busy ? 'Verificando…' : 'Verificar'}
        </button>

        <button type="button" onClick={signOut} className="mt-3 w-full text-center text-xs text-ink/45 transition hover:text-ink/70">
          Cancelar y cerrar sesión
        </button>
      </form>
    </main>
  )
}
