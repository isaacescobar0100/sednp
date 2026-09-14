import React, { useEffect, useRef, useState } from 'react'
import { AlertCircleIcon, BanknoteIcon, Building2Icon, CalendarClockIcon, CheckCircle2Icon, CopyIcon, DownloadIcon, ImageIcon, KeyRoundIcon, LayoutDashboardIcon, LogOutIcon, PencilIcon, PlusIcon, Trash2Icon, UsersIcon, WalletIcon, XIcon } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { subirFoto } from '../store/storageApi'
import { useAuth } from '../store/auth'
import { esHostPlataforma } from '../store/platform'
import { enviarCorreoDetallado, plantillaCorreo, setMarca } from '../store/emailApi'

type OrgRow = {
  id: string; nombre: string; slug: string; logo_url: string | null; activo: boolean
  dominio: string | null; correo_remitente: string | null
  plan: PlanKey; precio_anual: number; fecha_proximo_pago: string | null; afiliados_max: number | null; notas_cobro: string | null
  contacto_nombre: string | null; contacto_telefono: string | null
}
type Pago = { id: string; monto: number; periodo: string | null; metodo: string | null; fecha_pago: string; vence_nuevo: string | null; nota: string | null }
type Conteo = { afiliados: number; activos: number }
type View = 'resumen' | 'sindicatos' | 'nuevo'
// Sección activa según la URL. Acepta rutas con o sin prefijo /admin
// (/sindicatos en el host de plataforma; /admin/sindicatos en otros dominios).
function viewFromPath(pathname: string): View {
  const seg = pathname.replace(/^\/admin\/?/, '').replace(/^\//, '').split('/')[0]
  if (seg === 'sindicatos') return 'sindicatos'
  if (seg === 'nuevo') return 'nuevo'
  return 'resumen'
}

// Planes del tarifario: límite de afiliados y precio anual recurrente sugerido
// (infraestructura + soporte, "años siguientes"). Editable por sindicato.
type PlanKey = 'basico' | 'profesional' | 'empresarial' | 'corporativo'
const PLANES: Record<PlanKey, { label: string; max: number | null; precio: number }> = {
  basico:      { label: 'Básico',      max: 100,  precio: 4800000 },
  profesional: { label: 'Profesional', max: 300,  precio: 8500000 },
  empresarial: { label: 'Empresarial', max: 800,  precio: 14800000 },
  corporativo: { label: 'Corporativo', max: null, precio: 22800000 },
}

const COP = (n: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n || 0)

// Estado de cobro DERIVADO de la fecha de próximo pago (no se almacena).
type EstadoPago = 'sin' | 'al_dia' | 'por_vencer' | 'vencido'
function estadoPago(fecha: string | null): EstadoPago {
  if (!fecha) return 'sin'
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0)
  const f = new Date(fecha + 'T00:00:00')
  const dias = Math.round((f.getTime() - hoy.getTime()) / 86400000)
  if (dias < 0) return 'vencido'
  if (dias <= 30) return 'por_vencer'
  return 'al_dia'
}
const ESTADO_UI: Record<EstadoPago, { label: string; cls: string }> = {
  sin:       { label: 'Sin fecha',  cls: 'bg-ink/5 text-ink/50' },
  al_dia:    { label: 'Al día',     cls: 'bg-emerald-100 text-emerald-700' },
  por_vencer:{ label: 'Por vencer', cls: 'bg-amber-100 text-amber-700' },
  vencido:   { label: 'Vencido',    cls: 'bg-brick/10 text-brick' },
}

