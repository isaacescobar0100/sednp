import React, { useState } from 'react'
import { BriefcaseBusinessIcon, CircleDollarSignIcon, LandmarkIcon, PlusIcon, ScaleIcon, TagsIcon, Trash2Icon } from 'lucide-react'
import { SectionTitle } from '../components/SectionTitle'
import { useDemo } from '../store/DemoStore'
import { useSession } from '../store/session'
import { VinculacionType, nextVinculacionColor } from '../store/catalogs'
import { CuentaNaturaleza, CuentaTipo, formatCop } from '../store/finance'
import { AJUSTE_ANUAL, NIVELES, sortEscalas } from '../store/payscale'

export function ParametrosPage() {
  const { cargos, dependencias, vinculaciones, setCargos, setDependencias, setVinculaciones, notify } = useDemo()
  const { can } = useSession()
  const canManage = can('params.manage')

  return (
    <div className="mx-auto max-w-[1440px]">
      <SectionTitle
        eyebrow="Administración"
        title="Parámetros"
        description="Catálogos institucionales que alimentan los formularios del sistema."
      />

      {!canManage ? (
        <div className="rounded-2xl border border-ink/[0.08] bg-white px-6 py-8 text-sm text-ink/55">Solo la Secretaría General y la Presidencia pueden administrar los catálogos.</div>
      ) : (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <CuotaCard />
          <SmmlvCard />

          <CaucionCard />
          <JuntaPeriodoCard />

          <div className="min-w-0 xl:col-span-2">
            <PresupuestoCard />
          </div>

          <div className="min-w-0 xl:col-span-2">
            <EscalasCard />
          </div>

          <div className="min-w-0 xl:col-span-2">
            <PucCatalogCard />
          </div>

          <ListCatalog
            title="Cargos"
            hint="Cargos disponibles al vincular un afiliado."
            icon={BriefcaseBusinessIcon}
            items={cargos}
            onAdd={(v) => setCargos([...cargos, v])}
            onDelete={(v) => setCargos(cargos.filter((c) => c !== v))}
            exists={(v) => cargos.some((c) => c.toLowerCase() === v.toLowerCase())}
            notify={notify}
            placeholder="Ej. Profesional especializado"
          />

          <ListCatalog
            title="Dependencias"
            hint="Áreas o dependencias del Departamento."
            icon={LandmarkIcon}
            items={dependencias}
            onAdd={(v) => setDependencias([...dependencias, v])}
            onDelete={(v) => setDependencias(dependencias.filter((d) => d !== v))}
            exists={(v) => dependencias.some((d) => d.toLowerCase() === v.toLowerCase())}
            notify={notify}
            placeholder="Ej. Oficina de Planeación"
          />

          <div className="min-w-0 xl:col-span-2">
            <VinculacionCatalog
              items={vinculaciones}
              setItems={setVinculaciones}
              notify={notify}
            />
          </div>
        </div>
      )}
    </div>
  )
}

function CuotaCard() {
  const { porcentajeCuota, setPorcentajeCuota } = useDemo()
  const [text, setText] = useState(String(+(porcentajeCuota * 100).toFixed(2)))
  const value = Number(text.replace(',', '.'))
  const nuevoPct = value / 100
  const dirty = !Number.isNaN(value) && value >= 0 && nuevoPct !== porcentajeCuota
  const actual = (porcentajeCuota * 100).toLocaleString('es-CO', { maximumFractionDigits: 2 })

  return (
    <section className="rounded-2xl border border-ink/[0.08] bg-white p-5">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-canvas text-night"><CircleDollarSignIcon className="h-5 w-5" strokeWidth={1.8} /></div>
          <div>
            <h2 className="font-display text-base font-semibold">Cuota sindical ordinaria</h2>
            <p className="text-xs text-ink/50">Porcentaje sobre la asignación básica mensual (Art. 32) · actual: {actual}%</p>
          </div>
        </div>
        <div className="flex w-full items-end gap-2 sm:w-auto">
          <label className="block flex-1 sm:flex-none">
            <span className="mb-1.5 block text-xs font-semibold text-ink/70">Nuevo % (ej. 0,3)</span>
            <input value={text} onChange={(e) => setText(e.target.value)} inputMode="decimal" className="w-full rounded-xl border border-ink/12 bg-canvas/45 px-3 py-2.5 text-sm outline-none focus:border-night focus:ring-4 focus:ring-night/10 sm:w-32" />
          </label>
          <button onClick={() => setPorcentajeCuota(nuevoPct)} disabled={!dirty} className="shrink-0 rounded-xl bg-night px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-night-deep disabled:opacity-40">Guardar</button>
        </div>
      </div>
    </section>
  )
}

