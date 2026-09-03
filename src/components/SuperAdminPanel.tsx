import React, { useEffect, useState } from 'react'
import { AlertCircleIcon, Building2Icon, CheckCircle2Icon, LogOutIcon, PlusIcon, XIcon } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../store/auth'

type OrgRow = { id: string; nombre: string; slug: string; logo_url: string | null }

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
    const { data, error } = await supabase.from('organizations').select('id, nombre, slug, logo_url').order('created_at')
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

  async function guardarLogo(id: string, logo: string) {
    const { error } = await supabase.from('organizations').update({ logo_url: logo || null }).eq('id', id)
    if (error) setError('No se pudo guardar el logo.')
    else { setOk('Logo actualizado.'); void load() }
  }

  return (
    <div className="space-y-6">
      {error ? <div className="flex items-start gap-2 rounded-xl border border-brick/25 bg-red-50 px-3 py-2.5 text-sm text-brick"><AlertCircleIcon className="mt-0.5 h-4 w-4 shrink-0" /><span>{error}</span></div> : null}
      {ok ? <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800"><CheckCircle2Icon className="mt-0.5 h-4 w-4 shrink-0" /><span>{ok}</span></div> : null}

      <form onSubmit={crear} className="rounded-xl border border-ink/10 bg-canvas/40 p-4">
        <h4 className="font-display text-sm font-semibold text-ink">Nuevo sindicato</h4>
        <p className="mt-1 text-xs text-ink/50">Primero crea la cuenta de presidencia en Supabase (Add user); luego llénalo aquí.</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Field label="Nombre del sindicato"><input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Sindicato de la Gobernación…" className={inputC} /></Field>
          <Field label="Identificador (slug)"><input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="gob-atlantico" className={inputC} /></Field>
          <Field label="Correo de presidencia"><input value={presiEmail} onChange={(e) => setPresiEmail(e.target.value)} placeholder="presidencia@…" className={inputC} /></Field>
          <Field label="Nombre del presidente"><input value={presiNombre} onChange={(e) => setPresiNombre(e.target.value)} placeholder="Nombre y apellido" className={inputC} /></Field>
        </div>
        <button type="submit" disabled={busy || !nombre.trim() || !slug.trim() || !presiEmail.trim() || !presiNombre.trim()} className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-night px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-night-deep disabled:opacity-40">
          <PlusIcon className="h-4 w-4" />{busy ? 'Creando…' : 'Crear sindicato'}
        </button>
      </form>

      <div>
        <h4 className="mb-2 font-display text-sm font-semibold text-ink">Sindicatos ({orgs.length})</h4>
        {loading ? <p className="py-6 text-center text-sm text-ink/50">Cargando…</p> : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {orgs.map((o) => <OrgItem key={o.id} org={o} onSaveLogo={(logo) => guardarLogo(o.id, logo)} />)}
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

function OrgItem({ org, onSaveLogo }: { org: OrgRow; onSaveLogo: (logo: string) => void }) {
  const [logo, setLogo] = useState(org.logo_url ?? '')
  const dirty = (logo || null) !== (org.logo_url ?? null)
  return (
    <div className="rounded-xl border border-ink/[0.08] bg-white p-3 shadow-sm">
      <div className="flex items-center gap-3">
        <img src={logo || '/sindika.png'} alt={org.nombre} className="h-10 w-10 shrink-0 rounded-lg border border-ink/10 object-contain" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-ink">{org.nombre}</p>
          <p className="text-xs text-ink/45">{org.slug}</p>
        </div>
      </div>
      <div className="mt-2.5 flex gap-2">
        <input value={logo} onChange={(e) => setLogo(e.target.value)} placeholder="URL del logo (vacío = Sindika)" className="w-full rounded-lg border border-ink/12 bg-canvas/45 px-3 py-2 text-xs outline-none focus:border-night" />
        <button onClick={() => onSaveLogo(logo)} disabled={!dirty} className="shrink-0 rounded-lg bg-night px-3 text-xs font-semibold text-white transition hover:bg-night-deep disabled:opacity-40">Guardar</button>
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
