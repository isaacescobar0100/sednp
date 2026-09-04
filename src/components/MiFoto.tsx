import React, { useRef, useState } from 'react'
import { CameraIcon, XIcon } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { subirFoto } from '../store/storageApi'
import { useAuth } from '../store/auth'

// Foto propia (self-service): cualquier usuario logueado sube/cambia su foto.
export function MiFoto({ onClose }: { onClose: () => void }) {
  const { profile, refreshProfile } = useAuth()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const initials = (profile?.full_name || '?').split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase()

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !profile) return
    setBusy(true); setError('')
    try {
      const url = await subirFoto(file)
      const { error } = await supabase.from('profiles').update({ foto_url: url }).eq('id', profile.id)
      if (error) throw error
      await refreshProfile()
    } catch {
      setError('No se pudo guardar la foto. Inténtalo de nuevo.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-night/45 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl border border-ink/10 bg-white p-6 shadow-2xl shadow-night/25" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h3 className="font-display text-base font-semibold text-ink">Mi foto</h3>
            <p className="text-xs text-ink/50">Sube o cambia tu foto de perfil</p>
          </div>
          <button onClick={onClose} aria-label="Cerrar" className="rounded-lg p-1.5 text-ink/40 transition hover:bg-canvas hover:text-ink"><XIcon className="h-4 w-4" /></button>
        </div>

        <div className="flex flex-col items-center gap-4 py-2">
          <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border border-ink/10 bg-canvas">
            {profile?.fotoUrl
              ? <img src={profile.fotoUrl} alt="Mi foto" className="h-full w-full object-cover" />
              : <span className="font-display text-3xl font-bold text-ink/30">{initials}</span>}
          </div>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
          <button onClick={() => fileRef.current?.click()} disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-night px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-night-deep disabled:opacity-50">
            <CameraIcon className="h-4 w-4" />{busy ? 'Subiendo…' : profile?.fotoUrl ? 'Cambiar foto' : 'Subir foto'}
          </button>
          {error ? <p className="text-xs text-brick">{error}</p> : null}
        </div>
      </div>
    </div>
  )
}
