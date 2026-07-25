import React, { useMemo, useState } from 'react'
import { ChevronLeftIcon, ChevronRightIcon, LockIcon, PlusIcon, SearchIcon, XIcon } from 'lucide-react'
import { useDemo } from '../store/DemoStore'
import { useSession } from '../store/session'
import { Affiliate, AffiliateStatus, AffiliateType } from '../store/affiliates'
import { SectionTitle } from '../components/SectionTitle'
import { StatusBadge } from '../components/StatusBadge'
import { RowMenu, RowAction } from '../components/RowMenu'

const toneForStatus: Record<AffiliateStatus, 'positive' | 'warning' | 'negative' | 'neutral'> = {
  Activo: 'positive',
  Suspendido: 'warning',
  Retirado: 'negative',
  Pendiente: 'neutral',
}

const PAGE_SIZE = 8
const filters: Array<'Todos' | AffiliateStatus> = ['Todos', 'Pendiente', 'Activo', 'Suspendido', 'Retirado']
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function AfiliacionPage() {
  const { affiliates, stats } = useDemo()
  const { can } = useSession()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<'Todos' | AffiliateStatus>('Todos')
  const [page, setPage] = useState(1)
  const [showEnrollment, setShowEnrollment] = useState(false)
  const [editing, setEditing] = useState<Affiliate | null>(null)

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return affiliates.filter(
      (a) =>
        (status === 'Todos' || a.status === status) &&
        `${a.name} ${a.doc} ${a.role} ${a.dependency}`.toLowerCase().includes(q),
    )
  }, [affiliates, query, status])

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const start = (currentPage - 1) * PAGE_SIZE
  const pageRows = rows.slice(start, start + PAGE_SIZE)

  function updateQuery(value: string) {
    setQuery(value)
    setPage(1)
  }
  function updateStatus(value: 'Todos' | AffiliateStatus) {
    setStatus(value)
    setPage(1)
  }

  return (
    <div className="mx-auto max-w-[1440px]">
      <SectionTitle
        eyebrow="Gestión de personas"
        title="Afiliación"
        description="Administra la base de afiliados y sus novedades sindicales."
        action={
          can('affiliates.create') ? (
            <button
              onClick={() => setShowEnrollment(true)}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-night px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-night/15 transition hover:bg-night-deep"
            >
              <PlusIcon className="h-4 w-4" />
              Nuevo afiliado
            </button>
          ) : null
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatChip label="Total padrón" value={stats.total} />
        <StatChip label="Activos" value={stats.active} tone="positive" />
        <StatChip label="En revisión" value={stats.pending} tone="warning" />
        <StatChip label="Suspendidos" value={stats.suspended} tone="negative" />
      </div>

      {!can('affiliates.changeStatus') ? (
        <div className="mb-5 flex items-start gap-3 rounded-xl border border-gold/30 bg-gold/[0.08] px-4 py-3 text-sm text-ink/70">
          <LockIcon className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
          <p>
            Puedes <strong>registrar y consultar</strong> afiliados. La <strong>aprobación y las novedades</strong> (suspender, reactivar, retirar) las realiza la <strong>Presidencia</strong>.
          </p>
        </div>
      ) : null}

      <div className="rounded-2xl border border-ink/[0.08] bg-white">
        <div className="flex flex-col gap-3 border-b border-ink/[0.07] p-4 md:flex-row md:items-center md:justify-between">
          <label className="relative max-w-md flex-1">
            <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/40" />
            <input
              value={query}
              onChange={(e) => updateQuery(e.target.value)}
              placeholder="Buscar por nombre, documento, cargo o dependencia"
              className="w-full rounded-xl border border-ink/10 bg-canvas/45 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-night focus:ring-4 focus:ring-night/10"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            {filters.map((item) => (
              <button
                key={item}
                onClick={() => updateStatus(item)}
                className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${status === item ? 'bg-night text-white' : 'bg-canvas text-ink/60 hover:bg-ink/5'}`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left">
            <thead className="bg-canvas/65 text-[10px] uppercase tracking-[0.12em] text-ink/45">
              <tr>
                <th className="px-5 py-3 font-semibold">Afiliado</th>
                <th className="px-5 py-3 font-semibold">Documento</th>
                <th className="px-5 py-3 font-semibold">Cargo</th>
                <th className="px-5 py-3 font-semibold">Vinculación</th>
                <th className="px-5 py-3 font-semibold">Estado</th>
                <th className="px-5 py-3 text-right font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/[0.07]">
              {pageRows.map((item) => (
                <AffiliateRow key={item.id} affiliate={item} onEdit={setEditing} />
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-sm text-ink/50">
                    No se encontraron afiliados para estos filtros.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-ink/[0.07] px-5 py-3 text-xs text-ink/50">
          <span>
            {rows.length > 0
              ? `Mostrando ${start + 1}–${Math.min(start + PAGE_SIZE, rows.length)} de ${rows.length}`
              : 'Sin resultados'}
          </span>
          <div className="flex items-center gap-2">
            <span className="tabular-nums">
              Página {currentPage} de {totalPages}
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="rounded-md p-1.5 enabled:hover:bg-canvas disabled:opacity-30"
                aria-label="Página anterior"
              >
                <ChevronLeftIcon className="h-4 w-4" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="rounded-md p-1.5 enabled:hover:bg-canvas disabled:opacity-30"
                aria-label="Página siguiente"
              >
                <ChevronRightIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {showEnrollment ? <EnrollmentModal onClose={() => setShowEnrollment(false)} /> : null}
      {editing ? <EditAffiliateModal affiliate={editing} onClose={() => setEditing(null)} /> : null}
    </div>
  )
}

function StatChip({ label, value, tone = 'neutral' }: { label: string; value: number; tone?: 'neutral' | 'positive' | 'warning' | 'negative' }) {
  const dot = { neutral: 'bg-ink/30', positive: 'bg-emerald-500', warning: 'bg-amber-500', negative: 'bg-brick' }[tone]
  return (
    <div className="rounded-xl border border-ink/[0.08] bg-white px-4 py-3">
      <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.1em] text-ink/45">
        <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
        {label}
      </div>
      <p className="mt-1 font-display text-xl font-semibold tabular-nums text-ink">{value.toLocaleString('es-CO')}</p>
    </div>
  )
}

// Acciones disponibles según el estado actual del afiliado.
function actionsFor(status: AffiliateStatus): Array<{ label: string; next: AffiliateStatus; danger?: boolean }> {
  switch (status) {
    case 'Pendiente':
      return [{ label: 'Aprobar afiliación', next: 'Activo' }, { label: 'Rechazar', next: 'Retirado', danger: true }]
    case 'Activo':
      return [{ label: 'Suspender', next: 'Suspendido' }, { label: 'Retirar', next: 'Retirado', danger: true }]
    case 'Suspendido':
      return [{ label: 'Reactivar', next: 'Activo' }, { label: 'Retirar', next: 'Retirado', danger: true }]
    case 'Retirado':
      return [{ label: 'Reactivar', next: 'Activo' }]
  }
}

function AffiliateRow({ affiliate, onEdit }: { affiliate: Affiliate; onEdit: (a: Affiliate) => void }) {
  const { setAffiliateStatus, notify } = useDemo()
  const { can } = useSession()
  const canManage = can('affiliates.changeStatus')
  const canEdit = can('affiliates.create')

  function apply(next: AffiliateStatus) {
    setAffiliateStatus(affiliate.id, next)
    notify(`${affiliate.name}: estado actualizado a ${next}.`, next === 'Retirado' ? 'warning' : 'success')
  }

  const menuActions: RowAction[] = []
  if (canEdit) menuActions.push({ label: 'Editar datos', onClick: () => onEdit(affiliate) })
  if (canManage) menuActions.push(...actionsFor(affiliate.status).map((a) => ({ label: a.label, danger: a.danger, onClick: () => apply(a.next) })))

  return (
    <tr className="transition hover:bg-canvas/50">
      <td className="px-5 py-4">
        <p className="text-sm font-semibold text-ink">{affiliate.name}</p>
        <p className="text-xs text-ink/45">{affiliate.dependency}</p>
      </td>
      <td className="px-5 py-4 text-sm text-ink/60">{affiliate.doc}</td>
      <td className="px-5 py-4 text-sm text-ink/60">{affiliate.role}</td>
      <td className="px-5 py-4 text-sm text-ink/60">{affiliate.type}</td>
      <td className="px-5 py-4">
        <StatusBadge tone={toneForStatus[affiliate.status]}>{affiliate.status}</StatusBadge>
      </td>
      <td className="px-5 py-4 text-right">
        {menuActions.length > 0 ? (
          <RowMenu label={`Acciones para ${affiliate.name}`} actions={menuActions} />
        ) : (
          <span className="inline-flex items-center justify-center rounded-lg p-1.5 text-ink/25" title="No tienes acciones disponibles para este afiliado.">
            <LockIcon className="h-4 w-4" />
          </span>
        )}
      </td>
    </tr>
  )
}

const emptyForm = {
  name: '',
  doc: '',
  email: '',
  phone: '',
  role: '',
  dependency: '',
  type: '' as AffiliateType,
  password: '',
  joinDate: '',
}

function EnrollmentModal({ onClose }: { onClose: () => void }) {
  const { addAffiliate, affiliates, cargos, dependencias, vinculaciones } = useDemo()
  const [step, setStep] = useState(1)
  const [form, setForm] = useState(() => ({ ...emptyForm, type: vinculaciones[0]?.name ?? '' }))
  const steps = ['Datos personales', 'Información laboral', 'Revisión']

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const docDup = form.doc.trim() !== '' && affiliates.some((a) => a.doc.trim() === form.doc.trim())
  const emailDup = form.email.trim() !== '' && affiliates.some((a) => a.email.trim().toLowerCase() === form.email.trim().toLowerCase())
  const emailInvalid = form.email.trim() !== '' && !EMAIL_RE.test(form.email.trim())
  const canContinue = step === 1 ? form.name.trim() !== '' && form.doc.trim() !== '' && form.email.trim() !== '' && form.password.trim() !== '' && !docDup && !emailDup && !emailInvalid : true

  function handlePrimary() {
    if (step < 3) {
      setStep(step + 1)
      return
    }
    addAffiliate({ ...form, name: form.name.trim() })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-night/45 p-4">
      <section role="dialog" aria-modal="true" aria-labelledby="enrollment-title" className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-ink/[0.08] px-6 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gold">Afiliación</p>
            <h2 id="enrollment-title" className="mt-1 font-display text-xl font-semibold">Nuevo afiliado</h2>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-ink/50 hover:bg-canvas" aria-label="Cerrar">
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 pt-6">
          <div className="grid grid-cols-3 gap-2">
            {steps.map((item, index) => (
              <div key={item} className="flex items-center gap-2">
                <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${index + 1 <= step ? 'bg-night text-white' : 'bg-ink/8 text-ink/45'}`}>{index + 1}</div>
                <span className={`hidden text-xs font-medium sm:block ${index + 1 === step ? 'text-night' : 'text-ink/45'}`}>{item}</span>
              </div>
            ))}
          </div>

          <div className="mt-7">
            {step === 1 ? (
              <div>
                <h3 className="font-display text-lg font-semibold">Datos personales</h3>
                <p className="mt-1 text-sm text-ink/50">Información de identificación y contacto.</p>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <Field label="Nombres y apellidos" placeholder="Nombre completo" value={form.name} onChange={(v) => set('name', v)} required />
                  <Field label="Documento de identidad" placeholder="Número de documento" value={form.doc} onChange={(v) => set('doc', v)} required error={docDup ? 'Ya existe un afiliado con este documento.' : undefined} />
                  <Field label="Correo (usuario de acceso)" placeholder="nombre@dnp.gov.co" value={form.email} onChange={(v) => set('email', v)} required error={emailDup ? 'Ya existe un afiliado con este correo.' : emailInvalid ? 'Correo no válido.' : undefined} />
                  <Field label="Teléfono" placeholder="300 000 0000" value={form.phone} onChange={(v) => set('phone', v)} />
                  <Field label="Contraseña de acceso" placeholder="Contraseña del afiliado" value={form.password} onChange={(v) => set('password', v)} required />
                </div>
                <p className="mt-3 rounded-xl border border-gold/25 bg-gold/[0.07] px-3 py-2.5 text-xs text-ink/60">El afiliado usará su <strong>correo</strong> y esta <strong>contraseña</strong> para entrar a su portal. Podrá ingresar una vez la Presidencia <strong>apruebe</strong> su afiliación.</p>
              </div>
            ) : step === 2 ? (
              <div>
                <h3 className="font-display text-lg font-semibold">Información laboral</h3>
                <p className="mt-1 text-sm text-ink/50">Datos de vinculación en el Departamento.</p>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <ChoiceField label="Cargo" value={form.role} onChange={(v) => set('role', v)} options={cargos} placeholder="Seleccionar cargo" />
                  <ChoiceField label="Dependencia" value={form.dependency} onChange={(v) => set('dependency', v)} options={dependencias} placeholder="Seleccionar dependencia" />
                  <ChoiceField label="Tipo de vinculación" value={form.type} onChange={(v) => set('type', v)} options={vinculaciones.map((t) => t.name)} placeholder="Seleccionar tipo" />
                  <DateField label="Fecha de vinculación" value={form.joinDate} onChange={(v) => set('joinDate', v)} />
                </div>
              </div>
            ) : (
              <div>
                <h3 className="font-display text-lg font-semibold">Revisión de inscripción</h3>
                <p className="mt-1 text-sm text-ink/50">Confirma la información antes de registrar la solicitud.</p>
                <dl className="mt-5 grid gap-x-6 gap-y-3 rounded-xl border border-ink/[0.08] bg-canvas/40 p-4 text-sm sm:grid-cols-2">
                  <ReviewItem label="Nombre" value={form.name} />
                  <ReviewItem label="Documento" value={form.doc} />
                  <ReviewItem label="Correo" value={form.email} />
                  <ReviewItem label="Teléfono" value={form.phone} />
                  <ReviewItem label="Cargo" value={form.role} />
                  <ReviewItem label="Dependencia" value={form.dependency} />
                  <ReviewItem label="Vinculación" value={form.type} />
                  <ReviewItem label="Fecha" value={form.joinDate} />
                </dl>
                <div className="mt-4 rounded-xl border border-gold/30 bg-gold/10 p-4 text-sm text-ink/70">
                  La solicitud quedará en estado <strong>pendiente de aprobación</strong> por la Secretaría General.
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-7 flex justify-between border-t border-ink/[0.08] px-6 py-4">
          <button onClick={() => (step === 1 ? onClose() : setStep(step - 1))} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-ink/60 hover:bg-canvas">
            {step === 1 ? 'Cancelar' : 'Anterior'}
          </button>
          <button
            onClick={handlePrimary}
            disabled={!canContinue}
            className="rounded-xl bg-night px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-night-deep disabled:opacity-40"
          >
            {step === 3 ? 'Confirmar inscripción' : 'Continuar'}
          </button>
        </div>
      </section>
    </div>
  )
}

function EditAffiliateModal({ affiliate, onClose }: { affiliate: Affiliate; onClose: () => void }) {
  const { updateAffiliate, affiliates, cargos, dependencias, vinculaciones } = useDemo()
  const [form, setForm] = useState({
    name: affiliate.name,
    doc: affiliate.doc,
    email: affiliate.email,
    phone: affiliate.phone,
    password: affiliate.password,
    role: affiliate.role,
    dependency: affiliate.dependency,
    type: affiliate.type,
    joinDate: affiliate.joinDate,
  })
  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const docDup = form.doc.trim() !== '' && affiliates.some((a) => a.id !== affiliate.id && a.doc.trim() === form.doc.trim())
  const emailDup = form.email.trim() !== '' && affiliates.some((a) => a.id !== affiliate.id && a.email.trim().toLowerCase() === form.email.trim().toLowerCase())
  const emailInvalid = form.email.trim() !== '' && !EMAIL_RE.test(form.email.trim())
  const valid = form.name.trim() !== '' && form.doc.trim() !== '' && form.email.trim() !== '' && form.password.trim() !== '' && !docDup && !emailDup && !emailInvalid

  function save() {
    if (!valid) return
    updateAffiliate(affiliate.id, {
      name: form.name.trim(),
      doc: form.doc.trim(),
      email: form.email.trim(),
      phone: form.phone,
      password: form.password,
      role: form.role,
      dependency: form.dependency,
      type: form.type,
      joinDate: form.joinDate,
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-night/45 p-4">
      <section role="dialog" aria-modal="true" className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gold">Afiliación</p>
            <h2 className="mt-1 font-display text-xl font-semibold">Editar afiliado</h2>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-ink/50 hover:bg-canvas" aria-label="Cerrar"><XIcon className="h-5 w-5" /></button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nombres y apellidos" placeholder="Nombre completo" value={form.name} onChange={(v) => set('name', v)} required />
          <Field label="Documento de identidad" placeholder="Número de documento" value={form.doc} onChange={(v) => set('doc', v)} required error={docDup ? 'Ya existe un afiliado con este documento.' : undefined} />
          <Field label="Correo (usuario de acceso)" placeholder="nombre@dnp.gov.co" value={form.email} onChange={(v) => set('email', v)} required error={emailDup ? 'Ya existe un afiliado con este correo.' : emailInvalid ? 'Correo no válido.' : undefined} />
          <Field label="Teléfono" placeholder="300 000 0000" value={form.phone} onChange={(v) => set('phone', v)} />
          <Field label="Contraseña de acceso" placeholder="Contraseña del afiliado" value={form.password} onChange={(v) => set('password', v)} required />
          <ChoiceField label="Cargo" value={form.role} onChange={(v) => set('role', v)} options={cargos} placeholder="Seleccionar cargo" />
          <ChoiceField label="Dependencia" value={form.dependency} onChange={(v) => set('dependency', v)} options={dependencias} placeholder="Seleccionar dependencia" />
          <ChoiceField label="Tipo de vinculación" value={form.type} onChange={(v) => set('type', v)} options={vinculaciones.map((t) => t.name)} placeholder="Seleccionar tipo" />
          <DateField label="Fecha de vinculación" value={form.joinDate} onChange={(v) => set('joinDate', v)} />
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-ink/60 hover:bg-canvas">Cancelar</button>
          <button onClick={save} disabled={!valid} className="rounded-xl bg-night px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-night-deep disabled:opacity-40">Guardar cambios</button>
        </div>
      </section>
    </div>
  )
}

function Field({ label, placeholder, value, onChange, required, error }: { label: string; placeholder: string; value: string; onChange: (v: string) => void; required?: boolean; error?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-ink/70">
        {label}
        {required ? <span className="text-brick"> *</span> : null}
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full rounded-xl border bg-canvas/45 px-3 py-2.5 text-sm outline-none focus:ring-4 focus:ring-night/10 ${error ? 'border-brick/50 focus:border-brick' : 'border-ink/12 focus:border-night'}`}
      />
      {error ? <span className="mt-1 block text-xs text-brick">{error}</span> : null}
    </label>
  )
}

function SelectField({ label, value, onChange, options }: { label: string; value: AffiliateType; onChange: (v: AffiliateType) => void; options: AffiliateType[] }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-ink/70">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as AffiliateType)}
        className="w-full rounded-xl border border-ink/12 bg-canvas/45 px-3 py-2.5 text-sm outline-none focus:border-night focus:ring-4 focus:ring-night/10"
      >
        {options.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    </label>
  )
}

function ChoiceField({ label, value, onChange, options, placeholder }: { label: string; value: string; onChange: (v: string) => void; options: readonly string[]; placeholder: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-ink/70">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full rounded-xl border border-ink/12 bg-canvas/45 px-3 py-2.5 text-sm outline-none focus:border-night focus:ring-4 focus:ring-night/10 ${value === '' ? 'text-ink/45' : ''}`}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option} value={option} className="text-ink">{option}</option>
        ))}
      </select>
    </label>
  )
}

function DateField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-ink/70">{label}</span>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-ink/12 bg-canvas/45 px-3 py-2.5 text-sm outline-none focus:border-night focus:ring-4 focus:ring-night/10"
      />
    </label>
  )
}

function ReviewItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink/40">{label}</dt>
      <dd className="mt-0.5 text-ink/80">{value.trim() || <span className="text-ink/35">Sin definir</span>}</dd>
    </div>
  )
}