function SmmlvCard() {
  const { smmlv, setSmmlv } = useDemo()
  const [text, setText] = useState(String(smmlv))
  const value = Number(text.replace(/\D/g, ''))
  const dirty = value !== smmlv && value > 0

  return (
    <section className="rounded-2xl border border-ink/[0.08] bg-white p-5">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-canvas text-night"><ScaleIcon className="h-5 w-5" strokeWidth={1.8} /></div>
          <div>
            <h2 className="font-display text-base font-semibold">SMMLV vigente</h2>
            <p className="text-xs text-ink/50">Base de los rangos de aprobación de gastos (Art. 34) · actual: {formatCop(smmlv)}</p>
          </div>
        </div>
        <div className="flex w-full items-end gap-2 sm:w-auto">
          <label className="block flex-1 sm:flex-none">
            <span className="mb-1.5 block text-xs font-semibold text-ink/70">Nuevo valor</span>
            <input value={text} onChange={(e) => setText(e.target.value)} inputMode="numeric" className="w-full rounded-xl border border-ink/12 bg-canvas/45 px-3 py-2.5 text-sm outline-none focus:border-night focus:ring-4 focus:ring-night/10 sm:w-40" />
          </label>
          <button onClick={() => setSmmlv(value)} disabled={!dirty} className="shrink-0 rounded-xl bg-night px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-night-deep disabled:opacity-40">Guardar</button>
        </div>
      </div>
    </section>
  )
}

// Caución del Tesorero (Art. 26): garantía del manejo de fondos, con vencimiento.
function CaucionCard() {
  const { caucionVence, setCaucion } = useDemo()
  const [date, setDate] = useState(caucionVence)
  const dirty = date !== caucionVence
  return (
    <section className="rounded-2xl border border-ink/[0.08] bg-white p-5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-canvas text-night"><ScaleIcon className="h-5 w-5" strokeWidth={1.8} /></div>
        <div>
          <h2 className="font-display text-base font-semibold">Caución del Tesorero</h2>
          <p className="text-xs text-ink/50">Garantía del manejo de fondos (Art. 26){caucionVence ? ` · vence ${caucionVence}` : ' · sin registrar'}</p>
        </div>
      </div>
      <div className="mt-4 flex w-full items-end gap-2">
        <label className="block flex-1 sm:flex-none">
          <span className="mb-1.5 block text-xs font-semibold text-ink/70">Fecha de vencimiento</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full rounded-xl border border-ink/12 bg-canvas/45 px-3 py-2.5 text-sm outline-none focus:border-night sm:w-auto" />
        </label>
        <button onClick={() => setCaucion(date)} disabled={!dirty} className="shrink-0 rounded-xl bg-night px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-night-deep disabled:opacity-40">Guardar</button>
      </div>
    </section>
  )
}

// Periodo de la Junta Directiva: se elige por la Asamblea cada 2 años (Art. 13).
function JuntaPeriodoCard() {
  const { juntaDesde, setJuntaDesde } = useDemo()
  const [date, setDate] = useState(juntaDesde)
  const dirty = date !== juntaDesde
  const proxima = /^\d{4}-\d{2}-\d{2}$/.test(juntaDesde) ? `${Number(juntaDesde.slice(0, 4)) + 2}${juntaDesde.slice(4)}` : null
  return (
    <section className="rounded-2xl border border-ink/[0.08] bg-white p-5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-canvas text-night"><LandmarkIcon className="h-5 w-5" strokeWidth={1.8} /></div>
        <div>
          <h2 className="font-display text-base font-semibold">Periodo de la Junta Directiva</h2>
          <p className="text-xs text-ink/50">Elección por la Asamblea cada 2 años (Art. 13){proxima ? ` · próxima elección ${proxima}` : ''}</p>
        </div>
      </div>
      <div className="mt-4 flex w-full items-end gap-2">
        <label className="block flex-1 sm:flex-none">
          <span className="mb-1.5 block text-xs font-semibold text-ink/70">Inicio del periodo actual</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full rounded-xl border border-ink/12 bg-canvas/45 px-3 py-2.5 text-sm outline-none focus:border-night sm:w-auto" />
        </label>
        <button onClick={() => setJuntaDesde(date)} disabled={!dirty} className="shrink-0 rounded-xl bg-night px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-night-deep disabled:opacity-40">Guardar</button>
      </div>
    </section>
  )
}

