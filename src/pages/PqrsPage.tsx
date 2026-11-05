import React, { useEffect, useMemo, useState } from 'react'
import { AlarmClockIcon, CheckCircle2Icon, CopyIcon, InboxIcon, MailCheckIcon, MailXIcon, PlusIcon, RefreshCwIcon, SearchIcon, TriangleAlertIcon, XIcon } from 'lucide-react'
import { SectionTitle } from '../components/SectionTitle'
import { StatusBadge } from '../components/StatusBadge'
import { MetricCard } from '../components/MetricCard'
import { useConfirm } from '../components/ConfirmDialog'
import { useDemo } from '../store/DemoStore'
import { Role, roleLabel, roles, useSession } from '../store/session'
import { useAuth } from '../store/auth'
import { urlDeSindicato } from '../store/platform'
import { correoRespuestaPqrs, enviarCorreo } from '../store/emailApi'
import {
  CANALES_INTERNOS, CANAL_LABEL, ESTADO_LABEL, PLAZO_DIAS_HABILES, PqrsCanal, PqrsEstado, PqrsTipo, Semaforo, TIPOS, TIPO_LABEL,
  diasHabilesRestantes, estaAbierta, fmtFechaPqrs, semaforo, textoPlazo,
} from '../store/pqrs'
import { Pqrs, actualizarPqrs, fetchPqrs, marcarCorreoEnviado, registrarPqrs } from '../store/pqrsApi'

type Filtro = 'abiertas' | 'respondida' | 'archivada' | 'todas'
const FILTROS: Array<{ k: Filtro; label: string }> = [
  { k: 'abiertas', label: 'Abiertas' }, { k: 'respondida', label: 'Respondidas' }, { k: 'archivada', label: 'Archivadas' }, { k: 'todas', label: 'Todas' },
]

const estadoTone: Record<PqrsEstado, 'warning' | 'night' | 'positive' | 'neutral'> = {
  radicada: 'warning', en_tramite: 'night', respondida: 'positive', archivada: 'neutral',
}
const semaforoClase: Record<Semaforo, string> = {
  vencida: 'text-brick font-semibold', por_vencer: 'text-amber-700 font-semibold', a_tiempo: 'text-ink/60', cerrada: 'text-ink/40',
}

const inputClass = 'w-full rounded-xl border border-ink/12 bg-canvas/45 px-3 py-2.5 text-sm outline-none focus:border-night focus:ring-4 focus:ring-night/10'
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Cerrada con correo válido pero sin constancia de envío: hay que reenviar.
function correoPendiente(p: Pqrs): boolean {
  return !estaAbierta(p.estado) && EMAIL_RE.test(p.email) && !p.correoEnviadoAt
}

// Dirección pública del formulario de PQRS del sindicato.
function enlacePublico(slug: string | null, dominio: string | null): string {
  const base = urlDeSindicato(slug, dominio)
  return base.includes('/?') ? base.replace('/?', '/pqrs?') : `${base}/pqrs`
}

