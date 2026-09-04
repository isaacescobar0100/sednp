import React, { useEffect, useState } from 'react'
import { AlertCircleIcon, CheckCircle2Icon, PlusIcon, UsersRoundIcon, XIcon } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { Role, roleLabel } from '../store/session'

type Member = { id: string; full_name: string; role: string }

// Roles que la Presidencia/Secretaría puede crear (la presidencia ya existe).
const ROLES_ASIGNABLES: Role[] = ['vicepresidencia', 'secretaria', 'tesoreria', 'fiscal']

// Gestión de la directiva: el Presidente/Secretaría crea las cuentas de los demás
// cargos de SU sindicato (correo + contraseña + rol), sin tocar la base de datos.
export function DirectivaManager({ onClose }: { onClose: () => void }) {
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')

  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rol, setRol] = useState<Role>('vicepresidencia')
  const [busy, setBusy] = useState(false)

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('profiles').select('id, full_name, role').neq('role', 'afiliado').order('role')
    setMembers((data as Member[]) ?? [])
    setLoading(false)
  }
  useEffect(() => { void load() }, [])

  async function crear(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setOk(''); setBusy(true)
    const { error } = await supabase.rpc('crear_miembro_directiva', {
      p_email: email.trim().toLowerCase(),
      p_password: password,
      p_nombre: nombre.trim(),
      p_rol: rol,
    })
    if (error) setError(error.message)
    else {
      setOk(`${roleLabel[rol]} creada. Entra con ${email} y la contraseña que pusiste.`)
      setNombre(''); setEmail(''); setPassword(''); setRol('vicepresidencia')
      void load()
    }
    setBusy(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-night/45 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="flex max-h-[88vh] w-full max-w-lg flex-col rounded-2xl border border-ink/10 bg-white shadow-2xl shadow-night/25" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-ink/[0.08] px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-night/5 text-night"><UsersRoundIcon className="h-5 w-5" /></div>
            <div>
              <h3 className="font-display text-base font-semibold text-ink">Junta Directiva</h3>
              <p className="text-xs text-ink/50">Crea las cuentas de los cargos de tu sindicato</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Cerrar" className="rounded-lg p-2 text-ink/40 transition hover:bg-canvas hover:text-ink"><XIcon className="h-4 w-4" /></button>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">
          {error ? <div className="flex items-start gap-2 rounded-xl border border-brick/25 bg-red-50 px-3 py-2.5 text-sm text-brick"><AlertCircleIcon className="mt-0.5 h-4 w-4 shrink-0" /><span>{error}</span></div> : null}
          {ok ? <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800"><CheckCircle2Icon className="mt-0.5 h-4 w-4 shrink-0" /><span>{ok}</span></div> : null}

          <form onSubmit={crear} className="rounded-xl border border-ink/10 bg-canvas/40 p-4">
            <h4 className="font-display text-sm font-semibold text-ink">Nuevo miembro de la directiva</h4>
            <div className="mt-3 space-y-2.5">
              <Field label="Nombre completo"><input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre y apellido" className={inputC} /></Field>
              <div className="grid gap-2.5 sm:grid-cols-2">
                <Field label="Correo"><input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="correo@…" className={inputC} /></Field>
                <Field label="Contraseña inicial"><input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Clave" className={inputC} /></Field>
              </div>
              <Field label="Cargo">
                <select value={rol} onChange={(e) => setRol(e.target.value as Role)} className={inputC}>
                  {ROLES_ASIGNABLES.map((r) => <option key={r} value={r}>{roleLabel[r]}</option>)}
                </select>
              </Field>
            </div>
            <button type="submit" disabled={busy || !nombre.trim() || !email.trim() || !password.trim()} className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-night px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-night-deep disabled:opacity-40">
              <PlusIcon className="h-4 w-4" />{busy ? 'Creando…' : 'Crear cuenta'}
            </button>
          </form>

          <div>
            <h4 className="mb-2 font-display text-sm font-semibold text-ink">Directiva actual ({members.length})</h4>
            {loading ? <p className="py-4 text-center text-sm text-ink/50">Cargando…</p> : (
              <ul className="divide-y divide-ink/[0.07]">
                {members.map((m) => (
                  <li key={m.id} className="flex items-center justify-between py-2.5">
                    <span className="text-sm text-ink/80">{m.full_name || '(sin nombre)'}</span>
                    <span className="rounded-md bg-night/5 px-2 py-0.5 text-[11px] font-semibold text-night">{roleLabel[m.role as Role] ?? m.role}</span>
                  </li>
                ))}
                {members.length === 0 ? <li className="py-4 text-center text-xs text-ink/45">Aún no hay directiva registrada.</li> : null}
              </ul>
            )}
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
