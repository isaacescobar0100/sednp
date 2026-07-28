import React, { useState } from 'react'
import { BriefcaseBusinessIcon, CircleDollarSignIcon, LandmarkIcon, PlusIcon, ScaleIcon, TagsIcon, Trash2Icon } from 'lucide-react'
import { SectionTitle } from '../components/SectionTitle'
import { useDemo } from '../store/DemoStore'
import { useSession } from '../store/session'
import { VinculacionType, nextVinculacionColor } from '../store/catalogs'
import { formatCop } from '../store/finance'

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
        <div className="grid gap-6 xl:grid-cols-2">
          <CuotaCard />
          <SmmlvCard />

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

          <div className="xl:col-span-2">
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
        <div className="flex items-end gap-2">
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-ink/70">Nuevo % (ej. 0,3)</span>
            <input value={text} onChange={(e) => setText(e.target.value)} inputMode="decimal" className="w-32 rounded-xl border border-ink/12 bg-canvas/45 px-3 py-2.5 text-sm outline-none focus:border-night focus:ring-4 focus:ring-night/10" />
          </label>
          <button onClick={() => setPorcentajeCuota(nuevoPct)} disabled={!dirty} className="rounded-xl bg-night px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-night-deep disabled:opacity-40">Guardar</button>
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
        <div className="flex items-end gap-2">
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-ink/70">Nuevo valor</span>
            <input value={text} onChange={(e) => setText(e.target.value)} inputMode="numeric" className="w-40 rounded-xl border border-ink/12 bg-canvas/45 px-3 py-2.5 text-sm outline-none focus:border-night focus:ring-4 focus:ring-night/10" />
          </label>
          <button onClick={() => setSmmlv(value)} disabled={!dirty} className="rounded-xl bg-night px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-night-deep disabled:opacity-40">Guardar</button>
        </div>
      </div>
    </section>
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
