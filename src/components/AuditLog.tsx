import React, { useEffect, useState } from 'react'
import { AlertCircleIcon, HistoryIcon, RefreshCwIcon, XIcon } from 'lucide-react'
import { supabase } from '../lib/supabase'

type AuditRow = {
  id: number
  table_name: string
  row_id: string | null
  row_label: string | null
  action: 'INSERT' | 'UPDATE' | 'DELETE'
  actor_role: string | null
  actor_name: string | null
  changed_at: string
}

// Etiquetas legibles para tablas y acciones.
const TABLE_LABEL: Record<string, string> = {
  affiliates: 'Afiliados', movements: 'Movimientos', aportes: 'Aportes', cases: 'Disciplinario',
  ballots: 'Votaciones', sessions: 'Sesiones', params: 'Parámetros', caja_gastos: 'Caja menor',
  comunicados: 'Comunicados', docs: 'Documental', committees: 'Comités',
}
const ACTION_LABEL: Record<string, string> = { INSERT: 'Creó', UPDATE: 'Modificó', DELETE: 'Eliminó' }
const ACTION_STYLE: Record<string, string> = {
  INSERT: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  UPDATE: 'bg-amber-50 text-amber-700 border-amber-200',
  DELETE: 'bg-red-50 text-brick border-brick/25',
}

export function AuditLog({ onClose }: { onClose: () => void }) {
  const [rows, setRows] = useState<AuditRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true); setError('')
    const { data, error } = await supabase
      .from('audit_log')
      .select('id, table_name, row_id, row_label, action, actor_role, actor_name, changed_at')
      .order('changed_at', { ascending: false })
      .limit(200)
    if (error) setError('No se pudo cargar la auditoría. ¿Ejecutaste audit_log.sql en Supabase?')
    else setRows((data as AuditRow[]) ?? [])
    setLoading(false)
  }

  useEffect(() => { void load() }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-night/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-2xl border border-ink/10 bg-white shadow-2xl shadow-night/20" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-ink/[0.08] px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-night/5 text-night"><HistoryIcon className="h-5 w-5" /></div>
            <div>
              <h3 className="font-display text-base font-semibold text-ink">Auditoría</h3>
              <p className="text-xs text-ink/50">Quién cambió qué y cuándo · últimos 200 registros</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={load} aria-label="Actualizar" className="rounded-lg p-2 text-ink/50 transition hover:bg-canvas hover:text-night"><RefreshCwIcon className="h-4 w-4" /></button>
            <button onClick={onClose} aria-label="Cerrar" className="rounded-lg p-2 text-ink/40 transition hover:bg-canvas hover:text-ink"><XIcon className="h-4 w-4" /></button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <p className="py-10 text-center text-sm text-ink/50">Cargando…</p>
          ) : error ? (
            <div className="flex items-start gap-2 rounded-xl border border-brick/25 bg-red-50 px-3 py-2.5 text-sm text-brick">
              <AlertCircleIcon className="mt-0.5 h-4 w-4 shrink-0" /><span>{error}</span>
            </div>
          ) : rows.length === 0 ? (
            <p className="py-10 text-center text-sm text-ink/50">Aún no hay movimientos registrados.</p>
          ) : (
            <ul className="space-y-1.5">
              {rows.map((r) => (
                <li key={r.id} className="flex items-center gap-3 rounded-xl border border-ink/[0.06] bg-canvas/40 px-3 py-2.5">
                  <span className={`shrink-0 rounded-lg border px-2 py-0.5 text-[11px] font-semibold ${ACTION_STYLE[r.action]}`}>{ACTION_LABEL[r.action]}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-ink">
                      <span className="font-medium">{TABLE_LABEL[r.table_name] ?? r.table_name}</span>
                      {r.row_label ? <span className="text-ink/45"> · {r.row_label}</span> : null}
                    </p>
                    <p className="truncate text-xs text-ink/50">
                      <span className="font-medium text-ink/70">{r.actor_name || roleName(r.actor_role)}</span>
                      {r.actor_name ? <span> · {roleName(r.actor_role)}</span> : null}
                      {' · '}{fmt(r.changed_at)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

function roleName(role: string | null): string {
  const map: Record<string, string> = {
    presidencia: 'Presidencia', vicepresidencia: 'Vicepresidencia', secretaria: 'Secretaría',
    tesoreria: 'Tesorería', fiscal: 'Fiscalía', afiliado: 'Afiliado', desconocido: 'Sistema',
  }
  return map[role ?? ''] ?? role ?? 'Sistema'
}

function fmt(iso: string): string {
  try {
    return new Date(iso).toLocaleString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  } catch { return iso }
}
