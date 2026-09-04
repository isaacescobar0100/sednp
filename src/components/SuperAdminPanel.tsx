import React, { useEffect, useRef, useState } from 'react'
import { AlertCircleIcon, Building2Icon, CheckCircle2Icon, ImageIcon, LogOutIcon, PencilIcon, PlusIcon, XIcon } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { subirFoto } from '../store/storageApi'
import { useAuth } from '../store/auth'

type OrgRow = { id: string; nombre: string; slug: string; logo_url: string | null; activo: boolean }

// ---------------------------------------------------------------------------
// Contenido reutilizable: dar de alta sindicatos y gestionar su marca.
// ---------------------------------------------------------------------------
function SuperAdminContent() {
  const [orgs, setOrgs] = useState<OrgRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')

  const [nombre, setNombre] = useState('')
  const [slug, setSlug] = useState('')
  const [presiEmail, setPresiEmail] = useState('')
  const [presiPassword, setPresiPassword] = useState('')
  const [presiNombre, setPresiNombre] = useState('')
  const [busy, setBusy] = useState(false)

  async function load() {
    setLoading(true)
    const { data, error } = await supabase.from('organizations').select('id, nombre, slug, logo_url, activo').order('created_at')
    if (error) setError('No se pudieron cargar los sindicatos.')
    else setOrgs((data as OrgRow[]) ?? [])
    setLoading(false)
  }
  useEffect(() => { void load() }, [])

  async function crear(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setOk(''); setBusy(true)
    const { error } = await supabase.rpc('crear_sindicato', {
      p_nombre: nombre.trim(),
      p_slug: slug.trim().toLowerCase().replace(/\s+/g, '-'),
      p_presi_email: presiEmail.trim().toLowerCase(),
      p_presi_password: presiPassword,
      p_presi_nombre: presiNombre.trim(),
    })
    if (error) {
      setError(error.message)
    } else {
      setOk(`Sindicato "${nombre}" creado. La presidencia entra con ${presiEmail} y la contraseña que pusiste.`)
      setNombre(''); setSlug(''); setPresiEmail(''); setPresiPassword(''); setPresiNombre('')
      void load()
    }
    setBusy(false)
  }

  return (
    <div className="space-y-6">
      {error ? <div className="flex items-start gap-2 rounded-xl border border-brick/25 bg-red-50 px-3 py-2.5 text-sm text-brick"><AlertCircleIcon className="mt-0.5 h-4 w-4 shrink-0" /><span>{error}</span></div> : null}
      {ok ? <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800"><CheckCircle2Icon className="mt-0.5 h-4 w-4 shrink-0" /><span>{ok}</span></div> : null}

      <form onSubmit={crear} className="rounded-xl border border-ink/10 bg-canvas/40 p-4">
        <h4 className="font-display text-sm font-semibold text-ink">Nuevo sindicato</h4>
        <p className="mt-1 text-xs text-ink/50">Se crea todo automáticamente, incluida la cuenta de presidencia con su contraseña.</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <Field label="Nombre del sindicato"><input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Sindicato de la Gobernación…" className={inputC} /></Field>
          <Field label="Identificador (slug)"><input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="gob-atlantico" className={inputC} /></Field>
          <Field label="Nombre del presidente"><input value={presiNombre} onChange={(e) => setPresiNombre(e.target.value)} placeholder="Nombre y apellido" className={inputC} /></Field>
          <Field label="Correo de presidencia"><input value={presiEmail} onChange={(e) => setPresiEmail(e.target.value)} placeholder="presidencia@…" className={inputC} /></Field>
          <Field label="Contraseña inicial"><input value={presiPassword} onChange={(e) => setPresiPassword(e.target.value)} placeholder="Clave para la presidencia" className={inputC} /></Field>
        </div>
        <button type="submit" disabled={busy || !nombre.trim() || !slug.trim() || !presiEmail.trim() || !presiPassword.trim() || !presiNombre.trim()} className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-night px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-night-deep disabled:opacity-40">
          <PlusIcon className="h-4 w-4" />{busy ? 'Creando…' : 'Crear sindicato'}
        </button>
      </form>

      <div>
        <h4 className="mb-2 font-display text-sm font-semibold text-ink">Sindicatos ({orgs.length})</h4>
        {loading ? <p className="py-6 text-center text-sm text-ink/50">Cargando…</p> : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {orgs.map((o) => <OrgItem key={o.id} org={o} onReload={() => void load()} />)}
          </div>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Pantalla dedicada del ADMINISTRADOR DE LA PLATAFORMA (Sindika).
// Aquí aterriza platform_admin — no tiene rol de sindicato ni pertenece a uno.
// ---------------------------------------------------------------------------
export function SuperAdminScreen() {
  const { signOut } = useAuth()
  return (
    <div className="min-h-screen bg-canvas">
      <header className="border-b border-ink/[0.08] bg-night text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <img src="/sindika-dark.png" alt="Sindika" className="h-9 w-9 object-contain" />
            <div>
              <p className="font-display text-sm font-semibold tracking-[0.14em]">SINDIKA</p>
              <p className="text-[11px] text-white/55">Administración de la plataforma</p>
            </div>
          </div>
          <button onClick={signOut} className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 px-3 py-2 text-xs font-semibold text-white/75 transition hover:border-white/30 hover:text-white">
            <LogOutIcon className="h-3.5 w-3.5" /> Salir
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-night/5 text-night"><Building2Icon className="h-5 w-5" /></div>
          <div>
            <h1 className="font-display text-xl font-semibold text-ink">Sindicatos</h1>
            <p className="text-sm text-ink/55">Da de alta y administra los sindicatos de la plataforma.</p>
          </div>
        </div>
        <SuperAdminContent />
      </main>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Versión modal (por si se usa embebido dentro de la app en el futuro).
// ---------------------------------------------------------------------------
export function SuperAdminPanel({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-night/45 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="flex max-h-[88vh] w-full max-w-2xl flex-col rounded-2xl border border-ink/10 bg-white shadow-2xl shadow-night/25" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-ink/[0.08] px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-night/5 text-night"><Building2Icon className="h-5 w-5" /></div>
            <div>
              <h3 className="font-display text-base font-semibold text-ink">Administración de Sindika</h3>
              <p className="text-xs text-ink/50">Dar de alta sindicatos y gestionar su marca</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Cerrar" className="rounded-lg p-2 text-ink/40 transition hover:bg-canvas hover:text-ink"><XIcon className="h-4 w-4" /></button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5"><SuperAdminContent /></div>
      </div>
    </div>
  )
}

function OrgItem({ org, onReload }: { org: OrgRow; onReload: () => void }) {
  const [editing, setEditing] = useState(false)

  async function toggleActivo() {
    await supabase.from('organizations').update({ activo: !org.activo }).eq('id', org.id)
    onReload()
  }

  return (
    <div className={`rounded-xl border bg-white p-3 shadow-sm ${org.activo ? 'border-ink/[0.08]' : 'border-brick/25'}`}>
      <div className="flex items-center gap-3">
        <img src={org.logo_url || '/sindika.png'} alt={org.nombre} className="h-10 w-10 shrink-0 rounded-lg border border-ink/10 object-contain" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-ink">{org.nombre}</p>
          <p className="text-xs text-ink/45">{org.slug}</p>
        </div>
        <button onClick={toggleActivo} title={org.activo ? 'Suspender (por falta de pago)' : 'Reactivar'} className={`shrink-0 rounded-md px-2 py-1 text-[11px] font-semibold ${org.activo ? 'bg-emerald-100 text-emerald-700' : 'bg-brick/10 text-brick'}`}>
          {org.activo ? 'Activo' : 'Suspendido'}
        </button>
      </div>
      <button onClick={() => setEditing(true)} className="mt-2.5 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-ink/12 py-2 text-xs font-semibold text-ink/70 transition hover:border-night hover:text-night">
        <PencilIcon className="h-3.5 w-3.5" /> Editar
      </button>
      {editing ? <EditOrgModal org={org} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); onReload() }} /> : null}
    </div>
  )
}

function EditOrgModal({ org, onClose, onSaved }: { org: OrgRow; onClose: () => void; onSaved: () => void }) {
  const [nombre, setNombre] = useState(org.nombre)
  const [logoUrl, setLogoUrl] = useState(org.logo_url ?? '')
  const [busy, setBusy] = useState(false)
  const [subiendo, setSubiendo] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setSubiendo(true); setError('')
    try { setLogoUrl(await subirFoto(file)) }
    catch { setError('No se pudo subir el logo.') }
    finally { setSubiendo(false) }
  }

  async function guardar() {
    setBusy(true); setError('')
    const { error } = await supabase.from('organizations')
      .update({ nombre: nombre.trim() || org.nombre, logo_url: logoUrl || null })
      .eq('id', org.id)
    setBusy(false)
    if (error) setError(error.message)
    else onSaved()
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-night/45 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl border border-ink/10 bg-white p-6 shadow-2xl shadow-night/25" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h3 className="font-display text-base font-semibold text-ink">Editar sindicato</h3>
            <p className="text-xs text-ink/50">{org.slug}</p>
          </div>
          <button onClick={onClose} aria-label="Cerrar" className="rounded-lg p-1.5 text-ink/40 transition hover:bg-canvas hover:text-ink"><XIcon className="h-4 w-4" /></button>
        </div>

        <div className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-ink/70">Nombre del sindicato</span>
            <input value={nombre} onChange={(e) => setNombre(e.target.value)} className={inputC} />
          </label>

          <div>
            <span className="mb-1.5 block text-xs font-medium text-ink/70">Logo</span>
            <div className="flex items-center gap-3">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-ink/10 bg-canvas">
                <img src={logoUrl || '/sindika.png'} alt="Logo" className="h-full w-full object-contain" />
              </div>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleFoto} className="hidden" />
              <button onClick={() => fileRef.current?.click()} disabled={subiendo} className="inline-flex items-center gap-1.5 rounded-xl border border-ink/12 px-3 py-2 text-sm font-semibold text-ink/70 transition hover:border-night hover:text-night disabled:opacity-50">
                <ImageIcon className="h-4 w-4" />{subiendo ? 'Subiendo…' : 'Elegir archivo'}
              </button>
            </div>
          </div>

          {error ? <p className="text-xs text-brick">{error}</p> : null}

          <div className="flex gap-2 pt-1">
            <button onClick={onClose} className="flex-1 rounded-xl border border-ink/12 py-2.5 text-sm font-semibold text-ink/60 transition hover:bg-canvas">Cancelar</button>
            <button onClick={guardar} disabled={busy || subiendo} className="flex-1 rounded-xl bg-night py-2.5 text-sm font-semibold text-white transition hover:bg-night-deep disabled:opacity-50">{busy ? 'Guardando…' : 'Guardar'}</button>
          </div>
        </div>
      </div>
    </div>
  )
}

const inputC = 'w-full rounded-lg border border-ink/12 bg-white px-3 py-2 text-sm outline-none focus:border-night focus:ring-4 focus:ring-night/10'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-ink/70">{label}</span>
      {children}
    </label>
  )
}
