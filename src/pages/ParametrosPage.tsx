import React, { useRef, useState } from 'react'
import { BriefcaseBusinessIcon, CircleDollarSignIcon, ImageIcon, LandmarkIcon, PlusIcon, ScaleIcon, TagsIcon, Trash2Icon } from 'lucide-react'
import { SectionTitle } from '../components/SectionTitle'
import { supabase } from '../lib/supabase'
import { subirFoto } from '../store/storageApi'
import { useDemo } from '../store/DemoStore'
import { useSession } from '../store/session'
import { useAuth } from '../store/auth'
import { cita, REF_KEYS } from '../store/referencias'
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
        <ParametrosReadOnly />
      ) : (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <div className="min-w-0 xl:col-span-2">
            <LogoSindicatoCard />
          </div>

          <div className="min-w-0 xl:col-span-2">
            <MensajeBienvenidaCard />
          </div>

          <div className="min-w-0 xl:col-span-2">
            <ReferenciasCard />
          </div>

          <div className="min-w-0 xl:col-span-2">
            <RecaudoCard />
          </div>

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
            placeholder="Ej. Recursos Humanos"
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

// Vista de solo lectura de los catálogos: para los cargos que NO administran
// parámetros (p. ej. Tesorería, Fiscal). Ven toda la configuración vigente pero
// sin campos ni botones para modificarla.
function ParametrosReadOnly() {
  const { porcentajeCuota, smmlv, caucionVence, juntaDesde, escalas, presupuestos, cuentas, cargos, dependencias, vinculaciones } = useDemo()
  const { org } = useAuth()
  const ordered = sortEscalas(escalas)
  const actualPct = (porcentajeCuota * 100).toLocaleString('es-CO', { maximumFractionDigits: 2 })
  const proxima = /^\d{4}-\d{2}-\d{2}$/.test(juntaDesde) ? `${Number(juntaDesde.slice(0, 4)) + 2}${juntaDesde.slice(4)}` : '—'

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 rounded-xl border border-gold/30 bg-gold/[0.08] px-4 py-3 text-sm text-ink/70">
        <ScaleIcon className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
        <p>Vista de <strong>solo lectura</strong>: puedes consultar la configuración del sindicato. La administración de estos catálogos corresponde a la Secretaría General y la Presidencia.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <ROCard title="Logo del sindicato">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-ink/10 bg-canvas">
              <img src={org?.logoUrl || '/sindika.png'} alt="Logo del sindicato" className="h-full w-full object-contain" />
            </div>
            <p className="text-sm font-semibold text-ink">{org?.nombre ?? 'Sindika'}</p>
          </div>
        </ROCard>

        <ROCard title="Cuota sindical ordinaria" hint={`Porcentaje sobre la asignación básica${cita('cuota')}`}>
          <p className="font-display text-2xl font-semibold text-ink">{actualPct}%</p>
        </ROCard>

        <ROCard title="SMMLV vigente" hint={`Base de los rangos de aprobación de gastos${cita('gasto_asamblea')}`}>
          <p className="font-display text-2xl font-semibold text-ink">{formatCop(smmlv)}</p>
        </ROCard>

        <ROCard title="Caución del Tesorero" hint={`Garantía del manejo de fondos${cita('caucion')}`}>
          <p className="text-sm text-ink/80">{caucionVence ? `Vence: ${caucionVence}` : 'Sin registrar'}</p>
        </ROCard>

        <ROCard title="Periodo de la Junta Directiva" hint={`Elección por la Asamblea cada 2 años${cita('junta')}`}>
          <p className="text-sm text-ink/80">Inicio: {juntaDesde || '—'}</p>
          <p className="text-sm text-ink/60">Próxima elección: {proxima}</p>
        </ROCard>

        <div className="min-w-0 xl:col-span-2">
          <ROCard title="Presupuesto anual por rubro" hint={`${presupuestos.length} rubros`}>
            {presupuestos.length > 0 ? (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {presupuestos.map((p) => (
                  <div key={p.category} className="flex items-center justify-between rounded-xl border border-ink/10 bg-canvas/40 px-3 py-2 text-sm">
                    <span className="min-w-0 truncate text-ink/75">{p.category}</span>
                    <span className="shrink-0 font-medium text-ink">{formatCop(p.anual)}</span>
                  </div>
                ))}
              </div>
            ) : <p className="text-xs text-ink/45">Sin rubros definidos.</p>}
          </ROCard>
        </div>

        <div className="min-w-0 xl:col-span-2">
          <ROCard title="Escalas salariales" hint={`${escalas.length} escalas · nivel/grado → asignación básica`}>
            {ordered.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[420px] text-left text-sm">
                  <thead className="text-[10px] uppercase tracking-[0.12em] text-ink/45">
                    <tr><th className="py-2 pr-3 font-semibold">Nivel</th><th className="py-2 pr-3 font-semibold">Grado</th><th className="py-2 pr-3 font-semibold">Asignación básica</th></tr>
                  </thead>
                  <tbody className="divide-y divide-ink/[0.07]">
                    {ordered.map((e) => (
                      <tr key={e.id}>
                        <td className="py-2 pr-3 text-ink/80">{e.nivel}</td>
                        <td className="py-2 pr-3 text-ink/60">{e.grado}</td>
                        <td className="py-2 pr-3 font-medium text-ink">{formatCop(e.asignacionBasica)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <p className="text-xs text-ink/45">Sin escalas cargadas.</p>}
          </ROCard>
        </div>

        <div className="min-w-0 xl:col-span-2">
          <ROCard title="Catálogo de cuentas (PUC)" hint={`${cuentas.length} cuentas`}>
            {cuentas.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-left text-sm">
                  <thead className="text-[10px] uppercase tracking-[0.12em] text-ink/45">
                    <tr><th className="py-2 pr-3 font-semibold">Código</th><th className="py-2 pr-3 font-semibold">Nombre</th><th className="py-2 pr-3 font-semibold">Tipo</th><th className="py-2 pr-3 font-semibold">Naturaleza</th><th className="py-2 pr-3 font-semibold">Estado</th></tr>
                  </thead>
                  <tbody className="divide-y divide-ink/[0.07]">
                    {cuentas.map((c) => (
                      <tr key={c.codigo}>
                        <td className="py-2 pr-3 font-mono text-xs text-ink/70">{c.codigo}</td>
                        <td className="py-2 pr-3 text-ink/80">{c.nombre}</td>
                        <td className="py-2 pr-3 text-ink/55">{c.tipo}</td>
                        <td className="py-2 pr-3 text-ink/55">{c.naturaleza}</td>
                        <td className="py-2 pr-3 text-ink/55">{c.activa ? 'Activa' : 'Inactiva'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <p className="text-xs text-ink/45">Sin cuentas registradas.</p>}
          </ROCard>
        </div>

        <ROCard title="Cargos" hint={`${cargos.length} registrados`}>
          {cargos.length > 0 ? (
            <ul className="divide-y divide-ink/[0.07] text-sm">
              {cargos.map((c) => <li key={c} className="py-2 text-ink/75">{c}</li>)}
            </ul>
          ) : <p className="text-xs text-ink/45">Sin registros.</p>}
        </ROCard>

        <ROCard title="Dependencias" hint={`${dependencias.length} registradas`}>
          {dependencias.length > 0 ? (
            <ul className="divide-y divide-ink/[0.07] text-sm">
              {dependencias.map((d) => <li key={d} className="py-2 text-ink/75">{d}</li>)}
            </ul>
          ) : <p className="text-xs text-ink/45">Sin registros.</p>}
        </ROCard>

        <div className="min-w-0 xl:col-span-2">
          <ROCard title="Tipos de vinculación" hint={`${vinculaciones.length} tipos`}>
            {vinculaciones.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {vinculaciones.map((t) => (
                  <span key={t.id} className="inline-flex items-center gap-2 rounded-full border border-ink/10 bg-canvas/50 px-3 py-1.5 text-sm text-ink/75">
                    <i className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: t.color }} />
                    {t.name}
                  </span>
                ))}
              </div>
            ) : <p className="text-xs text-ink/45">Sin tipos de vinculación.</p>}
          </ROCard>
        </div>
      </div>
    </div>
  )
}

function ROCard({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="min-w-0 rounded-2xl border border-ink/[0.08] bg-white p-5">
      <h2 className="font-display text-base font-semibold">{title}</h2>
      {hint ? <p className="mt-0.5 text-xs text-ink/50">{hint}</p> : null}
      <div className="mt-3">{children}</div>
    </section>
  )
}

function LogoSindicatoCard() {
  const { org, refreshProfile } = useAuth()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  async function handle(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setBusy(true); setError('')
    try {
      const url = await subirFoto(file)
      const { error } = await supabase.rpc('set_logo_sindicato', { p_url: url })
      if (error) throw error
      await refreshProfile()
    } catch {
      setError('No se pudo guardar el logo. Inténtalo de nuevo.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="rounded-2xl border border-ink/[0.08] bg-white p-5">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-ink/10 bg-canvas">
          <img src={org?.logoUrl || '/sindika.png'} alt="Logo del sindicato" className="h-full w-full object-contain" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-base font-semibold">Logo del sindicato</h2>
          <p className="text-xs text-ink/50">Aparece en el acceso y dentro de la app de tu sindicato. Ideal: PNG con fondo transparente.</p>
          {error ? <p className="mt-1 text-xs text-brick">{error}</p> : null}
        </div>
        <input ref={fileRef} type="file" accept="image/*" onChange={handle} className="hidden" />
        <button onClick={() => fileRef.current?.click()} disabled={busy} className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-night px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-night-deep disabled:opacity-50">
          <ImageIcon className="h-4 w-4" />{busy ? 'Subiendo…' : 'Subir logo'}
        </button>
      </div>
    </section>
  )
}

// Plantilla de borrador lista para editar (genérica, con placeholders).
const PLANTILLA_BIENVENIDA = `Hola {nombre},

Nos complace darte la bienvenida a {sindicato}. La Junta Directiva aprobó tu afiliación mediante el Acta No. {acta}, y desde hoy eres parte oficial de nuestra organización.

Como afiliado(a) tienes voz y voto en las decisiones, acompañamiento y representación ante la entidad, y acceso a los beneficios, actividades y servicios del sindicato.

Puedes ingresar a tu portal con tu correo y la contraseña que te asignaron para consultar tus aportes, comunicados, votaciones y documentos.

Cualquier inquietud, estamos para servirte. ¡Bienvenido(a)!

Cordialmente,
Junta Directiva de {sindicato}`

// Editor de referencias normativas (citas de estatutos) por sindicato.
function ReferenciasCard() {
  const { org, refreshProfile } = useAuth()
  const [vals, setVals] = useState<Record<string, string>>(() => ({ ...(org?.referencias ?? {}) }))
  const [busy, setBusy] = useState(false)
  const [estado, setEstado] = useState<{ ok: boolean; msg: string } | null>(null)

  async function guardar() {
    setBusy(true); setEstado(null)
    const limpio: Record<string, string> = {}
    for (const [k, v] of Object.entries(vals)) { const t = (v || '').trim(); if (t) limpio[k] = t }
    const { error } = await supabase.rpc('set_referencias', { p_refs: limpio })
    setBusy(false)
    if (error) { setEstado({ ok: false, msg: error.message }); return }
    await refreshProfile()
    setEstado({ ok: true, msg: 'Referencias guardadas. Se reflejan en los módulos.' })
  }

  const grupos = REF_KEYS.reduce((acc, r) => { (acc[r.modulo] ??= []).push(r); return acc }, {} as Record<string, typeof REF_KEYS>)

  return (
    <section className="rounded-2xl border border-ink/[0.08] bg-white p-5">
      <h2 className="font-display text-base font-semibold">Referencias normativas</h2>
      <p className="mt-0.5 text-xs text-ink/50">Números de artículo de <strong>tus estatutos</strong> que se muestran como citas en los módulos. Lo que dejes vacío no mostrará ninguna cita (solo la regla). El texto gris es un ejemplo.</p>
      <div className="mt-4 space-y-5">
        {Object.entries(grupos).map(([modulo, items]) => (
          <div key={modulo}>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink/45">{modulo}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {items.map((r) => (
                <label key={r.key} className="block">
                  <span className="mb-1 block text-[11px] font-medium text-ink/60">{r.label}</span>
                  <input value={vals[r.key] ?? ''} onChange={(e) => setVals((s) => ({ ...s, [r.key]: e.target.value }))} placeholder={r.ejemplo} className="w-full rounded-lg border border-ink/12 bg-canvas/45 px-3 py-2 text-sm outline-none focus:border-night focus:ring-4 focus:ring-night/10" />
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
      {estado ? <p className={`mt-2 text-xs ${estado.ok ? 'text-emerald-700' : 'text-brick'}`}>{estado.msg}</p> : null}
      <div className="mt-3 flex justify-end">
        <button onClick={guardar} disabled={busy} className="inline-flex items-center gap-1.5 rounded-xl bg-night px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-night-deep disabled:opacity-50">{busy ? 'Guardando…' : 'Guardar referencias'}</button>
      </div>
    </section>
  )
}

// Modo de recaudo de la cuota (nómina / transferencia / PSE) + instrucciones.
function RecaudoCard() {
  const { org, refreshProfile } = useAuth()
  const [modo, setModo] = useState(org?.modoRecaudo ?? 'nomina')
  const [instrucciones, setInstrucciones] = useState(org?.instruccionesPago ?? '')
  const [busy, setBusy] = useState(false)
  const [estado, setEstado] = useState<{ ok: boolean; msg: string } | null>(null)

  async function guardar() {
    setBusy(true); setEstado(null)
    const { error } = await supabase.rpc('set_recaudo', { p_modo: modo, p_instrucciones: modo === 'nomina' ? null : instrucciones })
    setBusy(false)
    if (error) { setEstado({ ok: false, msg: error.message }); return }
    await refreshProfile()
    setEstado({ ok: true, msg: 'Modo de recaudo guardado.' })
  }

  return (
    <section className="rounded-2xl border border-ink/[0.08] bg-white p-5">
      <h2 className="font-display text-base font-semibold">Recaudo de la cuota</h2>
      <p className="mt-0.5 text-xs text-ink/50">Define cómo pagan la cuota tus afiliados.</p>
      <label className="mt-3 block">
        <span className="mb-1 block text-xs font-medium text-ink/70">Modo</span>
        <select value={modo} onChange={(e) => setModo(e.target.value)} className="w-full rounded-xl border border-ink/12 bg-canvas/45 px-3 py-2.5 text-sm outline-none focus:border-night focus:ring-4 focus:ring-night/10">
          <option value="nomina">Descuento por nómina (el afiliado no paga en la app)</option>
          <option value="transferencia">Transferencia bancaria</option>
          <option value="pse">Pago en línea / PSE</option>
        </select>
      </label>
      {modo !== 'nomina' ? (
        <label className="mt-3 block">
          <span className="mb-1 block text-xs font-medium text-ink/70">Instrucciones de pago (las ve el afiliado)</span>
          <textarea value={instrucciones} onChange={(e) => setInstrucciones(e.target.value)} rows={4} placeholder={'Ej. Bancolombia, ahorros 123-456789-00 a nombre de [sindicato].\nO enlace de pago PSE: https://...'} className="w-full resize-y rounded-xl border border-ink/12 bg-canvas/45 px-3 py-2.5 text-sm leading-relaxed outline-none focus:border-night focus:ring-4 focus:ring-night/10" />
        </label>
      ) : (
        <p className="mt-3 rounded-lg bg-canvas/60 px-3 py-2 text-[11px] text-ink/55">Con <b>nómina</b>, el afiliado solo ve su estado de cuenta; no paga desde la app. La Tesorería registra los descuentos (concilia el reporte de la pagaduría) desde el módulo Financiero.</p>
      )}
      {estado ? <p className={`mt-2 text-xs ${estado.ok ? 'text-emerald-700' : 'text-brick'}`}>{estado.msg}</p> : null}
      <div className="mt-3 flex justify-end">
        <button onClick={guardar} disabled={busy} className="inline-flex items-center gap-1.5 rounded-xl bg-night px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-night-deep disabled:opacity-50">{busy ? 'Guardando…' : 'Guardar recaudo'}</button>
      </div>
    </section>
  )
}

// Editor del mensaje de bienvenida (correo al aprobar afiliación). Por sindicato.
function MensajeBienvenidaCard() {
  const { org, refreshProfile } = useAuth()
  const [texto, setTexto] = useState(org?.mensajeBienvenida ?? '')
  const [busy, setBusy] = useState(false)
  const [estado, setEstado] = useState<{ ok: boolean; msg: string } | null>(null)

  async function guardar() {
    setBusy(true); setEstado(null)
    const { error } = await supabase.rpc('set_mensaje_bienvenida', { p_texto: texto })
    setBusy(false)
    if (error) { setEstado({ ok: false, msg: error.message }); return }
    await refreshProfile()
    setEstado({ ok: true, msg: 'Mensaje guardado. Se usará en los próximos correos de bienvenida.' })
  }

  return (
    <section className="rounded-2xl border border-ink/[0.08] bg-white p-5">
      <h2 className="font-display text-base font-semibold">Mensaje de bienvenida</h2>
      <p className="mt-0.5 text-xs text-ink/50">
        Texto del correo que recibe el afiliado cuando la Junta aprueba su afiliación. Puedes usar{' '}
        <strong>{'{nombre}'}</strong>, <strong>{'{acta}'}</strong> y <strong>{'{sindicato}'}</strong>; se reemplazan al enviar.
        Separa párrafos con una línea en blanco.
      </p>
      <div className="mt-2">
        <button type="button" onClick={() => { setTexto(PLANTILLA_BIENVENIDA); setEstado(null) }} className="inline-flex items-center gap-1.5 rounded-lg border border-ink/12 px-3 py-1.5 text-xs font-semibold text-ink/70 transition hover:border-night hover:text-night">
          Cargar plantilla de ejemplo
        </button>
        <span className="ml-2 text-[11px] text-ink/45">Rellena un borrador editable; ajústalo a tu sindicato antes de guardar.</span>
      </div>
      <textarea
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        rows={12}
        placeholder={PLANTILLA_BIENVENIDA}
        className="mt-3 w-full resize-y rounded-xl border border-ink/12 bg-canvas/45 px-3 py-2.5 text-sm leading-relaxed outline-none focus:border-night focus:ring-4 focus:ring-night/10"
      />
      {estado ? <p className={`mt-2 text-xs ${estado.ok ? 'text-emerald-700' : 'text-brick'}`}>{estado.msg}</p> : null}
      <div className="mt-3 flex justify-end">
        <button onClick={guardar} disabled={busy} className="inline-flex items-center gap-1.5 rounded-xl bg-night px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-night-deep disabled:opacity-50">
          {busy ? 'Guardando…' : 'Guardar mensaje'}
        </button>
      </div>
    </section>
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
            <p className="text-xs text-ink/50">Porcentaje sobre la asignación básica mensual{cita('cuota')} · actual: {actual}%</p>
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
            <p className="text-xs text-ink/50">Base de los rangos de aprobación de gastos{cita('gasto_asamblea')} · actual: {formatCop(smmlv)}</p>
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
          <p className="text-xs text-ink/50">Garantía del manejo de fondos{cita('caucion')}{caucionVence ? ` · vence ${caucionVence}` : ' · sin registrar'}</p>
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
          <p className="text-xs text-ink/50">Elección por la Asamblea cada 2 años{cita('junta')}{proxima ? ` · próxima elección ${proxima}` : ''}</p>
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
