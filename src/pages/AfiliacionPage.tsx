import React, { useMemo, useRef, useState } from 'react'
import { CameraIcon, ChevronLeftIcon, ChevronRightIcon, LockIcon, PlusIcon, SearchIcon, XIcon } from 'lucide-react'
import { subirFoto } from '../store/storageApi'
import { useDemo } from '../store/DemoStore'
import { useSession } from '../store/session'
import { Affiliate, AffiliateStatus, AffiliateType, BENEFICIOS, MEDIOS } from '../store/affiliates'
import { formatCop } from '../store/finance'
import { escalaLabel, sortEscalas } from '../store/payscale'
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
  const [approving, setApproving] = useState<Affiliate | null>(null)

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
            Flujo de afiliación (Art. 5): la Secretaría <strong>registra</strong> → el <strong>Fiscal</strong> emite concepto → la <strong>Junta Directiva</strong> aprueba con acta.
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
                <AffiliateRow key={item.id} affiliate={item} onEdit={setEditing} onApprove={setApproving} />
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
      {approving ? <ApproveModal affiliate={approving} onClose={() => setApproving(null)} /> : null}
    </div>
  )
}

function ApproveModal({ affiliate, onClose }: { affiliate: Affiliate; onClose: () => void }) {
  const { approveAffiliate } = useDemo()
  const [acta, setActa] = useState('')
  const valid = acta.trim() !== ''

  function save() {
    if (!valid) return
    approveAffiliate(affiliate.id, acta.trim())
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-night/45 p-4">
      <section role="dialog" aria-modal="true" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gold">Afiliación</p>
            <h2 className="mt-1 font-display text-xl font-semibold">Aprobar afiliación</h2>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-ink/50 hover:bg-canvas" aria-label="Cerrar"><XIcon className="h-5 w-5" /></button>
        </div>
        <p className="text-sm text-ink/60"><strong>{affiliate.name}</strong> · Concepto del Fiscal: <span className="font-semibold text-emerald-700">Positivo</span></p>
        <p className="mt-3 rounded-xl border border-gold/25 bg-gold/[0.07] px-3 py-2.5 text-xs text-ink/60">La Junta Directiva aprueba la afiliación mediante acta (Art. 5d). El afiliado quedará <strong>Activo</strong> y podrá acceder a su portal.</p>
        <label className="mt-4 block">
          <span className="mb-1.5 block text-xs font-semibold text-ink/70">Acta No. de la Junta Directiva <span className="text-brick">*</span></span>
          <input value={acta} onChange={(e) => setActa(e.target.value)} placeholder="Ej. 011" className="w-full rounded-xl border border-ink/12 bg-canvas/45 px-3 py-2.5 text-sm outline-none focus:border-night focus:ring-4 focus:ring-night/10" />
        </label>
        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-ink/60 hover:bg-canvas">Cancelar</button>
          <button onClick={save} disabled={!valid} className="rounded-xl bg-night px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-night-deep disabled:opacity-40">Aprobar afiliación</button>
        </div>
      </section>
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

// Acciones de estado para afiliados ya aprobados (Pendiente se maneja aparte).
function actionsFor(status: AffiliateStatus): Array<{ label: string; next: AffiliateStatus; danger?: boolean }> {
  switch (status) {
    case 'Activo':
      return [{ label: 'Suspender', next: 'Suspendido' }, { label: 'Retirar', next: 'Retirado', danger: true }]
    case 'Suspendido':
      return [{ label: 'Reactivar', next: 'Activo' }, { label: 'Retirar', next: 'Retirado', danger: true }]
    case 'Retirado':
      return [{ label: 'Reactivar', next: 'Activo' }]
    default:
      return []
  }
}

function AffiliateRow({ affiliate, onEdit, onApprove }: { affiliate: Affiliate; onEdit: (a: Affiliate) => void; onApprove: (a: Affiliate) => void }) {
  const { setAffiliateStatus, conceptAffiliate, notify } = useDemo()
  const { can } = useSession()
  const canManage = can('affiliates.changeStatus')
  const canEdit = can('affiliates.create')
  const canConcept = can('affiliates.concept')
  const pendiente = affiliate.status === 'Pendiente'

  function apply(next: AffiliateStatus) {
    setAffiliateStatus(affiliate.id, next)
    notify(`${affiliate.name}: estado actualizado a ${next}.`, next === 'Retirado' ? 'warning' : 'success')
  }

  const menuActions: RowAction[] = []
  if (canEdit) menuActions.push({ label: 'Editar datos', onClick: () => onEdit(affiliate) })
  if (pendiente) {
    // Flujo de aprobación: concepto del Fiscal (Art. 25g) → aprueba la Junta (Art. 5d).
    if (canConcept && !affiliate.conceptoFiscal) {
      menuActions.push({ label: 'Concepto Fiscal: Positivo', onClick: () => conceptAffiliate(affiliate.id, 'Positivo') })
      menuActions.push({ label: 'Concepto Fiscal: Negativo', danger: true, onClick: () => conceptAffiliate(affiliate.id, 'Negativo') })
    }
    if (canManage) {
      if (affiliate.conceptoFiscal === 'Positivo') menuActions.push({ label: 'Aprobar afiliación (Junta)', onClick: () => onApprove(affiliate) })
      menuActions.push({ label: 'Rechazar', danger: true, onClick: () => apply('Retirado') })
    }
  } else if (canManage) {
    menuActions.push(...actionsFor(affiliate.status).map((a) => ({ label: a.label, danger: a.danger, onClick: () => apply(a.next) })))
  }

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
        {pendiente ? (
          <p className={`mt-1 text-[11px] ${affiliate.conceptoFiscal === 'Positivo' ? 'text-emerald-700' : affiliate.conceptoFiscal === 'Negativo' ? 'text-brick' : 'text-ink/45'}`}>
            Concepto Fiscal: {affiliate.conceptoFiscal ?? 'pendiente'}
          </p>
        ) : affiliate.aprobacionActa ? (
          <p className="mt-1 text-[11px] text-ink/45">Acta {affiliate.aprobacionActa}</p>
        ) : null}
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
  nombres: '',
  apellidos: '',
  doc: '',
  email: '',
  phone: '',
  address: '',
  password: '',
  rolSindicato: 'afiliado',
  fotoUrl: '',
  beneficios: [] as string[],
  role: '',
  cargoTitular: '',
  dependency: '',
  type: '' as AffiliateType,
  asignacionBasica: '',
  medio: '',
  motivo: '',
  interesComites: '',
  joinDate: '',
}

function parseMoney(text: string): number {
  return Number(text.replace(/\D/g, ''))
}

// Rol de la persona dentro del sindicato (define su acceso). 'afiliado' = miembro
// normal (portal); los demás son cargos de la directiva (operan el sistema).
const ROL_SINDICATO: Array<{ value: string; label: string }> = [
  { value: 'afiliado', label: 'Afiliado (miembro)' },
  { value: 'presidencia', label: 'Presidencia' },
  { value: 'vicepresidencia', label: 'Vicepresidencia' },
  { value: 'secretaria', label: 'Secretaría' },
  { value: 'tesoreria', label: 'Tesorería' },
  { value: 'fiscal', label: 'Fiscalía' },
]

function EnrollmentModal({ onClose }: { onClose: () => void }) {
  const { addAffiliate, affiliates, cargos, dependencias, vinculaciones, escalas, porcentajeCuota } = useDemo()
  const [step, setStep] = useState(1)
  const [form, setForm] = useState(() => ({ ...emptyForm, type: vinculaciones[0]?.name ?? '' }))
  const [subiendoFoto, setSubiendoFoto] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const steps = ['Datos personales', 'Información laboral', 'Revisión']

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setSubiendoFoto(true)
    try {
      const url = await subirFoto(file)
      set('fotoUrl', url)
    } catch {
      // silencioso: si falla, se puede reintentar
    } finally {
      setSubiendoFoto(false)
    }
  }

  function toggleBeneficio(b: string) {
    setForm((prev) => ({ ...prev, beneficios: prev.beneficios.includes(b) ? prev.beneficios.filter((x) => x !== b) : [...prev.beneficios, b] }))
  }

  const docDup = form.doc.trim() !== '' && affiliates.some((a) => a.doc.trim() === form.doc.trim())
  const emailDup = form.email.trim() !== '' && affiliates.some((a) => a.email.trim().toLowerCase() === form.email.trim().toLowerCase())
  const emailInvalid = form.email.trim() !== '' && !EMAIL_RE.test(form.email.trim())
  const canContinue = step === 1 ? form.nombres.trim() !== '' && form.apellidos.trim() !== '' && form.doc.trim() !== '' && form.email.trim() !== '' && form.password.trim() !== '' && !docDup && !emailDup && !emailInvalid : true

  function handlePrimary() {
    if (step < 3) {
      setStep(step + 1)
      return
    }
    addAffiliate({
      name: `${form.nombres.trim()} ${form.apellidos.trim()}`.trim(),
      doc: form.doc.trim(),
      role: form.role,
      cargoTitular: form.cargoTitular,
      dependency: form.dependency,
      type: form.type,
      asignacionBasica: parseMoney(form.asignacionBasica),
      email: form.email.trim(),
      phone: form.phone,
      address: form.address.trim(),
      password: form.password,
      rolSindicato: form.rolSindicato,
      fotoUrl: form.fotoUrl,
      beneficios: form.beneficios,
      medio: form.medio,
      motivo: form.motivo.trim(),
      interesComites: form.interesComites.trim(),
      joinDate: form.joinDate,
    })
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
                <div className="mt-5 flex items-center gap-4">
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-ink/12 bg-canvas">
                    {form.fotoUrl ? <img src={form.fotoUrl} alt="Foto del afiliado" className="h-full w-full object-cover" /> : <CameraIcon className="h-6 w-6 text-ink/30" />}
                  </div>
                  <div>
                    <input ref={fileRef} type="file" accept="image/*" onChange={handleFoto} className="hidden" />
                    <button type="button" onClick={() => fileRef.current?.click()} disabled={subiendoFoto} className="rounded-xl border border-ink/12 px-3 py-2 text-sm font-semibold text-ink/70 transition hover:border-night hover:text-night disabled:opacity-50">
                      {subiendoFoto ? 'Subiendo…' : form.fotoUrl ? 'Cambiar foto' : 'Subir foto'}
                    </button>
                    <p className="mt-1 text-xs text-ink/45">Foto del afiliado (opcional).</p>
                  </div>
                </div>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <Field label="Nombres" placeholder="Nombres del afiliado" value={form.nombres} onChange={(v) => set('nombres', v)} required />
                  <Field label="Apellidos" placeholder="Apellidos del afiliado" value={form.apellidos} onChange={(v) => set('apellidos', v)} required />
                  <Field label="Documento de identidad" placeholder="Número de documento" value={form.doc} onChange={(v) => set('doc', v)} required error={docDup ? 'Ya existe un afiliado con este documento.' : undefined} />
                  <Field label="Correo (usuario de acceso)" placeholder="nombre@dnp.gov.co" value={form.email} onChange={(v) => set('email', v)} required error={emailDup ? 'Ya existe un afiliado con este correo.' : emailInvalid ? 'Correo no válido.' : undefined} />
                  <Field label="Dirección de domicilio" placeholder="Dirección" value={form.address} onChange={(v) => set('address', v)} />
                  <Field label="Teléfono de contacto" placeholder="300 000 0000" value={form.phone} onChange={(v) => set('phone', v)} />
                  <Field label="Contraseña de acceso" placeholder="Contraseña del afiliado" value={form.password} onChange={(v) => set('password', v)} required />
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-ink/70">Rol en el sindicato</span>
                    <select value={form.rolSindicato} onChange={(e) => set('rolSindicato', e.target.value)} className="w-full rounded-xl border border-ink/12 bg-canvas/45 px-3 py-2.5 text-sm outline-none focus:border-night focus:ring-4 focus:ring-night/10">
                      {ROL_SINDICATO.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                  </label>
                </div>
                <div className="mt-4">
                  <span className="mb-1.5 block text-xs font-semibold text-ink/70">Programas de bienestar e incentivos</span>
                  <div className="flex flex-wrap gap-2">
                    {BENEFICIOS.map((b) => (
                      <button type="button" key={b} onClick={() => toggleBeneficio(b)} className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${form.beneficios.includes(b) ? 'border-night bg-night/[0.06] text-night' : 'border-ink/12 text-ink/55 hover:border-ink/25'}`}>{b}</button>
                    ))}
                  </div>
                </div>
                <p className="mt-3 rounded-xl border border-gold/25 bg-gold/[0.07] px-3 py-2.5 text-xs text-ink/60">El afiliado usará su <strong>correo</strong> y esta <strong>contraseña</strong> para entrar a su portal, una vez la Junta Directiva <strong>apruebe</strong> su afiliación.</p>
              </div>
            ) : step === 2 ? (
              <div>
                <h3 className="font-display text-lg font-semibold">Información laboral</h3>
                <p className="mt-1 text-sm text-ink/50">Datos de vinculación en el Departamento.</p>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <ChoiceField label="Tipo de vinculación" value={form.type} onChange={(v) => set('type', v)} options={vinculaciones.map((t) => t.name)} placeholder="Seleccionar tipo" />
                  <ChoiceField label="Dependencia" value={form.dependency} onChange={(v) => set('dependency', v)} options={dependencias} placeholder="Seleccionar dependencia" />
                  <ChoiceField label="Cargo titular en el DNP" value={form.cargoTitular} onChange={(v) => set('cargoTitular', v)} options={cargos} placeholder="Seleccionar cargo titular" />
                  <ChoiceField label="Cargo que ocupa en el DNP" value={form.role} onChange={(v) => set('role', v)} options={cargos} placeholder="Seleccionar cargo" />
                  {escalas.length > 0 ? (
                    <ChoiceField
                      label="Escala salarial (autocompleta)"
                      value=""
                      onChange={(v) => { const e = sortEscalas(escalas).find((x) => `${escalaLabel(x)} · ${formatCop(x.asignacionBasica)}` === v); if (e) set('asignacionBasica', String(e.asignacionBasica)) }}
                      options={sortEscalas(escalas).map((e) => `${escalaLabel(e)} · ${formatCop(e.asignacionBasica)}`)}
                      placeholder="Elegir nivel/grado"
                    />
                  ) : null}
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-semibold text-ink/70">Asignación básica mensual</span>
                    <input value={form.asignacionBasica} onChange={(e) => set('asignacionBasica', e.target.value)} inputMode="numeric" placeholder="$ 3.500.000" className="w-full rounded-xl border border-ink/12 bg-canvas/45 px-3 py-2.5 text-sm outline-none focus:border-night focus:ring-4 focus:ring-night/10" />
                    <span className="mt-1 block text-xs text-ink/50">Base de la cuota (0,3%).{parseMoney(form.asignacionBasica) > 0 ? ` Cuota: ${formatCop(Math.round(parseMoney(form.asignacionBasica) * porcentajeCuota))}` : ''}</span>
                  </label>
                  <DateField label="Fecha de vinculación" value={form.joinDate} onChange={(v) => set('joinDate', v)} />
                  <ChoiceField label="¿Por qué medio se enteró?" value={form.medio} onChange={(v) => set('medio', v)} options={MEDIOS} placeholder="Seleccionar" />
                  <TextareaField label="¿Por qué le gustaría pertenecer al Sindicato?" value={form.motivo} onChange={(v) => set('motivo', v)} />
                  <TextareaField label="Interés en participar en comités u observaciones" value={form.interesComites} onChange={(v) => set('interesComites', v)} />
                </div>
              </div>
            ) : (
              <div>
                <h3 className="font-display text-lg font-semibold">Revisión de inscripción</h3>
                <p className="mt-1 text-sm text-ink/50">Confirma la información antes de registrar la solicitud.</p>
                <dl className="mt-5 grid gap-x-6 gap-y-3 rounded-xl border border-ink/[0.08] bg-canvas/40 p-4 text-sm sm:grid-cols-2">
                  <ReviewItem label="Nombre" value={`${form.nombres} ${form.apellidos}`.trim()} />
                  <ReviewItem label="Documento" value={form.doc} />
                  <ReviewItem label="Correo" value={form.email} />
                  <ReviewItem label="Dirección" value={form.address} />
                  <ReviewItem label="Teléfono" value={form.phone} />
                  <ReviewItem label="Vinculación" value={form.type} />
                  <ReviewItem label="Cargo titular" value={form.cargoTitular} />
                  <ReviewItem label="Cargo que ocupa" value={form.role} />
                  <ReviewItem label="Dependencia" value={form.dependency} />
                  <ReviewItem label="Asignación básica" value={parseMoney(form.asignacionBasica) > 0 ? formatCop(parseMoney(form.asignacionBasica)) : ''} />
                  <ReviewItem label="Fecha" value={form.joinDate} />
                  <ReviewItem label="Se enteró por" value={form.medio} />
                  <ReviewItem label="Programas de bienestar" value={form.beneficios.join(', ')} />
                </dl>
                <div className="mt-4 rounded-xl border border-gold/30 bg-gold/10 p-4 text-sm text-ink/70">
                  La solicitud quedará <strong>pendiente</strong>: el Fiscal emite concepto y la Junta Directiva aprueba (Art. 5).
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
  const { updateAffiliate, affiliates, cargos, dependencias, vinculaciones, escalas, porcentajeCuota } = useDemo()
  const [form, setForm] = useState({
    name: affiliate.name,
    doc: affiliate.doc,
    email: affiliate.email,
    phone: affiliate.phone,
    address: affiliate.address ?? '',
    password: affiliate.password,
    role: affiliate.role,
    cargoTitular: affiliate.cargoTitular ?? '',
    dependency: affiliate.dependency,
    type: affiliate.type,
    asignacionBasica: affiliate.asignacionBasica ? String(affiliate.asignacionBasica) : '',
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
      address: form.address.trim(),
      password: form.password,
      role: form.role,
      cargoTitular: form.cargoTitular,
      dependency: form.dependency,
      type: form.type,
      asignacionBasica: parseMoney(form.asignacionBasica),
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
          <Field label="Dirección de domicilio" placeholder="Dirección" value={form.address} onChange={(v) => set('address', v)} />
          <Field label="Contraseña de acceso" placeholder="Contraseña del afiliado" value={form.password} onChange={(v) => set('password', v)} required />
          <ChoiceField label="Cargo titular en el DNP" value={form.cargoTitular} onChange={(v) => set('cargoTitular', v)} options={cargos} placeholder="Seleccionar cargo titular" />
          <ChoiceField label="Cargo que ocupa en el DNP" value={form.role} onChange={(v) => set('role', v)} options={cargos} placeholder="Seleccionar cargo" />
          <ChoiceField label="Dependencia" value={form.dependency} onChange={(v) => set('dependency', v)} options={dependencias} placeholder="Seleccionar dependencia" />
          <ChoiceField label="Tipo de vinculación" value={form.type} onChange={(v) => set('type', v)} options={vinculaciones.map((t) => t.name)} placeholder="Seleccionar tipo" />
          <DateField label="Fecha de vinculación" value={form.joinDate} onChange={(v) => set('joinDate', v)} />
          {escalas.length > 0 ? (
            <ChoiceField
              label="Escala salarial (autocompleta)"
              value=""
              onChange={(v) => { const e = sortEscalas(escalas).find((x) => `${escalaLabel(x)} · ${formatCop(x.asignacionBasica)}` === v); if (e) set('asignacionBasica', String(e.asignacionBasica)) }}
              options={sortEscalas(escalas).map((e) => `${escalaLabel(e)} · ${formatCop(e.asignacionBasica)}`)}
              placeholder="Elegir nivel/grado"
            />
          ) : null}
          <label className="block sm:col-span-2">
            <span className="mb-1.5 block text-xs font-semibold text-ink/70">Asignación básica mensual</span>
            <input value={form.asignacionBasica} onChange={(e) => set('asignacionBasica', e.target.value)} inputMode="numeric" placeholder="$ 3.500.000" className="w-full rounded-xl border border-ink/12 bg-canvas/45 px-3 py-2.5 text-sm outline-none focus:border-night focus:ring-4 focus:ring-night/10" />
            <span className="mt-1 block text-xs text-ink/50">Base de la cuota (0,3%).{parseMoney(form.asignacionBasica) > 0 ? ` Cuota: ${formatCop(Math.round(parseMoney(form.asignacionBasica) * porcentajeCuota))}` : ''}</span>
          </label>
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

function TextareaField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block sm:col-span-2">
      <span className="mb-1.5 block text-xs font-semibold text-ink/70">{label}</span>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={2} className="w-full resize-none rounded-xl border border-ink/12 bg-canvas/45 px-3 py-2.5 text-sm outline-none focus:border-night focus:ring-4 focus:ring-night/10" />
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