// ---------------------------------------------------------------------------
// Contenido reutilizable: dar de alta sindicatos y gestionar su marca.
// ---------------------------------------------------------------------------
function SuperAdminContent() {
  const { signOut } = useAuth()
  // Rutas por sección. En el host de plataforma quedan limpias (/resumen…);
  // en otros dominios van bajo /admin (/admin/resumen…) para poder recargar.
  const RUTA_BASE = esHostPlataforma() ? '' : '/admin'
  const PATHS: Record<View, string> = {
    resumen: `${RUTA_BASE}/resumen`, sindicatos: `${RUTA_BASE}/sindicatos`, nuevo: `${RUTA_BASE}/nuevo`,
  }
  const [view, setView] = useState<View>(() => viewFromPath(window.location.pathname))
  const irA = (v: View) => { window.history.pushState({}, '', PATHS[v]); setView(v) }
  // Sincroniza con el botón atrás/adelante del navegador.
  useEffect(() => {
    const onPop = () => setView(viewFromPath(window.location.pathname))
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])
  // Normaliza la entrada (/, /admin, /ingresar) a /resumen.
  useEffect(() => {
    const p = window.location.pathname
    if (p === '/' || p === '/admin' || p === '/admin/' || p === '/ingresar') window.history.replaceState({}, '', PATHS.resumen)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const [orgs, setOrgs] = useState<OrgRow[]>([])
  const [conteos, setConteos] = useState<Record<string, Conteo>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')

  const [nombre, setNombre] = useState('')
  const [slug, setSlug] = useState('')
  const [presiEmail, setPresiEmail] = useState('')
  const [presiPassword, setPresiPassword] = useState('')
  const [presiNombre, setPresiNombre] = useState('')
  const [dominio, setDominio] = useState('')
  const [plan, setPlan] = useState<PlanKey>('basico')
  const [busy, setBusy] = useState(false)
  const [creado, setCreado] = useState<null | { nombre: string; slug: string; dominio: string; email: string; password: string; presi: string }>(null)
  const [avisoCorreo, setAvisoCorreo] = useState('')

  async function load() {
    setLoading(true)
    const [orgsRes, resumenRes] = await Promise.all([
      supabase.from('organizations').select('id, nombre, slug, logo_url, activo, dominio, correo_remitente, plan, precio_anual, fecha_proximo_pago, afiliados_max, notas_cobro, contacto_nombre, contacto_telefono').order('created_at'),
      supabase.rpc('resumen_plataforma'),
    ])
    if (orgsRes.error) setError('No se pudieron cargar los sindicatos.')
    else setOrgs((orgsRes.data as OrgRow[]) ?? [])
    const mapa: Record<string, Conteo> = {}
    for (const r of (resumenRes.data as { org_id: string; afiliados: number; afiliados_activos: number }[]) ?? []) {
      mapa[r.org_id] = { afiliados: Number(r.afiliados) || 0, activos: Number(r.afiliados_activos) || 0 }
    }
    setConteos(mapa)
    setLoading(false)
  }
  useEffect(() => { void load() }, [])

  async function crear(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setOk(''); setBusy(true)
    const s = slug.trim().toLowerCase().replace(/\s+/g, '-')
    const { error } = await supabase.rpc('crear_sindicato', {
      p_nombre: nombre.trim(),
      p_slug: s,
      p_presi_email: presiEmail.trim().toLowerCase(),
      p_presi_password: presiPassword,
      p_presi_nombre: presiNombre.trim(),
    })
    if (error) {
      setError(error.message)
    } else {
      // Se asigna dominio (si se indicó) y la suscripción inicial según el plan.
      const dom = dominio.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '')
      const p = PLANES[plan]
      const proximo = new Date(); proximo.setFullYear(proximo.getFullYear() + 1)
      await supabase.from('organizations').update({
        dominio: dom || null,
        plan,
        precio_anual: p.precio,
        afiliados_max: p.max,
        fecha_proximo_pago: proximo.toISOString().slice(0, 10),
      }).eq('slug', s)
      // Guardamos los datos (incl. contraseña) para la tarjeta de credenciales,
      // ANTES de limpiar el formulario. La contraseña solo se conoce ahora.
      const cred = { nombre: nombre.trim(), slug: s, dominio: dom, email: presiEmail.trim().toLowerCase(), password: presiPassword, presi: presiNombre.trim() }
      setCreado(cred)
      setNombre(''); setSlug(''); setPresiEmail(''); setPresiPassword(''); setPresiNombre(''); setDominio(''); setPlan('basico')
      void load()
      // Correo automático al presidente con sus accesos + bienvenida (mismo
      // camino que el correo de afiliación, que sí entra a Principal).
      void enviarCredenciales(cred)
    }
    setBusy(false)
  }

  // Envía al presidente sus datos de acceso y un mensaje de bienvenida.
  async function enviarCredenciales(cr: NonNullable<typeof creado>) {
    setAvisoCorreo('Enviando accesos por correo…')
    const web = cr.dominio ? `https://${cr.dominio}` : `${window.location.origin}/?org=${cr.slug}`
    const login = cr.dominio ? `https://${cr.dominio}/ingresar` : `${window.location.origin}/ingresar`
    const dato = (k: string, v: string) => `<tr><td style="padding:7px 12px;background:#f4f6fb;border:1px solid #e4e6ec;color:#5b6577;font-size:13px;width:130px">${k}</td><td style="padding:7px 12px;border:1px solid #e4e6ec;font-size:13px"><strong>${v}</strong></td></tr>`
    const cuerpo = `
      <p style="margin:0 0 10px">Hola <strong>${cr.presi}</strong>,</p>
      <p style="margin:0 0 12px">El sindicato <strong>${cr.nombre}</strong> ya está activo en la plataforma. Estos son los accesos de la presidencia:</p>
      <table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%;margin:0 0 14px">
        ${dato('Página web', `<a href="${web}" style="color:#2456e6">${web}</a>`)}
        ${dato('Ingresar', `<a href="${login}" style="color:#2456e6">${login}</a>`)}
        ${dato('Usuario (correo)', cr.email)}
        ${dato('Contraseña', cr.password)}
      </table>
      <p style="margin:0 0 10px;color:#5b6577;font-size:13px">Por seguridad, te recomendamos cambiar la contraseña al ingresar por primera vez.</p>
      <p style="margin:0 0 10px">Desde el sistema podrás gestionar afiliados, finanzas, gobernanza, comunicados y tu página web, todo en un solo lugar.</p>
      <p style="margin:16px 0 0;color:#5b6577;font-size:13px">Equipo de Sindika</p>`
    // La marca del correo (remitente y encabezado) es la del NUEVO sindicato.
    setMarca(cr.nombre, null, null)
    const r = await enviarCorreoDetallado({ to: cr.email, subject: `Tus accesos a ${cr.nombre}`, html: plantillaCorreo(`¡Bienvenido a ${cr.nombre}!`, cuerpo) })
    setAvisoCorreo(r.ok ? `Accesos enviados por correo a ${cr.email}.` : `No se pudo enviar el correo (${r.error || 'error'}). Entrega las credenciales manualmente.`)
  }

  // KPIs de plataforma (dashboard de negocio).
  const totalAfiliados = Object.values(conteos).reduce((a, c) => a + c.afiliados, 0)
  const activos = orgs.filter((o) => o.activo).length
  const suspendidos = orgs.length - activos
  const arr = orgs.filter((o) => o.activo).reduce((a, o) => a + (o.precio_anual || 0), 0)
  const porCobrar = orgs.filter((o) => o.activo && ['por_vencer', 'vencido'].includes(estadoPago(o.fecha_proximo_pago))).length

  const webUrl = creado ? (creado.dominio ? `https://${creado.dominio}` : `${window.location.origin}/?org=${creado.slug}`) : ''
  const loginUrl = creado ? (creado.dominio ? `https://${creado.dominio}/ingresar` : `${window.location.origin}/ingresar`) : ''

  async function descargarCredenciales(cr: NonNullable<typeof creado>) {
    const canvas = document.createElement('canvas')
    canvas.width = 1000; canvas.height = 680
    const ctx = canvas.getContext('2d'); if (!ctx) return
    ctx.fillStyle = '#0F1B3D'; ctx.fillRect(0, 0, 1000, 680)
    ctx.fillStyle = '#C9973B'; ctx.fillRect(0, 0, 1000, 10)
    await new Promise((res) => { const img = new Image(); img.onload = () => { try { ctx.drawImage(img, 60, 54, 110, 110) } catch { /* sin logo */ } res(null) }; img.onerror = () => res(null); img.src = '/sindika-dark.png' })
    ctx.fillStyle = '#C9973B'; ctx.font = 'bold 20px "Segoe UI", Arial'; ctx.fillText('CREDENCIALES DE ACCESO', 195, 92)
    ctx.fillStyle = '#ffffff'; ctx.font = 'bold 32px "Segoe UI", Arial'; ctx.fillText(cr.nombre, 195, 138)
    let y = 240
    const campo = (label: string, val: string) => {
      ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.font = '14px "Segoe UI", Arial'; ctx.fillText(label, 60, y)
      ctx.fillStyle = '#ffffff'; ctx.font = 'bold 26px "Segoe UI", Arial'; ctx.fillText(val || '—', 60, y + 34); y += 88
    }
    campo('PRESIDENCIA', cr.presi)
    campo('CORREO (USUARIO)', cr.email)
    campo('CONTRASEÑA', cr.password)
    const web = cr.dominio ? `https://${cr.dominio}` : `${window.location.origin}/?org=${cr.slug}`
    const login = cr.dominio ? `https://${cr.dominio}/ingresar` : `${window.location.origin}/ingresar`
    ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.font = '14px "Segoe UI", Arial'; ctx.fillText('PÁGINA WEB', 60, y)
    ctx.fillStyle = '#C9973B'; ctx.font = '18px "Segoe UI", Arial'; ctx.fillText(web, 60, y + 28); y += 64
    ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.font = '14px "Segoe UI", Arial'; ctx.fillText('INGRESAR', 60, y)
    ctx.fillStyle = '#C9973B'; ctx.font = '18px "Segoe UI", Arial'; ctx.fillText(login, 60, y + 28)
    ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.font = '14px "Segoe UI", Arial'; ctx.fillText('con tecnología de Sindika', 60, 650)
    const a = document.createElement('a'); a.href = canvas.toDataURL('image/png'); a.download = `credenciales-${cr.slug}.png`; a.click()
  }

  // Sindicatos por vencer / vencidos, ordenados por fecha (para el Resumen).
  const proximos = orgs
    .filter((o) => o.activo && o.fecha_proximo_pago && ['por_vencer', 'vencido'].includes(estadoPago(o.fecha_proximo_pago)))
    .sort((a, b) => (a.fecha_proximo_pago! < b.fecha_proximo_pago! ? -1 : 1))

  const NAV: { key: View; label: string; icon: React.ReactNode }[] = [
    { key: 'resumen', label: 'Resumen', icon: <LayoutDashboardIcon className="h-4 w-4" /> },
    { key: 'sindicatos', label: 'Sindicatos', icon: <Building2Icon className="h-4 w-4" /> },
    { key: 'nuevo', label: 'Nuevo sindicato', icon: <PlusIcon className="h-4 w-4" /> },
  ]
  const TITULO: Record<View, { t: string; s: string }> = {
    resumen: { t: 'Resumen', s: 'Salud del negocio de un vistazo.' },
    sindicatos: { t: `Sindicatos (${orgs.length})`, s: 'Administra cada organización y sus cobros.' },
    nuevo: { t: 'Nuevo sindicato', s: 'Da de alta una organización en un paso.' },
  }

  return (
    <div className="flex min-h-screen bg-canvas">
      {/* Sidebar (escritorio) */}
      <aside className="hidden w-56 shrink-0 flex-col bg-night text-white sm:flex">
        <div className="flex items-center gap-2.5 border-b border-white/10 px-5 py-4">
          <img src="/sindika-dark.png" alt="Sindika" className="h-8 w-8 object-contain" />
          <div><p className="font-display text-sm font-semibold tracking-[0.14em]">SINDIKA</p><p className="text-[10px] text-white/50">Administración</p></div>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {NAV.map((n) => (
            <button key={n.key} onClick={() => irA(n.key)} className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${view === n.key ? 'bg-white/15 text-white' : 'text-white/60 hover:bg-white/5 hover:text-white'}`}>
              {n.icon}{n.label}
            </button>
          ))}
        </nav>
        <div className="border-t border-white/10 p-3">
          <button onClick={signOut} className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold text-white/60 transition hover:bg-white/5 hover:text-white"><LogOutIcon className="h-4 w-4" />Salir</button>
        </div>
      </aside>

      {/* Contenido */}
      <div className="flex min-h-screen flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-ink/[0.08] bg-white px-5 py-3.5">
          <div>
            <h1 className="font-display text-lg font-semibold text-ink">{TITULO[view].t}</h1>
            <p className="text-xs text-ink/50">{TITULO[view].s}</p>
          </div>
          {/* Navegación compacta en móvil */}
          <div className="flex items-center gap-2 sm:hidden">
            <select value={view} onChange={(e) => irA(e.target.value as View)} className="rounded-lg border border-ink/12 bg-white px-2.5 py-1.5 text-sm font-semibold text-ink/70">
              {NAV.map((n) => <option key={n.key} value={n.key}>{n.label}</option>)}
            </select>
            <button onClick={signOut} aria-label="Salir" className="rounded-lg border border-ink/12 p-2 text-ink/60"><LogOutIcon className="h-4 w-4" /></button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-5 lg:p-7">
          <div className="mx-auto max-w-5xl space-y-5">
            {error ? <div className="flex items-start gap-2 rounded-xl border border-brick/25 bg-red-50 px-3 py-2.5 text-sm text-brick"><AlertCircleIcon className="mt-0.5 h-4 w-4 shrink-0" /><span>{error}</span></div> : null}
            {ok ? <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800"><CheckCircle2Icon className="mt-0.5 h-4 w-4 shrink-0" /><span>{ok}</span></div> : null}

            {/* RESUMEN */}
            {view === 'resumen' ? (
              <>
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                  <Kpi icon={<UsersIcon className="h-4 w-4" />} label="Afiliados en total" value={loading ? '—' : totalAfiliados.toLocaleString('es-CO')} sub={`${orgs.length} sindicato${orgs.length === 1 ? '' : 's'}`} />
                  <Kpi icon={<Building2Icon className="h-4 w-4" />} label="Sindicatos activos" value={loading ? '—' : String(activos)} sub={suspendidos ? `${suspendidos} suspendido${suspendidos === 1 ? '' : 's'}` : 'todos al aire'} tone={suspendidos ? 'warn' : 'ok'} />
                  <Kpi icon={<WalletIcon className="h-4 w-4" />} label="Ingreso anual (ARR)" value={loading ? '—' : COP(arr)} sub="suscripciones activas" tone="ok" />
                  <Kpi icon={<CalendarClockIcon className="h-4 w-4" />} label="Por cobrar pronto" value={loading ? '—' : String(porCobrar)} sub="vencidos o próximos" tone={porCobrar ? 'warn' : 'ok'} />
                </div>
                <div className="rounded-xl border border-ink/[0.08] bg-white p-4">
                  <h4 className="mb-2 font-display text-sm font-semibold text-ink">Próximos vencimientos</h4>
                  {loading ? <p className="py-4 text-center text-sm text-ink/40">Cargando…</p> : proximos.length === 0 ? (
                    <p className="py-4 text-center text-sm text-ink/40">Todo al día. No hay cobros pendientes.</p>
                  ) : (
                    <div className="divide-y divide-ink/[0.06]">
                      {proximos.map((o) => {
                        const eui = ESTADO_UI[estadoPago(o.fecha_proximo_pago)]
                        const f = new Date(o.fecha_proximo_pago + 'T00:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
                        return (
                          <div key={o.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                            <button onClick={() => irA('sindicatos')} className="truncate font-semibold text-ink hover:text-night hover:underline">{o.nombre}</button>
                            <span className="flex items-center gap-2 text-xs"><span className="text-ink/50">{f}</span><span className="text-ink/70">{COP(o.precio_anual)}</span><span className={`rounded px-1.5 py-0.5 font-semibold ${eui.cls}`}>{eui.label}</span></span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </>
            ) : null}

            {/* SINDICATOS */}
            {view === 'sindicatos' ? (
              loading ? <p className="py-6 text-center text-sm text-ink/50">Cargando…</p> : (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {orgs.map((o) => <OrgItem key={o.id} org={o} conteo={conteos[o.id]} onReload={() => void load()} />)}
                </div>
              )
            ) : null}

            {/* NUEVO */}
            {view === 'nuevo' ? (
              <>
                {creado ? (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="flex items-center gap-1.5 text-sm font-semibold text-emerald-800"><CheckCircle2Icon className="h-4 w-4" />Sindicato "{creado.nombre}" creado</p>
                        <p className="mt-1 text-xs text-ink/60">Entrega estas credenciales a la presidencia. La contraseña solo se muestra ahora.</p>
                      </div>
                      <button onClick={() => { setCreado(null); setAvisoCorreo('') }} aria-label="Cerrar" className="rounded-lg p-1.5 text-ink/40 transition hover:bg-white"><XIcon className="h-4 w-4" /></button>
                    </div>
                    <div className="mt-3 grid gap-1.5 text-xs">
                      <div><span className="text-ink/45">Página: </span><a href={webUrl} target="_blank" rel="noreferrer" className="font-semibold text-night underline">{webUrl}</a></div>
                      <div><span className="text-ink/45">Ingresar: </span><a href={loginUrl} target="_blank" rel="noreferrer" className="font-semibold text-night underline">{loginUrl}</a></div>
                      <div><span className="text-ink/45">Correo: </span><span className="font-semibold text-ink">{creado.email}</span></div>
                      <div><span className="text-ink/45">Contraseña: </span><span className="font-semibold text-ink">{creado.password}</span></div>
                    </div>
                    <button onClick={() => descargarCredenciales(creado)} className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-night px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-night-deep"><DownloadIcon className="h-4 w-4" />Descargar credenciales</button>
                    {avisoCorreo ? <p className="mt-2 text-[11px] font-medium text-night">{avisoCorreo}</p> : null}
                    {creado.dominio ? <p className="mt-2 text-[11px] text-amber-700">Recuerda agregar el dominio <strong>{creado.dominio}</strong> en Vercel para que su página cargue.</p> : null}
                  </div>
                ) : null}

                <form onSubmit={crear} className="rounded-xl border border-ink/10 bg-white p-5">
                  <p className="text-xs text-ink/50">Se crea todo automáticamente, incluida la cuenta de presidencia con su contraseña.</p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    <Field label="Nombre del sindicato"><input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Sindicato de la Gobernación…" className={inputC} /></Field>
                    <Field label="Identificador (slug)"><input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="gob-atlantico" className={inputC} /></Field>
                    <Field label="Nombre del presidente"><input value={presiNombre} onChange={(e) => setPresiNombre(e.target.value)} placeholder="Nombre y apellido" className={inputC} /></Field>
                    <Field label="Correo de presidencia"><input value={presiEmail} onChange={(e) => setPresiEmail(e.target.value)} placeholder="presidencia@…" className={inputC} /></Field>
                    <Field label="Contraseña inicial"><input value={presiPassword} onChange={(e) => setPresiPassword(e.target.value)} placeholder="Clave para la presidencia" className={inputC} /></Field>
                    <Field label="Dominio propio (opcional)"><input value={dominio} onChange={(e) => setDominio(e.target.value)} placeholder="ej. serdnp.sindika.com" className={inputC} /></Field>
                    <Field label="Plan">
                      <select value={plan} onChange={(e) => setPlan(e.target.value as PlanKey)} className={inputC}>
                        {(Object.keys(PLANES) as PlanKey[]).map((k) => (
                          <option key={k} value={k}>{PLANES[k].label} · {PLANES[k].max ? `hasta ${PLANES[k].max}` : '800+'} · {COP(PLANES[k].precio)}/año</option>
                        ))}
                      </select>
                    </Field>
                  </div>
                  <p className="mt-2 text-[11px] text-ink/45">El plan fija el precio anual y el límite de afiliados sugeridos, y agenda el primer pago a 1 año. Todo es editable luego por sindicato.</p>
                  <button type="submit" disabled={busy || !nombre.trim() || !slug.trim() || !presiEmail.trim() || !presiPassword.trim() || !presiNombre.trim()} className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-night px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-night-deep disabled:opacity-40">
                    <PlusIcon className="h-4 w-4" />{busy ? 'Creando…' : 'Crear sindicato'}
                  </button>
                </form>
              </>
            ) : null}
          </div>
        </main>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Pantalla dedicada del ADMINISTRADOR DE LA PLATAFORMA (Sindika).
// Aquí aterriza platform_admin — no tiene rol de sindicato ni pertenece a uno.
// ---------------------------------------------------------------------------
export function SuperAdminScreen() {
  // El panel de admin no usa rutas de módulo: quita el /app/<modulo> sobrante.
  // (No toca el dominio pelado de plataforma, que queda sin ruta.)
  useEffect(() => {
    const p = window.location.pathname
    if (p.startsWith('/app') || p === '/ingresar') window.history.replaceState({}, '', '/')
  }, [])
  return <SuperAdminContent />
}

function OrgItem({ org, conteo, onReload }: { org: OrgRow; conteo?: Conteo; onReload: () => void }) {
  const [editing, setEditing] = useState(false)
  const [borrando, setBorrando] = useState(false)
  const [pagando, setPagando] = useState(false)
  const [recibo, setRecibo] = useState<Pago | null>(null)
  const [resetInfo, setResetInfo] = useState<null | { email: string; password: string }>(null)
  const esPrincipal = org.slug === 'serdnp'
  const est = estadoPago(org.fecha_proximo_pago)
  const eui = ESTADO_UI[est]
  const nAfi = conteo?.afiliados ?? 0
  const excede = org.afiliados_max != null && nAfi > org.afiliados_max
  const fechaFmt = org.fecha_proximo_pago ? new Date(org.fecha_proximo_pago + 'T00:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

  async function toggleActivo() {
    await supabase.from('organizations').update({ activo: !org.activo }).eq('id', org.id)
    onReload()
  }

  // Registrar pago: guarda el pago en el historial, adelanta el próximo
  // vencimiento un año (desde hoy, o desde el vencimiento vigente si es futuro)
  // y deja disponible el recibo para descargar.
  async function registrarPago() {
    if (!window.confirm(`¿Registrar el pago anual de "${org.nombre}" por ${COP(org.precio_anual)}?\n\nSe guardará en el historial y el próximo vencimiento se moverá un año hacia adelante.`)) return
    setPagando(true)
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0)
    const base = org.fecha_proximo_pago ? new Date(org.fecha_proximo_pago + 'T00:00:00') : hoy
    const desde = base.getTime() > hoy.getTime() ? base : hoy
    desde.setFullYear(desde.getFullYear() + 1)
    const venceNuevo = desde.toISOString().slice(0, 10)
    const periodo = `${hoy.getFullYear()} → ${desde.getFullYear()}`
    const { data, error } = await supabase.from('pagos').insert({
      org_id: org.id, monto: org.precio_anual, periodo, metodo: 'Transferencia',
      fecha_pago: hoy.toISOString().slice(0, 10), vence_nuevo: venceNuevo,
    }).select().single()
    if (error) { setPagando(false); window.alert('No se pudo registrar el pago: ' + error.message); return }
    await supabase.from('organizations').update({ fecha_proximo_pago: venceNuevo }).eq('id', org.id)
    setRecibo(data as Pago)
    setPagando(false)
    onReload()
  }

  // Recibo/comprobante de pago descargable (PNG), estilo Sindika.
  function descargarRecibo(p: Pago) {
    const canvas = document.createElement('canvas')
    canvas.width = 1000; canvas.height = 620
    const ctx = canvas.getContext('2d'); if (!ctx) return
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, 1000, 620)
    ctx.fillStyle = '#0b2461'; ctx.fillRect(0, 0, 1000, 90)
    ctx.fillStyle = '#ffffff'; ctx.font = 'bold 24px "Segoe UI", Arial'; ctx.fillText('RECIBO DE PAGO', 40, 45)
    ctx.font = '14px "Segoe UI", Arial'; ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.fillText('Plataforma Sindika', 40, 70)
    ctx.textAlign = 'right'; ctx.fillStyle = '#ffffff'; ctx.font = '13px "Segoe UI", Arial'
    ctx.fillText(`Recibo ${p.id.slice(0, 8).toUpperCase()}`, 960, 55); ctx.textAlign = 'left'
    ctx.fillStyle = '#0e1a34'; ctx.font = 'bold 22px "Segoe UI", Arial'; ctx.fillText(org.nombre, 40, 150)
    let y = 220
    const linea = (k: string, v: string) => {
      ctx.fillStyle = '#57678a'; ctx.font = '14px "Segoe UI", Arial'; ctx.fillText(k, 40, y)
      ctx.fillStyle = '#0e1a34'; ctx.font = 'bold 18px "Segoe UI", Arial'; ctx.fillText(v, 40, y + 26); y += 74
    }
    const f = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })
    linea('FECHA DE PAGO', f(p.fecha_pago))
    linea('CONCEPTO', `Suscripción anual · periodo ${p.periodo || '—'}`)
    linea('MEDIO DE PAGO', p.metodo || 'Transferencia')
    linea('PRÓXIMO VENCIMIENTO', p.vence_nuevo ? f(p.vence_nuevo) : '—')
    ctx.fillStyle = '#f2f6fd'; ctx.fillRect(40, y - 4, 920, 66)
    ctx.fillStyle = '#57678a'; ctx.font = '14px "Segoe UI", Arial'; ctx.fillText('VALOR PAGADO', 60, y + 22)
    ctx.fillStyle = '#2456e6'; ctx.font = 'bold 30px "Segoe UI", Arial'; ctx.textAlign = 'right'; ctx.fillText(COP(p.monto), 940, y + 30); ctx.textAlign = 'left'
    ctx.fillStyle = '#99a3b8'; ctx.font = '12px "Segoe UI", Arial'; ctx.fillText('Comprobante generado por Sindika', 40, 600)
    const a = document.createElement('a'); a.href = canvas.toDataURL('image/png'); a.download = `recibo-${org.slug}-${p.fecha_pago}.png`; a.click()
  }

  // Resetea la contraseña de la cuenta de presidencia (soporte). Genera una
  // contraseña nueva, la aplica en el servidor y la muestra una sola vez.
  async function resetearPassword() {
    if (!window.confirm(`¿Generar una NUEVA contraseña para la presidencia de "${org.nombre}"?\n\nLa contraseña anterior dejará de funcionar. Deberás entregarle la nueva.`)) return
    const nueva = 'S' + Math.random().toString(36).slice(2, 8) + Math.floor(10 + Math.random() * 89) + '*'
    const { data, error } = await supabase.rpc('resetear_password', { p_org: org.id, p_nueva: nueva })
    if (error) { window.alert('No se pudo resetear: ' + error.message); return }
    setResetInfo({ email: String(data || ''), password: nueva })
  }

  async function borrar() {
    if (esPrincipal) { window.alert('No se puede eliminar el sindicato principal (SERDNP).'); return }
    const ok = window.confirm(`⚠️ Vas a ELIMINAR "${org.nombre}" y TODOS sus datos (afiliados, finanzas, publicaciones…) y las CUENTAS de acceso de esa gente, de forma permanente.\n\nEsto NO se puede deshacer. ¿Continuar?`)
    if (!ok) return
    setBorrando(true)
    const { error } = await supabase.rpc('eliminar_sindicato', { p_org: org.id })
    setBorrando(false)
    if (error) { window.alert('No se pudo eliminar: ' + error.message); return }
    onReload()
  }

  return (
    <div className={`rounded-xl border bg-white p-3 shadow-sm ${org.activo ? 'border-ink/[0.08]' : 'border-brick/25'}`}>
      <div className="flex items-center gap-3">
        <img src={org.logo_url || '/sindika.png'} alt={org.nombre} className="h-10 w-10 shrink-0 rounded-lg border border-ink/10 object-contain" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-ink">{org.nombre}</p>
          <p className="text-xs text-ink/45">{org.slug}{org.dominio ? ` · ${org.dominio}` : ''}</p>
        </div>
        <button onClick={toggleActivo} title={org.activo ? 'Suspender (por falta de pago)' : 'Reactivar'} className={`shrink-0 rounded-md px-2 py-1 text-[11px] font-semibold ${org.activo ? 'bg-emerald-100 text-emerald-700' : 'bg-brick/10 text-brick'}`}>
          {org.activo ? 'Activo' : 'Suspendido'}
        </button>
      </div>

      {/* Suscripción y cobro */}
      <div className="mt-2.5 space-y-1.5 rounded-lg bg-canvas/60 p-2.5 text-[11px]">
        <div className="flex items-center justify-between">
          <span className="text-ink/45">Plan</span>
          <span className="font-semibold text-ink">{PLANES[org.plan]?.label ?? org.plan} · {COP(org.precio_anual)}/año</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-ink/45">Próximo pago</span>
          <span className="flex items-center gap-1.5"><span className="text-ink/70">{fechaFmt}</span><span className={`rounded px-1.5 py-0.5 font-semibold ${eui.cls}`}>{eui.label}</span></span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-ink/45">Afiliados</span>
          <span className={`font-semibold ${excede ? 'text-brick' : 'text-ink'}`}>{nAfi.toLocaleString('es-CO')}{org.afiliados_max != null ? ` / ${org.afiliados_max}` : ''}{excede ? ' ⚠' : ''}</span>
        </div>
        {excede ? <p className="text-brick">Supera el límite del plan — oportunidad de upgrade.</p> : null}
      </div>

      <button onClick={registrarPago} disabled={pagando} className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50">
        <BanknoteIcon className="h-3.5 w-3.5" />{pagando ? 'Registrando…' : 'Registrar pago anual'}
      </button>

      {recibo ? (
        <div className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50 p-2.5 text-[11px]">
          <p className="font-semibold text-emerald-800">Pago registrado · {COP(recibo.monto)}</p>
          <p className="mt-0.5 text-ink/60">Próximo vencimiento: {recibo.vence_nuevo ? new Date(recibo.vence_nuevo + 'T00:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</p>
          <div className="mt-1.5 flex gap-2">
            <button onClick={() => descargarRecibo(recibo)} className="inline-flex items-center gap-1 rounded border border-ink/12 px-2 py-1 font-semibold text-ink/70 hover:border-night hover:text-night"><DownloadIcon className="h-3 w-3" />Descargar recibo</button>
            <button onClick={() => setRecibo(null)} className="rounded px-2 py-1 font-semibold text-ink/50 hover:text-ink">Cerrar</button>
          </div>
        </div>
      ) : null}

      {resetInfo ? (
        <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-[11px]">
          <p className="font-semibold text-amber-800">Nueva contraseña de presidencia</p>
          <p className="mt-1 text-ink/60">Cópiala y entrégala ahora; no se vuelve a mostrar.</p>
          <div className="mt-1.5 flex items-center justify-between gap-2 rounded bg-white px-2 py-1.5">
            <span className="truncate text-ink/70">{resetInfo.email}</span>
            <code className="font-mono font-semibold text-ink">{resetInfo.password}</code>
          </div>
          <div className="mt-1.5 flex gap-2">
            <button onClick={() => { void navigator.clipboard?.writeText(`Correo: ${resetInfo.email}\nContraseña: ${resetInfo.password}`) }} className="inline-flex items-center gap-1 rounded border border-ink/12 px-2 py-1 font-semibold text-ink/70 hover:border-night hover:text-night"><CopyIcon className="h-3 w-3" />Copiar</button>
            <button onClick={() => setResetInfo(null)} className="rounded px-2 py-1 font-semibold text-ink/50 hover:text-ink">Cerrar</button>
          </div>
        </div>
      ) : null}

      <div className="mt-2 flex gap-2">
        <button onClick={() => setEditing(true)} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-ink/12 py-2 text-xs font-semibold text-ink/70 transition hover:border-night hover:text-night">
          <PencilIcon className="h-3.5 w-3.5" /> Editar
        </button>
        <button onClick={resetearPassword} title="Resetear contraseña de presidencia" className="inline-flex shrink-0 items-center justify-center rounded-lg border border-ink/12 px-3 py-2 text-xs font-semibold text-ink/70 transition hover:border-night hover:text-night">
          <KeyRoundIcon className="h-3.5 w-3.5" />
        </button>
        {!esPrincipal ? (
          <button onClick={borrar} disabled={borrando} title="Eliminar sindicato" className="inline-flex shrink-0 items-center justify-center rounded-lg border border-brick/25 px-3 py-2 text-xs font-semibold text-brick transition hover:bg-brick/10 disabled:opacity-50">
            <Trash2Icon className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>
      {editing ? <EditOrgModal org={org} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); onReload() }} /> : null}
    </div>
  )
}

function EditOrgModal({ org, onClose, onSaved }: { org: OrgRow; onClose: () => void; onSaved: () => void }) {
  const [nombre, setNombre] = useState(org.nombre)
  const [logoUrl, setLogoUrl] = useState(org.logo_url ?? '')
  const [dominio, setDominio] = useState(org.dominio ?? '')
  const [correo, setCorreo] = useState(org.correo_remitente ?? '')
  const [plan, setPlan] = useState<PlanKey>(org.plan)
  const [precio, setPrecio] = useState(String(org.precio_anual ?? 0))
  const [fechaPago, setFechaPago] = useState(org.fecha_proximo_pago ?? '')
  const [afiMax, setAfiMax] = useState(org.afiliados_max != null ? String(org.afiliados_max) : '')
  const [notas, setNotas] = useState(org.notas_cobro ?? '')
  const [contactoNombre, setContactoNombre] = useState(org.contacto_nombre ?? '')
  const [contactoTel, setContactoTel] = useState(org.contacto_telefono ?? '')
  const [pagos, setPagos] = useState<Pago[]>([])
  const [busy, setBusy] = useState(false)
  const [subiendo, setSubiendo] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  // Historial de pagos del sindicato (Opción A: registrados a mano).
  useEffect(() => {
    supabase.from('pagos').select('id,monto,periodo,metodo,fecha_pago,vence_nuevo,nota').eq('org_id', org.id).order('fecha_pago', { ascending: false })
      .then(({ data }) => setPagos((data as Pago[]) ?? []))
  }, [org.id])

  // Al cambiar de plan, propone su precio y límite (el usuario puede sobreescribir).
  function cambiarPlan(k: PlanKey) {
    setPlan(k)
    setPrecio(String(PLANES[k].precio))
    setAfiMax(PLANES[k].max != null ? String(PLANES[k].max) : '')
  }

  async function handleFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setSubiendo(true); setError('')
    try { setLogoUrl(await subirFoto(file)) }
    catch { setError('No se pudo subir el logo.') }
    finally { setSubiendo(false) }
  }

  async function guardar() {
    setBusy(true); setError('')
    const dom = dominio.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '')
    const rem = correo.trim().toLowerCase()
    if (rem && !/^[^@\s<>"]+@[^@\s<>"]+\.[^@\s<>"]+$/.test(rem)) { setBusy(false); setError('El correo remitente no es válido (ej. notificaciones@sudominio.com).'); return }
    const { error } = await supabase.from('organizations')
      .update({
        nombre: nombre.trim() || org.nombre, logo_url: logoUrl || null, dominio: dom || null, correo_remitente: rem || null,
        plan, precio_anual: Math.max(0, Math.round(Number(precio) || 0)),
        fecha_proximo_pago: fechaPago || null,
        afiliados_max: afiMax.trim() === '' ? null : Math.max(0, Math.round(Number(afiMax) || 0)),
        notas_cobro: notas.trim() || null,
        contacto_nombre: contactoNombre.trim() || null,
        contacto_telefono: contactoTel.trim() || null,
      })
      .eq('id', org.id)
    setBusy(false)
    if (error) setError(error.message)
    else onSaved()
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-night/45 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl border border-ink/10 bg-white shadow-2xl shadow-night/25" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between border-b border-ink/[0.08] px-6 py-4">
          <div>
            <h3 className="font-display text-base font-semibold text-ink">Editar sindicato</h3>
            <p className="text-xs text-ink/50">{org.slug}</p>
          </div>
          <button onClick={onClose} aria-label="Cerrar" className="rounded-lg p-1.5 text-ink/40 transition hover:bg-canvas hover:text-ink"><XIcon className="h-4 w-4" /></button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          <div className="grid gap-5 sm:grid-cols-2">
            {/* Columna 1: identidad y marca */}
            <div className="space-y-4">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-ink/70">Nombre del sindicato</span>
                <input value={nombre} onChange={(e) => setNombre(e.target.value)} className={inputC} />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-ink/70">Dominio propio de la web (opcional)</span>
                <input value={dominio} onChange={(e) => setDominio(e.target.value)} placeholder="ej. acordemusic.com" className={inputC} />
                <span className="mt-1 block text-[11px] text-ink/45">Si lo dejas vacío, abre con el dominio por defecto. También debe agregarse al proyecto en Vercel.</span>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-ink/70">Correo remitente propio (opcional)</span>
                <input value={correo} onChange={(e) => setCorreo(e.target.value)} placeholder="ej. notificaciones@sudominio.com" className={inputC} />
                <span className="mt-1 block text-[11px] text-ink/45">Requiere ese dominio verificado en Resend. Vacío = envía con la dirección del sistema y el nombre del sindicato.</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-ink/70">Contacto</span>
                  <input value={contactoNombre} onChange={(e) => setContactoNombre(e.target.value)} placeholder="Persona de contacto" className={inputC} />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-ink/70">Teléfono / WhatsApp</span>
                  <input value={contactoTel} onChange={(e) => setContactoTel(e.target.value)} placeholder="300 000 0000" className={inputC} />
                </label>
              </div>
              <div>
                <span className="mb-1.5 block text-xs font-medium text-ink/70">Logo</span>
                <div className="flex items-center gap-3">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-ink/10 bg-canvas">
                    <img src={logoUrl || '/sindika.png'} alt="Logo" className="h-full w-full object-contain" />
                  </div>
                  <input ref={fileRef} type="file" accept="image/*" onChange={handleFoto} className="hidden" />
                  <button onClick={() => fileRef.current?.click()} disabled={subiendo} className="inline-flex items-center gap-1.5 rounded-xl border border-ink/12 px-3 py-2 text-sm font-semibold text-ink/70 transition hover:border-night hover:text-night disabled:opacity-50">
                    <ImageIcon className="h-4 w-4" />{subiendo ? 'Subiendo…' : 'Elegir archivo'}
                  </button>
                </div>
              </div>
            </div>

            {/* Columna 2: suscripción y cobro */}
            <div className="rounded-xl border border-ink/10 bg-canvas/50 p-3">
              <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-ink/70"><WalletIcon className="h-3.5 w-3.5" />Suscripción y cobro</p>
              <div className="grid grid-cols-2 gap-3">
                <label className="col-span-2 block">
                  <span className="mb-1 block text-[11px] font-medium text-ink/60">Plan</span>
                  <select value={plan} onChange={(e) => cambiarPlan(e.target.value as PlanKey)} className={inputC}>
                    {(Object.keys(PLANES) as PlanKey[]).map((k) => <option key={k} value={k}>{PLANES[k].label}</option>)}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 block text-[11px] font-medium text-ink/60">Precio anual (COP)</span>
                  <input value={precio} onChange={(e) => setPrecio(e.target.value.replace(/[^\d]/g, ''))} inputMode="numeric" className={inputC} />
                </label>
                <label className="block">
                  <span className="mb-1 block text-[11px] font-medium text-ink/60">Límite afiliados</span>
                  <input value={afiMax} onChange={(e) => setAfiMax(e.target.value.replace(/[^\d]/g, ''))} inputMode="numeric" placeholder="sin límite" className={inputC} />
                </label>
                <label className="col-span-2 block">
                  <span className="mb-1 block text-[11px] font-medium text-ink/60">Próximo pago</span>
                  <input type="date" value={fechaPago} onChange={(e) => setFechaPago(e.target.value)} className={inputC} />
                </label>
                <label className="col-span-2 block">
                  <span className="mb-1 block text-[11px] font-medium text-ink/60">Nota de cobro (interna)</span>
                  <input value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="ej. paga por transferencia el día 5" className={inputC} />
                </label>
              </div>
            </div>
          </div>

          <div className="mt-5 rounded-xl border border-ink/10 p-3">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-ink/70"><BanknoteIcon className="h-3.5 w-3.5" />Historial de pagos</p>
            {pagos.length === 0 ? (
              <p className="py-2 text-center text-[11px] text-ink/40">Aún no hay pagos registrados. Usa "Registrar pago anual" en la tarjeta del sindicato.</p>
            ) : (
              <div className="divide-y divide-ink/[0.06] text-[11px]">
                {pagos.map((p) => (
                  <div key={p.id} className="flex items-center justify-between gap-2 py-1.5">
                    <span className="text-ink/60">{new Date(p.fecha_pago + 'T00:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })} · {p.metodo || '—'}</span>
                    <span className="text-ink/45">{p.periodo || ''}</span>
                    <span className="font-semibold text-ink">{COP(p.monto)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {error ? <p className="mt-3 text-xs text-brick">{error}</p> : null}
        </div>

        <div className="flex gap-2 border-t border-ink/[0.08] px-6 py-4">
          <button onClick={onClose} className="flex-1 rounded-xl border border-ink/12 py-2.5 text-sm font-semibold text-ink/60 transition hover:bg-canvas">Cancelar</button>
          <button onClick={guardar} disabled={busy || subiendo} className="flex-1 rounded-xl bg-night py-2.5 text-sm font-semibold text-white transition hover:bg-night-deep disabled:opacity-50">{busy ? 'Guardando…' : 'Guardar'}</button>
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

function Kpi({ icon, label, value, sub, tone = 'neutral' }: { icon: React.ReactNode; label: string; value: string; sub?: string; tone?: 'neutral' | 'ok' | 'warn' }) {
  const toneCls = tone === 'ok' ? 'text-emerald-600' : tone === 'warn' ? 'text-amber-600' : 'text-night'
  return (
    <div className="rounded-xl border border-ink/[0.08] bg-white p-3.5 shadow-sm">
      <div className="flex items-center gap-1.5 text-xs text-ink/50"><span className={toneCls}>{icon}</span>{label}</div>
      <p className="mt-1.5 font-display text-xl font-semibold text-ink">{value}</p>
      {sub ? <p className="mt-0.5 text-[11px] text-ink/40">{sub}</p> : null}
    </div>
  )
}
