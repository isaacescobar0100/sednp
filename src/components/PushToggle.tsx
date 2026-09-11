import React, { useEffect, useState } from 'react'
import { BellRingIcon } from 'lucide-react'
import { pushSoportado, pushActivo, activarPush, desactivarPush } from '../store/pushApi'

// Botón para activar/desactivar las notificaciones push en este dispositivo.
// variant 'icon' para la barra superior; por defecto, botón con texto.
export function PushToggle({ variant = 'button' }: { variant?: 'icon' | 'button' | 'menu' }) {
  const [soportado] = useState(() => pushSoportado())
  const [activo, setActivo] = useState(false)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => { pushActivo().then(setActivo) }, [])

  if (!soportado) return null

  async function toggle() {
    setBusy(true); setMsg('')
    if (activo) { await desactivarPush(); setActivo(false); setBusy(false); return }
    const r = await activarPush()
    setBusy(false)
    if (r.ok) setActivo(true); else setMsg(r.error || 'No se pudo activar.')
  }

  if (variant === 'menu') {
    return (
      <>
        <button onClick={toggle} disabled={busy} className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-ink/75 transition hover:bg-canvas disabled:opacity-60">
          <BellRingIcon className={`h-4 w-4 ${activo ? 'text-gold' : 'text-ink/50'}`} strokeWidth={1.8} />
          <span className="flex-1">{busy ? 'Un momento…' : activo ? 'Notificaciones activas' : 'Activar notificaciones'}</span>
          {activo ? <span className="rounded-md bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700">ON</span> : null}
        </button>
        {msg ? <p className="px-4 pb-1 text-[11px] text-brick">{msg}</p> : null}
      </>
    )
  }

  if (variant === 'icon') {
    return (
      <button onClick={toggle} disabled={busy} title={activo ? 'Notificaciones del celular activas' : 'Activar notificaciones en el celular'} aria-label="Notificaciones push" className="rounded-xl p-2 text-ink/60 transition hover:bg-white hover:text-night">
        <BellRingIcon className={`h-5 w-5 ${activo ? 'text-gold' : ''}`} strokeWidth={1.8} />
      </button>
    )
  }

  return (
    <div>
      <button onClick={toggle} disabled={busy} className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${activo ? 'border border-emerald-300 bg-emerald-50 text-emerald-700' : 'bg-night text-white hover:bg-night-deep'} disabled:opacity-50`}>
        <BellRingIcon className="h-4 w-4" />
        {busy ? 'Un momento…' : activo ? 'Notificaciones activas · desactivar' : 'Activar notificaciones'}
      </button>
      {msg ? <p className="mt-1.5 text-xs text-brick">{msg}</p> : null}
    </div>
  )
}