// Escalas salariales (Decreto anual de la Función Pública): nivel/grado →
// asignación básica. Alimenta el autocompletado de la asignación al afiliar y
// permite el ajuste anual en bloque.
function EscalasCard() {
  const { escalas, setEscalas, notify } = useDemo()
  const [nivel, setNivel] = useState(NIVELES[0])
  const [grado, setGrado] = useState('')
  const [monto, setMonto] = useState('')
  const asignacion = Number(monto.replace(/\D/g, ''))
  const ordered = sortEscalas(escalas)

  function add() {
    const g = grado.trim()
    if (!g || asignacion <= 0) return
    if (escalas.some((e) => e.nivel === nivel && e.grado === g)) { notify(`La escala ${nivel} grado ${g} ya existe.`, 'warning'); return }
    setEscalas([...escalas, { id: `esc-${Date.now()}`, nivel, grado: g, asignacionBasica: asignacion }])
    setGrado(''); setMonto('')
    notify(`Escala ${nivel} grado ${g} agregada.`, 'success')
  }
  function remove(id: string) {
    setEscalas(escalas.filter((e) => e.id !== id))
  }
  function ajustar() {
    if (escalas.length === 0) return
    if (!window.confirm(`¿Aplicar el ajuste anual de ${AJUSTE_ANUAL * 100}% a todas las escalas?`)) return
    setEscalas(escalas.map((e) => ({ ...e, asignacionBasica: Math.round(e.asignacionBasica * (1 + AJUSTE_ANUAL)) })))
    notify(`Ajuste de ${AJUSTE_ANUAL * 100}% aplicado a las escalas.`, 'success')
  }

  const inputClass = 'rounded-xl border border-ink/12 bg-canvas/45 px-3 py-2.5 text-sm outline-none focus:border-night'

  return (
    <section className="rounded-2xl border border-ink/[0.08] bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-canvas text-night"><CircleDollarSignIcon className="h-5 w-5" strokeWidth={1.8} /></div>
          <div>
            <h2 className="font-display text-base font-semibold">Escalas salariales</h2>
            <p className="text-xs text-ink/50">Nivel/grado → asignación básica (Decreto Función Pública) · {escalas.length} escalas</p>
          </div>
        </div>
        <button onClick={ajustar} disabled={escalas.length === 0} className="rounded-xl border border-night/25 px-3 py-2 text-xs font-semibold text-night transition hover:bg-night/5 disabled:opacity-40">Ajuste anual +{AJUSTE_ANUAL * 100}%</button>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-[150px_110px_1fr_auto]">
        <select value={nivel} onChange={(e) => setNivel(e.target.value)} className={inputClass}>
          {NIVELES.map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
        <input value={grado} onChange={(e) => setGrado(e.target.value)} placeholder="Grado" className={inputClass} />
        <input value={monto} onChange={(e) => setMonto(e.target.value)} inputMode="numeric" placeholder="Asignación básica" className={inputClass} />
        <button onClick={add} disabled={!grado.trim() || asignacion <= 0} className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-night px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-night-deep disabled:opacity-40"><PlusIcon className="h-4 w-4" />Agregar</button>
      </div>

      <div className="mt-4 overflow-x-auto">
        {ordered.length > 0 ? (
          <table className="w-full min-w-[420px] text-left text-sm">
            <thead className="text-[10px] uppercase tracking-[0.12em] text-ink/45">
              <tr><th className="py-2 pr-3 font-semibold">Nivel</th><th className="py-2 pr-3 font-semibold">Grado</th><th className="py-2 pr-3 font-semibold">Asignación básica</th><th className="py-2 text-right font-semibold"></th></tr>
            </thead>
            <tbody className="divide-y divide-ink/[0.07]">
              {ordered.map((e) => (
                <tr key={e.id}>
                  <td className="py-2 pr-3 text-ink/80">{e.nivel}</td>
                  <td className="py-2 pr-3 text-ink/60">{e.grado}</td>
                  <td className="py-2 pr-3 font-medium text-ink">{formatCop(e.asignacionBasica)}</td>
                  <td className="py-2 text-right"><button onClick={() => remove(e.id)} className="rounded-lg p-1 text-ink/40 transition hover:bg-brick/10 hover:text-brick" aria-label={`Eliminar ${e.nivel} ${e.grado}`}><Trash2Icon className="h-3.5 w-3.5" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <p className="py-6 text-center text-xs text-ink/45">Sin escalas. Carga los valores del decreto vigente para autocompletar la asignación al afiliar.</p>}
      </div>
    </section>
  )
}

// Catálogo de cuentas (PUC) parametrizable — sección 2 del conceptual financiero.
function PucCatalogCard() {
  const { cuentas, setCuentas, notify } = useDemo()
  const [codigo, setCodigo] = useState('')
  const [nombre, setNombre] = useState('')
  const [tipo, setTipo] = useState<CuentaTipo>('Gasto')
  const naturaleza: CuentaNaturaleza = tipo === 'Ingreso' ? 'Crédito' : 'Débito'

  function add() {
    const c = codigo.trim(); const n = nombre.trim()
    if (!c || !n) return
    if (cuentas.some((x) => x.codigo === c)) { notify(`La cuenta ${c} ya existe.`, 'warning'); return }
    setCuentas([...cuentas, { codigo: c, nombre: n, tipo, naturaleza, activa: true }])
    setCodigo(''); setNombre('')
    notify(`Cuenta ${c} agregada al catálogo.`, 'success')
  }
  function toggle(cod: string) {
    setCuentas(cuentas.map((x) => (x.codigo === cod ? { ...x, activa: !x.activa } : x)))
  }
  function remove(cod: string) {
    setCuentas(cuentas.filter((x) => x.codigo !== cod))
  }

  const inputClass = 'rounded-xl border border-ink/12 bg-canvas/45 px-3 py-2.5 text-sm outline-none focus:border-night'

  return (
    <section className="rounded-2xl border border-ink/[0.08] bg-white p-5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-canvas text-night"><TagsIcon className="h-5 w-5" strokeWidth={1.8} /></div>
        <div>
          <h2 className="font-display text-base font-semibold">Catálogo de cuentas (PUC)</h2>
          <p className="text-xs text-ink/50">Plan de cuentas para movimientos y exportación contable · {cuentas.length} cuentas</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-[130px_1fr_130px_auto]">
        <input value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder="Código" inputMode="numeric" className={inputClass} />
        <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre de la cuenta" className={inputClass} />
        <select value={tipo} onChange={(e) => setTipo(e.target.value as CuentaTipo)} className={inputClass}>
          {(['Activo', 'Ingreso', 'Gasto'] as CuentaTipo[]).map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <button onClick={add} disabled={!codigo.trim() || !nombre.trim()} className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-night px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-night-deep disabled:opacity-40"><PlusIcon className="h-4 w-4" />Agregar</button>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead className="text-[10px] uppercase tracking-[0.12em] text-ink/45">
            <tr>
              <th className="py-2 pr-3 font-semibold">Código</th>
              <th className="py-2 pr-3 font-semibold">Nombre</th>
              <th className="py-2 pr-3 font-semibold">Tipo</th>
              <th className="py-2 pr-3 font-semibold">Naturaleza</th>
              <th className="py-2 pr-3 text-right font-semibold">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/[0.07]">
            {cuentas.map((c) => (
              <tr key={c.codigo}>
                <td className="py-2 pr-3 font-mono text-xs text-ink/70">{c.codigo}</td>
                <td className="py-2 pr-3 text-ink/80">{c.nombre}</td>
                <td className="py-2 pr-3 text-ink/55">{c.tipo}</td>
                <td className="py-2 pr-3 text-ink/55">{c.naturaleza}</td>
                <td className="py-2 pr-3 text-right">
                  <div className="inline-flex items-center gap-1.5">
                    <button onClick={() => toggle(c.codigo)} className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${c.activa ? 'bg-emerald-100 text-emerald-700' : 'bg-ink/[0.06] text-ink/45'}`}>{c.activa ? 'Activa' : 'Inactiva'}</button>
                    <button onClick={() => remove(c.codigo)} className="rounded-lg p-1 text-ink/40 transition hover:bg-brick/10 hover:text-brick" aria-label={`Eliminar ${c.codigo}`}><Trash2Icon className="h-3.5 w-3.5" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

// Presupuesto anual por rubro de gasto (Art. 11f/26). La Junta lo aprueba y el
// módulo Financiero controla su ejecución.
function PresupuestoCard() {
  const { presupuestos, setPresupuesto, deletePresupuesto, notify } = useDemo()
  const [nuevo, setNuevo] = useState('')

  function addRubro() {
    const name = nuevo.trim()
    if (!name) return
    if (presupuestos.some((p) => p.category.toLowerCase() === name.toLowerCase())) { notify(`El rubro "${name}" ya existe.`, 'warning'); return }
    setPresupuesto(name, 0)
    setNuevo('')
  }

  return (
    <section className="rounded-2xl border border-ink/[0.08] bg-white p-5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-canvas text-night"><CircleDollarSignIcon className="h-5 w-5" strokeWidth={1.8} /></div>
        <div>
          <h2 className="font-display text-base font-semibold">Presupuesto anual por rubro</h2>
          <p className="text-xs text-ink/50">Rubros de gasto de la organización; su ejecución se controla en Financiero · {presupuestos.length} rubros</p>
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <input
          value={nuevo}
          onChange={(e) => setNuevo(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') addRubro() }}
          placeholder="Nuevo rubro (ej. Jurídico, Deportes…)"
          className="w-full rounded-xl border border-ink/12 bg-canvas/45 px-3 py-2.5 text-sm outline-none focus:border-night focus:ring-4 focus:ring-night/10"
        />
        <button onClick={addRubro} disabled={!nuevo.trim()} className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-night px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-night-deep disabled:opacity-40"><PlusIcon className="h-4 w-4" />Agregar</button>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {presupuestos.map((p) => <PresupuestoRubro key={p.category} category={p.category} anual={p.anual} onSave={(v) => setPresupuesto(p.category, v)} onDelete={() => deletePresupuesto(p.category)} />)}
        {presupuestos.length === 0 ? <p className="py-4 text-center text-xs text-ink/45 sm:col-span-2">Sin rubros. Agrega el primero arriba.</p> : null}
      </div>
    </section>
  )
}

function PresupuestoRubro({ category, anual, onSave, onDelete }: { category: string; anual: number; onSave: (v: number) => void; onDelete: () => void }) {
  const [text, setText] = useState(String(anual))
  const value = Number(text.replace(/\D/g, ''))
  const dirty = value !== anual

  return (
    <div className="rounded-xl border border-ink/10 bg-canvas/40 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="min-w-0 truncate text-sm font-semibold text-ink">{category}</span>
        <div className="flex shrink-0 items-center gap-2">
          <span className="text-[11px] text-ink/45">actual: {formatCop(anual)}</span>
          <button onClick={onDelete} className="rounded-lg p-1 text-ink/40 transition hover:bg-brick/10 hover:text-brick" aria-label={`Eliminar rubro ${category}`}><Trash2Icon className="h-3.5 w-3.5" /></button>
        </div>
      </div>
      <div className="mt-2 flex gap-2">
        <input value={text} onChange={(e) => setText(e.target.value)} inputMode="numeric" className="w-full rounded-lg border border-ink/12 bg-white px-3 py-2 text-sm outline-none focus:border-night" placeholder="Monto anual" />
        <button onClick={() => onSave(value)} disabled={!dirty} className="shrink-0 rounded-lg bg-night px-3 text-sm font-semibold text-white transition hover:bg-night-deep disabled:opacity-40">Guardar</button>
      </div>
    </div>
  )
}

type NotifyFn = (message: string, tone?: 'success' | 'info' | 'warning') => void

function ListCatalog({
  title, hint, icon: Icon, items, onAdd, onDelete, exists, notify, placeholder,
}: {
  title: string
  hint: string
  icon: typeof BriefcaseBusinessIcon
  items: string[]
  onAdd: (value: string) => void
  onDelete: (value: string) => void
  exists: (value: string) => boolean
  notify: NotifyFn
  placeholder: string
}) {
  const [value, setValue] = useState('')

  function add() {
    const v = value.trim()
    if (!v) return
    if (exists(v)) {
      notify(`"${v}" ya existe en ${title.toLowerCase()}.`, 'warning')
      return
    }
    onAdd(v)
    setValue('')
    notify(`${title}: "${v}" agregado.`, 'success')
  }

  return (
    <section className="rounded-2xl border border-ink/[0.08] bg-white p-5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-canvas text-night"><Icon className="h-5 w-5" strokeWidth={1.8} /></div>
        <div>
          <h2 className="font-display text-base font-semibold">{title}</h2>
          <p className="text-xs text-ink/50">{hint} · {items.length} registrados</p>
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') add() }}
          placeholder={placeholder}
          className="w-full rounded-xl border border-ink/12 bg-canvas/45 px-3 py-2.5 text-sm outline-none focus:border-night focus:ring-4 focus:ring-night/10"
        />
        <button onClick={add} disabled={!value.trim()} className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-night px-4 text-sm font-semibold text-white transition hover:bg-night-deep disabled:opacity-40"><PlusIcon className="h-4 w-4" />Agregar</button>
      </div>

      <ul className="mt-4 divide-y divide-ink/[0.07]">
        {items.map((item) => (
          <li key={item} className="flex items-center justify-between py-2.5 text-sm">
            <span className="text-ink/75">{item}</span>
            <button onClick={() => onDelete(item)} className="rounded-lg p-1.5 text-ink/40 transition hover:bg-brick/10 hover:text-brick" aria-label={`Eliminar ${item}`}><Trash2Icon className="h-4 w-4" /></button>
          </li>
        ))}
        {items.length === 0 ? <li className="py-6 text-center text-xs text-ink/45">Sin registros. Agrega el primero.</li> : null}
      </ul>
    </section>
  )
}

function VinculacionCatalog({ items, setItems, notify }: { items: VinculacionType[]; setItems: (list: VinculacionType[]) => void; notify: NotifyFn }) {
  const [value, setValue] = useState('')

  function add() {
    const v = value.trim()
    if (!v) return
    if (items.some((t) => t.name.toLowerCase() === v.toLowerCase())) {
      notify(`"${v}" ya existe en tipos de vinculación.`, 'warning')
      return
    }
    setItems([...items, { id: `vin-${Date.now()}`, name: v, color: nextVinculacionColor(items) }])
    setValue('')
    notify(`Tipo de vinculación "${v}" agregado.`, 'success')
  }
  function remove(id: string) {
    setItems(items.filter((t) => t.id !== id))
  }

  return (
    <section className="rounded-2xl border border-ink/[0.08] bg-white p-5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-canvas text-night"><TagsIcon className="h-5 w-5" strokeWidth={1.8} /></div>
        <div>
          <h2 className="font-display text-base font-semibold">Tipos de vinculación</h2>
          <p className="text-xs text-ink/50">Clasificación usada en el padrón y en los gráficos · {items.length} tipos</p>
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') add() }}
          placeholder="Ej. Contratista"
          className="w-full max-w-md rounded-xl border border-ink/12 bg-canvas/45 px-3 py-2.5 text-sm outline-none focus:border-night focus:ring-4 focus:ring-night/10"
        />
        <button onClick={add} disabled={!value.trim()} className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-night px-4 text-sm font-semibold text-white transition hover:bg-night-deep disabled:opacity-40"><PlusIcon className="h-4 w-4" />Agregar</button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {items.map((type) => (
          <span key={type.id} className="inline-flex items-center gap-2 rounded-full border border-ink/10 bg-canvas/50 py-1.5 pl-2.5 pr-1.5 text-sm text-ink/75">
            <i className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: type.color }} />
            {type.name}
            <button onClick={() => remove(type.id)} className="rounded-full p-1 text-ink/40 transition hover:bg-brick/10 hover:text-brick" aria-label={`Eliminar ${type.name}`}><Trash2Icon className="h-3.5 w-3.5" /></button>
          </span>
        ))}
        {items.length === 0 ? <p className="py-4 text-xs text-ink/45">Sin tipos de vinculación.</p> : null}
      </div>
    </section>
  )
}
