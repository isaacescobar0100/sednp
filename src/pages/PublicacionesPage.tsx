import React, { useEffect, useMemo, useRef, useState } from 'react'
import { GlobeIcon, ImageIcon, PencilIcon, PlusIcon, SearchIcon, Trash2Icon, XIcon } from 'lucide-react'
import { SectionTitle } from '../components/SectionTitle'
import { StatusBadge } from '../components/StatusBadge'
import { useDemo } from '../store/DemoStore'
import { useSession } from '../store/session'
import { useAuth } from '../store/auth'
import { subirFoto } from '../store/storageApi'
import { Publicacion, PubTipo, fetchPublicaciones, insertPublicacion, updatePublicacion, deletePublicacion } from '../store/publicacionesApi'

const TIPO_LABEL: Record<PubTipo, string> = { articulo: 'Artículo', anuncio: 'Anuncio', pagina: 'Página fija', documento: 'Documento' }
const CLAVES: Array<{ value: string; label: string }> = [
  { value: 'quienes-somos', label: 'Quiénes somos' },
  { value: 'servicios', label: 'Nuestros servicios' },
  { value: 'contacto', label: 'Contacto' },
]
const filtros: Array<{ k: 'todos' | PubTipo; label: string }> = [
  { k: 'todos', label: 'Todos' }, { k: 'articulo', label: 'Artículos' }, { k: 'anuncio', label: 'Anuncios' }, { k: 'documento', label: 'Documentos' }, { k: 'pagina', label: 'Páginas' },
]

export function PublicacionesPage() {
  const { notify } = useDemo()
  const { can } = useSession()
  const canManage = can('comms.send')
  const [list, setList] = useState<Publicacion[]>([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState<'todos' | PubTipo>('todos')
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<Publicacion | 'new' | null>(null)

  async function load() {
    setLoading(true)
    try { setList(await fetchPublicaciones()) } catch { /* RLS/red */ } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return list.filter((p) => (filtro === 'todos' || p.tipo === filtro) && (q === '' || `${p.titulo} ${p.categoria}`.toLowerCase().includes(q)))
  }, [list, filtro, query])

  async function togglePublicar(p: Publicacion) {
    const nuevo = p.estado === 'publicado' ? 'borrador' : 'publicado'
    try {
      await updatePublicacion(p.id, { estado: nuevo, fechaPub: nuevo === 'publicado' && !p.fechaPub ? new Date().toISOString() : p.fechaPub })
      notify(nuevo === 'publicado' ? 'Publicación publicada.' : 'Publicación pasada a borrador.', 'success')
      load()
    } catch { notify('No se pudo cambiar el estado.', 'warning') }
  }
  async function borrar(p: Publicacion) {
    if (!window.confirm(`¿Eliminar "${p.titulo || 'sin título'}"?`)) return
    try { await deletePublicacion(p.id); notify('Publicación eliminada.', 'warning'); load() } catch { notify('No se pudo eliminar.', 'warning') }
  }

  return (
    <div className="mx-auto max-w-[1440px]">
      <SectionTitle
        eyebrow="Página web · comunicación"
        title="Publicaciones"
        description="Artículos, anuncios y páginas del sitio público. Lo que publiques aquí aparece en la web."
        action={canManage ? (
          <button onClick={() => setEditing('new')} className="inline-flex items-center gap-2 rounded-xl bg-night px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-night/15 transition hover:bg-night-deep"><PlusIcon className="h-4 w-4" />Nueva publicación</button>
        ) : null}
      />

      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <label className="relative max-w-md flex-1">
          <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/40" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por título o categoría" className="w-full rounded-xl border border-ink/10 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-night focus:ring-4 focus:ring-night/10" />
        </label>
        <div className="flex flex-wrap gap-2">
          {filtros.map((f) => <button key={f.k} onClick={() => setFiltro(f.k)} className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${filtro === f.k ? 'bg-night text-white' : 'bg-canvas text-ink/60 hover:bg-ink/5'}`}>{f.label}</button>)}
        </div>
      </div>

      {!canManage ? (
        <div className="mb-5 rounded-xl border border-gold/30 bg-gold/[0.08] px-4 py-3 text-sm text-ink/70">La edición de la web está reservada a Secretaría y Presidencia. Aquí puedes consultar las publicaciones.</div>
      ) : null}

      {loading ? (
        <div className="rounded-2xl border border-ink/[0.08] bg-white p-8 text-center text-sm text-ink/50">Cargando…</div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-ink/20 bg-white px-6 py-12 text-center text-sm text-ink/50">Aún no hay publicaciones. {canManage ? 'Crea la primera con “Nueva publicación”.' : ''}</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((p) => (
            <article key={p.id} className="flex flex-col overflow-hidden rounded-2xl border border-ink/[0.08] bg-white">
              <div className="h-32 bg-canvas">
                {p.imagenUrl ? <img src={p.imagenUrl} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-ink/25"><GlobeIcon className="h-8 w-8" /></div>}
              </div>
              <div className="flex flex-1 flex-col p-4">
                <div className="mb-1 flex items-center gap-2">
                  <span className="rounded-md bg-night/[0.06] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-night/70">{TIPO_LABEL[p.tipo]}</span>
                  {p.categoria ? <span className="text-[11px] text-ink/45">{p.categoria}</span> : null}
                  <span className="ml-auto"><StatusBadge tone={p.estado === 'publicado' ? 'positive' : 'neutral'}>{p.estado === 'publicado' ? 'Publicado' : 'Borrador'}</StatusBadge></span>
                </div>
                <h3 className="font-display text-sm font-semibold text-ink">{p.titulo || 'Sin título'}</h3>
                <p className="mt-1 line-clamp-2 text-xs text-ink/55">{p.resumen || p.contenido}</p>
                {canManage ? (
                  <div className="mt-3 flex items-center gap-2 border-t border-ink/[0.07] pt-3">
                    <button onClick={() => togglePublicar(p)} className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold ${p.estado === 'publicado' ? 'bg-ink/[0.06] text-ink/60' : 'bg-emerald-100 text-emerald-700'}`}>{p.estado === 'publicado' ? 'Despublicar' : 'Publicar'}</button>
                    <button onClick={() => setEditing(p)} className="rounded-lg p-1.5 text-ink/50 transition hover:bg-canvas hover:text-night" aria-label="Editar"><PencilIcon className="h-4 w-4" /></button>
                    <button onClick={() => borrar(p)} className="rounded-lg p-1.5 text-ink/40 transition hover:bg-brick/10 hover:text-brick" aria-label="Eliminar"><Trash2Icon className="h-4 w-4" /></button>
                  </div>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}

      {editing ? <EditorModal pub={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load() }} /> : null}
    </div>
  )
}