export function PqrsPage() {
  const { notify } = useDemo()
  const { can } = useSession()
  const { org } = useAuth()
  const canManage = can('pqrs.manage')
  const [list, setList] = useState<Pqrs[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [filtro, setFiltro] = useState<Filtro>('abiertas')
  const [tipo, setTipo] = useState<'' | PqrsTipo>('')
  const [query, setQuery] = useState('')
  const [abierta, setAbierta] = useState<string | null>(null)
  const [registrando, setRegistrando] = useState(false)

  async function load() {
    setLoading(true)
    try { setList(await fetchPqrs()); setError(false) } catch { setError(true) } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const hoy = useMemo(() => new Date(), [list])
  const kpis = useMemo(() => {
    const abiertas = list.filter((p) => estaAbierta(p.estado))
    const sem = abiertas.map((p) => semaforo(p.estado, p.venceAt, hoy))
    return {
      abiertas: abiertas.length,
      porVencer: sem.filter((s) => s === 'por_vencer').length,
      vencidas: sem.filter((s) => s === 'vencida').length,
      respondidas: list.filter((p) => p.estado === 'respondida').length,
    }
  }, [list, hoy])

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return list
      .filter((p) => (filtro === 'todas' ? true : filtro === 'abiertas' ? estaAbierta(p.estado) : p.estado === filtro))
      .filter((p) => tipo === '' || p.tipo === tipo)
      .filter((p) => q === '' || `${p.radicado} ${p.nombre} ${p.asunto} ${p.documento} ${p.email}`.toLowerCase().includes(q))
      // Abiertas: primero las que vencen antes. El resto: más recientes primero.
      .sort((a, b) => (filtro === 'abiertas' ? (a.venceAt ?? '').localeCompare(b.venceAt ?? '') : b.createdAt.localeCompare(a.createdAt)))
  }, [list, filtro, tipo, query])

  const seleccionada = list.find((p) => p.id === abierta) ?? null
  const enlace = org ? enlacePublico(org.slug, org.dominio) : ''

  function copiarEnlace() {
    try { navigator.clipboard.writeText(enlace); notify('Enlace del formulario público copiado.', 'success') } catch { notify(enlace, 'info') }
  }
  function reemplazar(p: Pqrs) { setList((l) => l.map((x) => (x.id === p.id ? p : x))) }

  return (
    <div className="mx-auto max-w-[1440px]">
      <SectionTitle
        eyebrow="Atención · afiliados y ciudadanos"
        title="PQRS"
        description={`Peticiones, quejas, reclamos y sugerencias. Plazo de respuesta: ${PLAZO_DIAS_HABILES} días hábiles (Ley 1755 de 2015).`}
        action={(
          <div className="flex flex-wrap gap-2">
            <button onClick={load} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-ink/12 bg-white px-4 py-2.5 text-sm font-semibold text-ink/70 transition hover:border-night hover:text-night disabled:opacity-50"><RefreshCwIcon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Actualizar</button>
            {enlace ? <button onClick={copiarEnlace} className="inline-flex items-center gap-2 rounded-xl border border-ink/12 bg-white px-4 py-2.5 text-sm font-semibold text-ink/70 transition hover:border-night hover:text-night"><CopyIcon className="h-4 w-4" />Copiar enlace público</button> : null}
            {canManage ? <button onClick={() => setRegistrando(true)} className="inline-flex items-center gap-2 rounded-xl bg-night px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-night/15 transition hover:bg-night-deep"><PlusIcon className="h-4 w-4" />Registrar PQRS</button> : null}
          </div>
        )}
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Abiertas" value={String(kpis.abiertas)} detail="Radicadas o en trámite" icon={InboxIcon} tone="night" />
        <MetricCard label="Por vencer" value={String(kpis.porVencer)} detail="3 días hábiles o menos" icon={AlarmClockIcon} tone="gold" />
        <MetricCard label="Vencidas" value={String(kpis.vencidas)} detail="Fuera del plazo legal" icon={TriangleAlertIcon} tone="brick" />
        <MetricCard label="Respondidas" value={String(kpis.respondidas)} detail="Con respuesta registrada" icon={CheckCircle2Icon} tone="green" />
      </div>

      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row">
          <label className="relative max-w-md flex-1">
            <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/40" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por radicado, nombre, asunto o correo" className="w-full rounded-xl border border-ink/10 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-night focus:ring-4 focus:ring-night/10" />
          </label>
          <select value={tipo} onChange={(e) => setTipo(e.target.value as '' | PqrsTipo)} className="rounded-xl border border-ink/10 bg-white px-3 py-2.5 text-sm outline-none focus:border-night">
            <option value="">Todos los tipos</option>
            {TIPOS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div className="flex flex-wrap gap-2">
          {FILTROS.map((f) => <button key={f.k} onClick={() => setFiltro(f.k)} className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${filtro === f.k ? 'bg-night text-white' : 'bg-canvas text-ink/60 hover:bg-ink/5'}`}>{f.label}</button>)}
        </div>
      </div>

      {!canManage ? (
        <div className="mb-5 rounded-xl border border-gold/30 bg-gold/[0.08] px-4 py-3 text-sm text-ink/70">La gestión de PQRS está a cargo de Secretaría y Presidencia. Puedes responder las que te asignen; las demás las ves en modo consulta.</div>
      ) : null}

      {loading && list.length === 0 ? (
        <div className="rounded-2xl border border-ink/[0.08] bg-white p-8 text-center text-sm text-ink/50">Cargando…</div>
      ) : error ? (
        <div className="rounded-2xl border border-ink/[0.08] bg-white p-8 text-center text-sm text-ink/60">No se pudieron cargar las PQRS. Revisa tu conexión; si el módulo es nuevo, verifica que estén ejecutados <code className="rounded bg-canvas px-1">saas_stage29_pqrs.sql</code> y <code className="rounded bg-canvas px-1">saas_stage30_pqrs_ajustes.sql</code> en Supabase.</div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-ink/20 bg-white px-6 py-12 text-center text-sm text-ink/50">
          {list.length === 0 ? 'Aún no hay PQRS. Llegan desde la página web, el portal del afiliado o las que registres aquí.' : 'No hay PQRS con estos filtros.'}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-ink/[0.08] bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b border-ink/[0.07] bg-canvas/60 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink/45">
                <tr>
                  <th className="px-4 py-3">Radicado</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Asunto</th>
                  <th className="px-4 py-3">Solicitante</th>
                  <th className="px-4 py-3">Radicada</th>
                  <th className="px-4 py-3">Plazo</th>
                  <th className="px-4 py-3">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/[0.06]">
                {rows.map((p) => {
                  const sem = semaforo(p.estado, p.venceAt, hoy)
                  return (
                    <tr key={p.id} onClick={() => setAbierta(p.id)} className="cursor-pointer transition hover:bg-canvas/50">
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs font-semibold text-night">{p.radicado}</td>
                      <td className="px-4 py-3 text-ink/70">{TIPO_LABEL[p.tipo]}</td>
                      <td className="max-w-[280px] px-4 py-3"><span className="line-clamp-1 font-medium text-ink">{p.asunto}</span></td>
                      <td className="px-4 py-3"><span className="block text-ink/80">{p.nombre}</span><span className="block text-[11px] text-ink/45">{CANAL_LABEL[p.canal]}</span></td>
                      <td className="whitespace-nowrap px-4 py-3 text-ink/60">{fmtFechaPqrs(p.createdAt)}</td>
                      <td className={`whitespace-nowrap px-4 py-3 text-xs ${semaforoClase[sem]}`}>{sem === 'cerrada' ? '—' : textoPlazo(p.venceAt ? diasHabilesRestantes(p.venceAt, hoy) : null)}</td>
                      <td className="px-4 py-3">
                        <StatusBadge tone={estadoTone[p.estado]}>{ESTADO_LABEL[p.estado]}</StatusBadge>
                        {correoPendiente(p) ? <span className="mt-1 block text-[11px] font-semibold text-amber-700">Correo sin enviar</span> : null}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {seleccionada ? <DetalleModal key={seleccionada.id} pqrs={seleccionada} onClose={() => setAbierta(null)} onChange={reemplazar} /> : null}
      {registrando ? <RegistrarModal onClose={() => setRegistrando(false)} onSaved={(p) => { setRegistrando(false); setList((l) => [p, ...l]); setAbierta(p.id) }} /> : null}
    </div>
  )
}

function DetalleModal({ pqrs: p, onClose, onChange }: { pqrs: Pqrs; onClose: () => void; onChange: (p: Pqrs) => void }) {
  const { notify } = useDemo()
  const { can, role } = useSession()
  const confirmar = useConfirm()
  const canManage = can('pqrs.manage')
  const canEdit = canManage || role === p.responsable
  const abierta = estaAbierta(p.estado)
  const emailValido = EMAIL_RE.test(p.email)
  const [respuesta, setRespuesta] = useState(p.respuesta)
  const [enviarPorCorreo, setEnviarPorCorreo] = useState(emailValido)
  const [guardando, setGuardando] = useState(false)
  const restantes = p.venceAt ? diasHabilesRestantes(p.venceAt) : null
  const sem = semaforo(p.estado, p.venceAt)
  const texto = respuesta.trim()
  const sinGuardar = abierta && canEdit && texto !== p.respuesta.trim()

  async function cambiar(cambio: Parameters<typeof actualizarPqrs>[1], aviso: string) {
    setGuardando(true)
    try { onChange(await actualizarPqrs(p.id, cambio)); notify(aviso, 'success') } catch (e) { notify(e instanceof Error ? e.message : 'No se pudo actualizar.', 'warning') } finally { setGuardando(false) }
  }

  async function cerrarModal() {
    if (sinGuardar && !(await confirmar({ title: 'Respuesta sin guardar', message: 'Escribiste una respuesta que no está guardada. ¿Cerrar y descartar los cambios?', confirmText: 'Descartar', tone: 'peligro' }))) return
    onClose()
  }

  // Envía el correo con la respuesta (o el motivo del archivo) y deja constancia en la BD.
  async function enviarYRegistrar(q: Pqrs): Promise<boolean> {
    const asunto = q.estado === 'archivada' ? `Tu PQRS ${q.radicado} fue archivada` : `Respuesta a tu PQRS ${q.radicado}`
    const ok = await enviarCorreo({ to: q.email, subject: asunto, html: correoRespuestaPqrs(q.nombre, q.radicado, q.asunto, q.respuesta) })
    if (!ok) return false
    try { onChange(await marcarCorreoEnviado(q.id)) } catch { notify('El correo salió, pero no se pudo registrar el envío.', 'warning') }
    return true
  }

  async function cerrar(estado: 'respondida' | 'archivada') {
    if (!texto) return
    const correo = enviarPorCorreo && emailValido
    const accion = estado === 'respondida' ? 'Responder' : 'Archivar'
    const mensaje = estado === 'respondida'
      ? (correo ? `Se marcará como respondida y se enviará la respuesta a ${p.email}.` : 'Se marcará como respondida. La respuesta NO se enviará por correo.')
      : `Se archivará sin trámite con el motivo escrito${correo ? `, que se enviará a ${p.email}` : ''}. Úsalo solo para duplicados, mensajes que no son una PQRS o asuntos que no le competen al sindicato.`
    if (!(await confirmar({ title: `${accion} PQRS`, message: mensaje, confirmText: accion, tone: estado === 'archivada' ? 'peligro' : 'normal' }))) return
    setGuardando(true)
    try {
      const cerrada = await actualizarPqrs(p.id, { estado, respuesta: texto })
      onChange(cerrada)
      const hecho = estado === 'respondida' ? 'Respuesta registrada' : 'PQRS archivada'
      if (correo) {
        const ok = await enviarYRegistrar(cerrada)
        notify(ok ? `${hecho} y enviada a ${p.email}.` : `${hecho}, pero el correo no salió. Usa "Reenviar correo" o comunícate por otro medio.`, ok ? 'success' : 'warning')
      } else {
        notify(`${hecho}.`, 'success')
      }
    } catch (e) {
      notify(e instanceof Error ? e.message : 'No se pudo cerrar la PQRS.', 'warning')
    } finally { setGuardando(false) }
  }

  async function reenviar() {
    setGuardando(true)
    try {
      const ok = await enviarYRegistrar(p)
      notify(ok ? `Correo enviado a ${p.email}.` : 'El correo no se pudo enviar. Intenta más tarde o comunícate por otro medio.', ok ? 'success' : 'warning')
    } finally { setGuardando(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-night/45 p-4" onClick={cerrarModal}>
      <section role="dialog" aria-modal="true" aria-label={`PQRS ${p.radicado}`} onClick={(e) => e.stopPropagation()} className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="font-mono text-xs font-semibold text-gold">{p.radicado}</p>
            <h2 className="mt-1 font-display text-xl font-semibold text-ink">{p.asunto}</h2>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-night/[0.06] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-night/70">{TIPO_LABEL[p.tipo]}</span>
              <StatusBadge tone={estadoTone[p.estado]}>{ESTADO_LABEL[p.estado]}</StatusBadge>
              {abierta ? <span className={`text-xs ${semaforoClase[sem]}`}>{textoPlazo(restantes)}</span> : null}
            </div>
          </div>
          <button onClick={cerrarModal} className="rounded-lg p-2 text-ink/50 hover:bg-canvas" aria-label="Cerrar"><XIcon className="h-5 w-5" /></button>
        </div>

        <dl className="grid gap-x-6 gap-y-3 rounded-xl bg-canvas/60 p-4 text-sm sm:grid-cols-3">
          <Dato label="Solicitante" value={p.nombre} />
          <Dato label="Documento" value={p.documento || '—'} />
          <Dato label="Afiliado" value={p.affiliateId ? 'Sí' : 'No / sin vincular'} />
          <Dato label="Correo" value={p.email || '—'} />
          <Dato label="Teléfono" value={p.telefono || '—'} />
          <Dato label="Canal" value={CANAL_LABEL[p.canal]} />
          <Dato label="Radicada" value={fmtFechaPqrs(p.createdAt)} />
          <Dato label="Vence" value={fmtFechaPqrs(p.venceAt)} />
          <Dato label="Responsable" value={roleLabel[p.responsable]} />
        </dl>

        <div className="mt-5">
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-ink/45">Descripción</p>
          <p className="whitespace-pre-line rounded-xl border border-ink/[0.08] p-4 text-sm leading-relaxed text-ink/80">{p.descripcion}</p>
        </div>

        {p.tipo === 'queja' && abierta ? (
          <p className="mt-3 rounded-xl border border-gold/25 bg-gold/[0.07] px-3 py-2.5 text-xs text-ink/65">Si la queja es contra un afiliado y amerita proceso, ábrelo en el módulo <strong>Disciplinario</strong> y registra aquí la respuesta al solicitante.</p>
        ) : null}

        {canManage && abierta ? (
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-ink/70">Asignar a</span>
              <select value={p.responsable} disabled={guardando} onChange={(e) => cambiar({ responsable: e.target.value as Role }, `Asignada a ${roleLabel[e.target.value as Role]}.`)} className={inputClass}>
                {roles.map((r) => <option key={r} value={r}>{roleLabel[r]}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-ink/70">Tipo (reclasificar)</span>
              <select value={p.tipo} disabled={guardando} onChange={(e) => cambiar({ tipo: e.target.value as PqrsTipo }, 'Tipo actualizado.')} className={inputClass}>
                {TIPOS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </label>
          </div>
        ) : null}

        {!abierta ? (
          <div className={`mt-5 rounded-xl border p-4 ${p.estado === 'respondida' ? 'border-emerald-600/20 bg-emerald-50/60' : 'border-ink/10 bg-canvas/60'}`}>
            <p className={`mb-1.5 text-xs font-semibold uppercase tracking-[0.08em] ${p.estado === 'respondida' ? 'text-emerald-800/70' : 'text-ink/50'}`}>
              {p.estado === 'respondida' ? 'Respuesta' : 'Motivo del archivo'} · {fmtFechaPqrs(p.respondidaAt)}{p.respondidaPor ? ` · ${p.respondidaPor}` : ''}
            </p>
            <p className="whitespace-pre-line text-sm leading-relaxed text-ink/80">{p.respuesta || 'Sin texto registrado.'}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-ink/[0.07] pt-3 text-xs">
              {!emailValido ? (
                <span className="text-ink/50">Sin correo válido: la respuesta se comunica por otro medio.</span>
              ) : p.correoEnviadoAt ? (
                <span className="inline-flex items-center gap-1.5 text-emerald-700"><MailCheckIcon className="h-3.5 w-3.5" />Correo enviado a {p.email} el {fmtFechaPqrs(p.correoEnviadoAt)}</span>
              ) : (
                <span className="inline-flex items-center gap-1.5 font-semibold text-amber-700"><MailXIcon className="h-3.5 w-3.5" />El correo no se ha enviado a {p.email}</span>
              )}
              {emailValido && canEdit && p.respuesta ? (
                <button onClick={reenviar} disabled={guardando} className="ml-auto rounded-lg border border-ink/12 px-2.5 py-1.5 font-semibold text-ink/65 transition hover:border-night hover:text-night disabled:opacity-40">{p.correoEnviadoAt ? 'Reenviar correo' : 'Enviar correo'}</button>
              ) : null}
            </div>
          </div>
        ) : null}

        {canEdit && abierta ? (
          <div className="mt-5">
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-ink/70">Respuesta al solicitante{canManage ? ' (o motivo, si vas a archivar)' : ''}</span>
              <textarea value={respuesta} onChange={(e) => setRespuesta(e.target.value)} rows={6} maxLength={10000} placeholder="Escribe la respuesta. Deja una línea en blanco para separar párrafos. Puedes guardarla como borrador y terminarla después." className={`${inputClass} resize-y`} />
            </label>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
              <label className={`flex items-center gap-2 text-sm ${emailValido ? 'text-ink/75' : 'text-ink/40'}`}>
                <input type="checkbox" checked={enviarPorCorreo} disabled={!emailValido} onChange={(e) => setEnviarPorCorreo(e.target.checked)} className="h-4 w-4 accent-night" />
                {emailValido ? <>Enviar por correo a <strong>{p.email}</strong></> : 'Sin correo válido: comunica la respuesta por otro medio'}
              </label>
              {sinGuardar ? <span className="text-xs font-semibold text-amber-700">Cambios sin guardar</span> : p.respuesta ? <span className="text-xs text-ink/45">Borrador guardado</span> : null}
            </div>
          </div>
        ) : null}

        <div className="mt-6 flex flex-wrap justify-end gap-2 border-t border-ink/[0.07] pt-4">
          {canManage && abierta ? <button onClick={() => cerrar('archivada')} disabled={guardando || !texto} title={texto ? '' : 'Escribe el motivo en el recuadro de respuesta'} className="mr-auto rounded-xl px-4 py-2.5 text-sm font-semibold text-ink/50 transition hover:bg-brick/10 hover:text-brick disabled:opacity-40">Archivar</button> : null}
          {canManage && !abierta ? <button onClick={() => cambiar({ estado: 'en_tramite' }, 'PQRS reabierta.')} disabled={guardando} className="mr-auto rounded-xl border border-ink/12 px-4 py-2.5 text-sm font-semibold text-ink/60 transition hover:bg-canvas disabled:opacity-40">Reabrir</button> : null}
          <button onClick={cerrarModal} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-ink/60 hover:bg-canvas">Cerrar</button>
          {canEdit && p.estado === 'radicada' ? <button onClick={() => cambiar({ estado: 'en_tramite' }, 'PQRS en trámite.')} disabled={guardando} className="rounded-xl border border-night/20 px-4 py-2.5 text-sm font-semibold text-night transition hover:bg-night/5 disabled:opacity-40">Pasar a trámite</button> : null}
          {sinGuardar ? <button onClick={() => cambiar({ respuesta: texto }, 'Borrador guardado.')} disabled={guardando} className="rounded-xl border border-night/20 px-4 py-2.5 text-sm font-semibold text-night transition hover:bg-night/5 disabled:opacity-40">Guardar borrador</button> : null}
          {canEdit && abierta ? <button onClick={() => cerrar('respondida')} disabled={guardando || !texto} className="rounded-xl bg-night px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-night-deep disabled:opacity-40">{guardando ? 'Guardando…' : 'Responder'}</button> : null}
        </div>
      </section>
    </div>
  )
}

function Dato({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink/40">{label}</dt>
      <dd className="break-words font-medium text-ink/85">{value}</dd>
    </div>
  )
}

function RegistrarModal({ onClose, onSaved }: { onClose: () => void; onSaved: (p: Pqrs) => void }) {
  const { notify } = useDemo()
  const [form, setForm] = useState({ tipo: 'peticion' as PqrsTipo, canal: 'presencial' as PqrsCanal, nombre: '', documento: '', email: '', telefono: '', asunto: '', descripcion: '' })
  const [guardando, setGuardando] = useState(false)
  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) { setForm((f) => ({ ...f, [k]: v })) }
  const emailInvalido = form.email.trim() !== '' && !EMAIL_RE.test(form.email.trim())
  const valido = form.nombre.trim() && form.asunto.trim() && form.descripcion.trim() && !emailInvalido

  async function guardar() {
    if (!valido || guardando) return
    setGuardando(true)
    try {
      const p = await registrarPqrs(form)
      notify(`PQRS radicada con el número ${p.radicado}.`, 'success')
      onSaved(p)
    } catch (e) {
      notify(e instanceof Error ? e.message : 'No se pudo registrar la PQRS.', 'warning')
    } finally { setGuardando(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-night/45 p-4">
      <section role="dialog" aria-modal="true" className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-start justify-between">
          <div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-gold">PQRS</p><h2 className="mt-1 font-display text-xl font-semibold">Registrar PQRS recibida por otro medio</h2></div>
          <button onClick={onClose} className="rounded-lg p-2 text-ink/50 hover:bg-canvas" aria-label="Cerrar"><XIcon className="h-5 w-5" /></button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-ink/70">Tipo</span>
            <select value={form.tipo} onChange={(e) => set('tipo', e.target.value as PqrsTipo)} className={inputClass}>
              {TIPOS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-ink/70">Recibida por</span>
            <select value={form.canal} onChange={(e) => set('canal', e.target.value as PqrsCanal)} className={inputClass}>
              {CANALES_INTERNOS.map((c) => <option key={c} value={c}>{CANAL_LABEL[c]}</option>)}
            </select>
          </label>
          <Campo label="Nombre del solicitante" required value={form.nombre} onChange={(v) => set('nombre', v)} />
          <Campo label="Documento" value={form.documento} onChange={(v) => set('documento', v)} />
          <Campo label="Correo (para enviar la respuesta)" value={form.email} onChange={(v) => set('email', v)} error={emailInvalido ? 'Correo no válido.' : ''} />
          <Campo label="Teléfono" value={form.telefono} onChange={(v) => set('telefono', v)} />
          <div className="sm:col-span-2"><Campo label="Asunto" required value={form.asunto} onChange={(v) => set('asunto', v)} /></div>
          <label className="block sm:col-span-2">
            <span className="mb-1.5 block text-xs font-semibold text-ink/70">Descripción <span className="text-brick">*</span></span>
            <textarea value={form.descripcion} onChange={(e) => set('descripcion', e.target.value)} rows={5} maxLength={5000} className={`${inputClass} resize-y`} />
          </label>
        </div>
        <p className="mt-3 text-xs text-ink/50">El número de radicado y la fecha de vencimiento ({PLAZO_DIAS_HABILES} días hábiles) se asignan automáticamente.</p>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-ink/60 hover:bg-canvas">Cancelar</button>
          <button onClick={guardar} disabled={!valido || guardando} className="rounded-xl bg-night px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-night-deep disabled:opacity-40">{guardando ? 'Radicando…' : 'Radicar'}</button>
        </div>
      </section>
    </div>
  )
}

function Campo({ label, value, onChange, required, error }: { label: string; value: string; onChange: (v: string) => void; required?: boolean; error?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-ink/70">{label}{required ? <span className="text-brick"> *</span> : null}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} className={inputClass} />
      {error ? <span className="mt-1 block text-xs text-brick">{error}</span> : null}
    </label>
  )
}
