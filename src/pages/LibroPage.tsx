import React, { useMemo, useState } from 'react'
import { PaperclipIcon, ScrollTextIcon, SearchIcon, UsersIcon } from 'lucide-react'
import { SectionTitle } from '../components/SectionTitle'
import { useDemo } from '../store/DemoStore'
import { actoLabel } from '../store/governance'
import { abrirSoporte } from '../store/storageApi'

// Registro unificado del Libro: conceptos del Fiscal, resoluciones de afiliación
// (autogeneradas) y las actas de las sesiones publicadas.
type Registro = {
  id: string
  grupo: string        // para el filtro
  etiqueta: string     // lo que se muestra como tipo
  numero: string
  titulo: string
  fecha: string
  cuerpo: string
  referencia: string
  resultado?: string
  soportePath?: string
  asistentes?: number
}

const GRUPOS = ['Todos', 'Concepto del Fiscal', 'Resolución de afiliación', 'Actas de sesión'] as const

export function LibroPage() {
  const { actos, sessions } = useDemo()
  const [query, setQuery] = useState('')
  const [grupo, setGrupo] = useState<(typeof GRUPOS)[number]>('Todos')

  const registros = useMemo<Registro[]>(() => {
    const deActos: Registro[] = actos.map((a) => ({
      id: a.id,
      grupo: a.tipo,
      etiqueta: a.tipo,
      numero: a.numero,
      titulo: a.titulo,
      fecha: a.fecha,
      cuerpo: a.cuerpo,
      referencia: a.referencia,
      resultado: a.resultado,
      soportePath: a.soportePath,
    }))
    const deSesiones: Registro[] = sessions
      .filter((s) => s.status === 'Realizada' && s.minutes)
      .map((s) => ({
        id: `ses-${s.id}`,
        grupo: 'Actas de sesión',
        etiqueta: `${actoLabel(s.organ)} de sesión`,
        numero: '',
        titulo: s.title,
        fecha: `${s.day} ${s.month}`,
        cuerpo: s.minutes ?? '',
        referencia: s.organ,
        asistentes: s.asistentesLista?.length ?? s.asistentes,
      }))
    return [...deActos, ...deSesiones]
  }, [actos, sessions])

  const filtrados = useMemo(() => {
    const q = query.trim().toLowerCase()
    return registros.filter((r) => {
      const okGrupo = grupo === 'Todos' || r.grupo === grupo
      const okQuery = q === '' || `${r.titulo} ${r.numero} ${r.referencia} ${r.cuerpo}`.toLowerCase().includes(q)
      return okGrupo && okQuery
    })
  }, [registros, query, grupo])

  return (
    <div className="mx-auto max-w-[1440px]">
      <SectionTitle
        eyebrow="Memoria institucional"
        title="Libro de Actas y Resoluciones"
        description="Registro inmutable de conceptos, resoluciones y actas de la organización."
      />

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatChip label="Total registros" value={registros.length} />
        <StatChip label="Conceptos del Fiscal" value={registros.filter((r) => r.grupo === 'Concepto del Fiscal').length} />
        <StatChip label="Resoluciones" value={registros.filter((r) => r.grupo === 'Resolución de afiliación').length} />
        <StatChip label="Actas de sesión" value={registros.filter((r) => r.grupo === 'Actas de sesión').length} />
      </div>

      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <label className="relative max-w-md flex-1">
          <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/40" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por título, número, afiliado o contenido" className="w-full rounded-xl border border-ink/10 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-night focus:ring-4 focus:ring-night/10" />
        </label>
        <div className="flex flex-wrap gap-2">
          {GRUPOS.map((g) => (
            <button key={g} onClick={() => setGrupo(g)} className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${grupo === g ? 'bg-night text-white' : 'bg-canvas text-ink/60 hover:bg-ink/5'}`}>{g}</button>
          ))}
        </div>
      </div>

      {filtrados.length > 0 ? (
        <div className="space-y-3">
          {filtrados.map((r) => <RegistroCard key={r.id} registro={r} />)}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-ink/20 bg-white px-6 py-12 text-center text-sm text-ink/50">
          Aún no hay registros en el Libro. Los conceptos del Fiscal, las resoluciones de afiliación y las actas de sesión aparecerán aquí automáticamente.
        </div>
      )}
    </div>
  )
}

function RegistroCard({ registro: r }: { registro: Registro }) {
  const positivo = r.resultado === 'Positivo'
  const negativo = r.resultado === 'Negativo'
  return (
    <section className="rounded-2xl border border-ink/[0.08] bg-white p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-night/[0.06] text-night"><ScrollTextIcon className="h-4.5 w-4.5" /></div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-gold/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-[#8a5a12]">{r.etiqueta}</span>
              {r.numero ? <span className="font-mono text-[11px] text-ink/50">{r.numero}</span> : null}
            </div>
            <h3 className="mt-1 font-display text-base font-semibold text-ink">{r.titulo}</h3>
            {r.referencia ? <p className="text-xs text-ink/50">{r.referencia}</p> : null}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {positivo ? <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">Positivo</span> : null}
          {negativo ? <span className="rounded-md bg-brick/10 px-2 py-0.5 text-[10px] font-bold text-brick">Negativo</span> : null}
          {r.resultado && !positivo && !negativo ? <span className="rounded-md bg-night/[0.06] px-2 py-0.5 text-[10px] font-semibold text-night/70">{r.resultado}</span> : null}
        </div>
      </div>

      {r.cuerpo ? <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-ink/70">{r.cuerpo}</p> : null}

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink/45">
        {r.fecha ? <span>{r.fecha}</span> : null}
        {typeof r.asistentes === 'number' ? <span className="inline-flex items-center gap-1"><UsersIcon className="h-3.5 w-3.5" />{r.asistentes} asistente(s)</span> : null}
        {r.soportePath ? (
          <button onClick={() => abrirSoporte(r.soportePath!)} className="inline-flex items-center gap-1 font-semibold text-night transition hover:text-night-deep">
            <PaperclipIcon className="h-3.5 w-3.5" />Ver evidencia
          </button>
        ) : null}
      </div>
    </section>
  )
}

function StatChip({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-ink/[0.08] bg-white px-4 py-3">
      <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-ink/45">{label}</p>
      <p className="mt-1 font-display text-xl font-semibold tabular-nums text-ink">{value.toLocaleString('es-CO')}</p>
    </div>
  )
}