function EditorModal({ pub, onClose, onSaved }: { pub: Publicacion | null; onClose: () => void; onSaved: () => void }) {
  const { notify } = useDemo()
  const { user } = useSession()
  const { profile } = useAuth()
  const autorNombre = profile?.full_name || user.name
  const [form, setForm] = useState<Publicacion>(() => pub ?? {
    id: '', tipo: 'articulo', clave: '', titulo: '', resumen: '', contenido: '', categoria: '', imagenUrl: '',
    videoUrl: '', galeria: [], destacado: false, archivoUrl: '', estado: 'borrador', autor: autorNombre,
  })
  const galRef = useRef<HTMLInputElement>(null)
  const archRef = useRef<HTMLInputElement>(null)
  const vidRef = useRef<HTMLInputElement>(null)
  const [archNombre, setArchNombre] = useState('')
  const [subiendo, setSubiendo] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  function set<K extends keyof Publicacion>(k: K, v: Publicacion[K]) { setForm((p) => ({ ...p, [k]: v })) }

  async function handleImg(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setSubiendo(true)
    try { set('imagenUrl', await subirFoto(file)) } catch { notify('No se pudo subir la imagen.', 'warning') } finally { setSubiendo(false) }
  }
  async function addGaleria(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0) return
    setSubiendo(true)
    try {
      const urls: string[] = []
      for (const f of files) { urls.push(await subirFoto(f)) }
      setForm((p) => ({ ...p, galeria: [...p.galeria, ...urls] }))
    } catch { notify('No se pudieron subir algunas imágenes.', 'warning') } finally { setSubiendo(false) }
  }
  function quitarGaleria(url: string) { setForm((p) => ({ ...p, galeria: p.galeria.filter((g) => g !== url) })) }
  async function handleArchivo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setSubiendo(true)
    try { set('archivoUrl', await subirFoto(file)); setArchNombre(file.name) } catch { notify('No se pudo subir el archivo.', 'warning') } finally { setSubiendo(false) }
  }
  async function handleVideo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setSubiendo(true)
    try { set('videoUrl', await subirFoto(file)) } catch { notify('No se pudo subir el video (¿muy pesado?). Prueba con un link de YouTube.', 'warning') } finally { setSubiendo(false) }
  }

  const valid = form.titulo.trim() !== '' && (form.tipo !== 'pagina' || form.clave !== '')

  async function guardar(publicar: boolean) {
    if (!valid || guardando) return
    setGuardando(true)
    const estado = publicar ? 'publicado' : form.estado
    const payload: Partial<Publicacion> = {
      tipo: form.tipo, clave: form.tipo === 'pagina' ? form.clave : '', titulo: form.titulo.trim(), resumen: form.resumen.trim(),
      contenido: form.contenido, categoria: form.categoria.trim(), imagenUrl: form.imagenUrl,
      videoUrl: form.videoUrl.trim(), galeria: form.galeria, destacado: form.destacado, archivoUrl: form.archivoUrl,
      estado, autor: form.autor || autorNombre,
      fechaPub: estado === 'publicado' && !form.fechaPub ? new Date().toISOString() : form.fechaPub,
    }
    try {
      if (pub) await updatePublicacion(pub.id, payload); else await insertPublicacion(payload)
      notify(publicar ? 'Publicación publicada.' : 'Borrador guardado.', 'success')
      onSaved()
    } catch { notify('No se pudo guardar la publicación.', 'warning') } finally { setGuardando(false) }
  }

  const inputClass = 'w-full rounded-xl border border-ink/12 bg-canvas/45 px-3 py-2.5 text-sm outline-none focus:border-night focus:ring-4 focus:ring-night/10'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-night/45 p-4">
      <section role="dialog" aria-modal="true" className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-start justify-between">
          <div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-gold">Página web</p><h2 className="mt-1 font-display text-xl font-semibold">{pub ? 'Editar publicación' : 'Nueva publicación'}</h2></div>
          <button onClick={onClose} className="rounded-lg p-2 text-ink/50 hover:bg-canvas" aria-label="Cerrar"><XIcon className="h-5 w-5" /></button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-ink/70">Tipo</span>
            <select value={form.tipo} onChange={(e) => set('tipo', e.target.value as PubTipo)} className={inputClass}>
              <option value="articulo">Artículo (blog)</option>
              <option value="anuncio">Anuncio</option>
              <option value="documento">Documento público</option>
              <option value="pagina">Página fija</option>
            </select>
          </label>
          {form.tipo === 'pagina' ? (
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-ink/70">Página <span className="text-brick">*</span></span>
              <select value={form.clave} onChange={(e) => set('clave', e.target.value)} className={inputClass}>
                <option value="">Seleccionar</option>
                {CLAVES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </label>
          ) : (
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-ink/70">Categoría</span>
              <input value={form.categoria} onChange={(e) => set('categoria', e.target.value)} placeholder="Bienestar, Jurídico, Noticias…" className={inputClass} />
            </label>
          )}
          <label className="block sm:col-span-2">
            <span className="mb-1.5 block text-xs font-semibold text-ink/70">Título <span className="text-brick">*</span></span>
            <input value={form.titulo} onChange={(e) => set('titulo', e.target.value)} className={inputClass} />
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1.5 block text-xs font-semibold text-ink/70">Resumen (aparece en la portada)</span>
            <input value={form.resumen} onChange={(e) => set('resumen', e.target.value)} className={inputClass} />
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1.5 block text-xs font-semibold text-ink/70">Contenido</span>
            <textarea value={form.contenido} onChange={(e) => set('contenido', e.target.value)} rows={8} placeholder="Escribe el contenido. Deja una línea en blanco para separar párrafos." className={`${inputClass} resize-none`} />
          </label>
          <div className="sm:col-span-2">
            <span className="mb-1.5 block text-xs font-semibold text-ink/70">Imagen destacada</span>
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-ink/12 bg-canvas">
                {form.imagenUrl ? <img src={form.imagenUrl} alt="" className="h-full w-full object-cover" /> : <ImageIcon className="h-5 w-5 text-ink/30" />}
              </div>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleImg} className="hidden" />
              <button type="button" onClick={() => fileRef.current?.click()} disabled={subiendo} className="rounded-xl border border-ink/12 px-3 py-2 text-sm font-semibold text-ink/70 transition hover:border-night hover:text-night disabled:opacity-50">{subiendo ? 'Subiendo…' : form.imagenUrl ? 'Cambiar imagen' : 'Subir imagen'}</button>
            </div>
          </div>

          {form.tipo === 'documento' ? (
            <div className="sm:col-span-2">
              <span className="mb-1.5 block text-xs font-semibold text-ink/70">Archivo (PDF o imagen)</span>
              <div className="flex items-center gap-3">
                <input ref={archRef} type="file" accept="application/pdf,image/*" onChange={handleArchivo} className="hidden" />
                <button type="button" onClick={() => archRef.current?.click()} disabled={subiendo} className="rounded-xl border border-ink/12 px-3 py-2 text-sm font-semibold text-ink/70 transition hover:border-night hover:text-night disabled:opacity-50">{subiendo ? 'Subiendo…' : form.archivoUrl ? 'Cambiar archivo' : 'Subir archivo'}</button>
                {form.archivoUrl ? <span className="truncate text-xs text-emerald-700">{archNombre || 'Archivo cargado'}</span> : <span className="text-xs text-ink/40">Requerido para publicar el documento</span>}
              </div>
            </div>
          ) : null}

          {form.tipo === 'articulo' || form.tipo === 'anuncio' ? (
            <>
              <div className="sm:col-span-2">
                <span className="mb-1.5 block text-xs font-semibold text-ink/70">Video (opcional)</span>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input value={form.videoUrl} onChange={(e) => set('videoUrl', e.target.value)} placeholder="Pega un link de YouTube…" className={inputClass} />
                  <input ref={vidRef} type="file" accept="video/*" onChange={handleVideo} className="hidden" />
                  <button type="button" onClick={() => vidRef.current?.click()} disabled={subiendo} className="shrink-0 rounded-xl border border-ink/12 px-3 py-2.5 text-sm font-semibold text-ink/70 transition hover:border-night hover:text-night disabled:opacity-50">{subiendo ? 'Subiendo…' : 'Subir video'}</button>
                </div>
                <span className="mt-1 block text-xs text-ink/45">Pega un link de YouTube o sube un archivo. {form.videoUrl && !/youtu/.test(form.videoUrl) ? 'Video cargado.' : 'Para videos pesados, YouTube es lo recomendado.'}</span>
              </div>
              <div className="sm:col-span-2">
                <span className="mb-1.5 block text-xs font-semibold text-ink/70">Galería de imágenes (opcional)</span>
                <div className="flex flex-wrap items-center gap-2">
                  {form.galeria.map((g) => (
                    <span key={g} className="relative inline-block">
                      <img src={g} alt="" className="h-14 w-20 rounded-lg border border-ink/12 object-cover" />
                      <button type="button" onClick={() => quitarGaleria(g)} className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-brick text-white" aria-label="Quitar"><XIcon className="h-3 w-3" /></button>
                    </span>
                  ))}
                  <input ref={galRef} type="file" accept="image/*" multiple onChange={addGaleria} className="hidden" />
                  <button type="button" onClick={() => galRef.current?.click()} disabled={subiendo} className="h-14 w-20 rounded-lg border border-dashed border-ink/25 text-xs font-semibold text-ink/50 transition hover:border-night hover:text-night disabled:opacity-50">+ Agregar</button>
                </div>
              </div>
              <label className="flex items-center gap-2 sm:col-span-2">
                <input type="checkbox" checked={form.destacado} onChange={(e) => set('destacado', e.target.checked)} className="h-4 w-4 accent-night" />
                <span className="text-sm text-ink/75">Mostrar en el <strong>carrusel de la portada</strong></span>
              </label>
            </>
          ) : null}
        </div>

        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button onClick={onClose} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-ink/60 hover:bg-canvas">Cancelar</button>
          <button onClick={() => guardar(false)} disabled={!valid || guardando} className="rounded-xl border border-night/20 px-4 py-2.5 text-sm font-semibold text-night transition hover:bg-night/5 disabled:opacity-40">Guardar borrador</button>
          <button onClick={() => guardar(true)} disabled={!valid || guardando} className="rounded-xl bg-night px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-night-deep disabled:opacity-40">Publicar</button>
        </div>
      </section>
    </div>
  )
}
