import React, { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeftIcon, ArrowRightIcon, CalendarDaysIcon, ChevronLeftIcon, ChevronRightIcon, DownloadIcon, FileTextIcon, GlobeIcon, LogInIcon, MegaphoneIcon, MenuIcon, Share2Icon, UserPlusIcon, XIcon } from 'lucide-react'
import { PostPublico, fetchPaginaPublica, fetchPostsPublicos } from '../store/publicacionesApi'
import { supabase } from '../lib/supabase'

// Convierte una URL de YouTube (varias formas) en su URL para incrustar.
function youtubeEmbed(url?: string | null): string | null {
  if (!url) return null
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/)
  return m ? `https://www.youtube.com/embed/${m[1]}` : null
}

// Sitio público (marketing/blog) del sindicato. Lee el contenido PUBLICADO por
// RPCs anónimas. El slug del sindicato viene de ?org=<slug> (por defecto serdnp).

type View = 'inicio' | 'blog' | 'post' | 'anuncios' | 'documentos' | 'quienes-somos' | 'servicios' | 'contacto'
const NAV: Array<{ v: View; label: string }> = [
  { v: 'inicio', label: 'Inicio' }, { v: 'blog', label: 'Blog' }, { v: 'servicios', label: 'Servicios' },
  { v: 'quienes-somos', label: 'Quiénes somos' }, { v: 'anuncios', label: 'Anuncios' }, { v: 'documentos', label: 'Documentos' }, { v: 'contacto', label: 'Contacto' },
]

function fmtFecha(iso?: string | null): string {
  if (!iso) return ''
  try { return new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) } catch { return '' }
}
function Parrafos({ texto }: { texto: string }) {
  const bloques = texto.split(/\n\s*\n/).filter((b) => b.trim() !== '')
  if (bloques.length === 0) return <p className="text-ink/45">Sin contenido.</p>
  return <>{bloques.map((b, i) => <p key={i} className="mb-3 whitespace-pre-line leading-relaxed text-ink/75">{b}</p>)}</>
}

// Convierte un texto en una porción de URL legible (sin acentos ni símbolos).
function slugify(s: string): string {
  return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'p'
}
// Dirección propia de un artículo/anuncio: /articulo/<titulo>-<id-corto>.
function articuloPath(p: PostPublico): string {
  return `/${p.tipo === 'anuncio' ? 'anuncio' : 'articulo'}/${slugify(p.titulo)}-${p.id.slice(0, 8)}`
}
const VIEW_PATH: Record<string, string> = {
  inicio: '/', blog: '/blog', servicios: '/servicios', 'quienes-somos': '/quienes-somos',
  anuncios: '/anuncios', documentos: '/documentos', contacto: '/contacto',
}
const KNOWN_ROOTS = ['inicio', 'blog', 'anuncios', 'documentos', 'contacto']

export function PublicSite({ onEnter }: { onEnter: () => void }) {
  const [slug, setSlug] = useState('')
  const [org, setOrg] = useState<{ nombre: string; logo: string }>({ nombre: '', logo: '' })
  const [articulos, setArticulos] = useState<PostPublico[]>([])
  const [anuncios, setAnuncios] = useState<PostPublico[]>([])
  const [documentos, setDocumentos] = useState<PostPublico[]>([])
  const [showWelcome, setShowWelcome] = useState(true)
  const [pagina, setPagina] = useState<{ titulo?: string; contenido?: string } | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [copiado, setCopiado] = useState('')
  const [path, setPath] = useState(() => window.location.pathname)

  // Sincroniza con el botón atrás/adelante del navegador.
  useEffect(() => {
    const onPop = () => setPath(window.location.pathname)
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  // Resuelve el sindicato del sitio: por ?org=slug, luego por el DOMINIO (host),
  // y si no, SERDNP por defecto.
  useEffect(() => {
    let on = true
    const paramOrg = new URLSearchParams(window.location.search).get('org') || null
    supabase.rpc('sitio_publico', { p_host: window.location.hostname, p_slug: paramOrg }).then(({ data }) => {
      if (!on) return
      const d = (data || {}) as { slug?: string; nombre?: string; logoUrl?: string }
      setSlug(d.slug || 'serdnp')
      setOrg({ nombre: d.nombre || 'Sindicato', logo: d.logoUrl || '' })
    })
    return () => { on = false }
  }, [])

  // Título y favicon de la pestaña según el sindicato del sitio: su logo propio
  // si lo tiene; si no, el de Sindika. (El sistema ya lo hace; aquí, la web pública.)
  useEffect(() => {
    document.title = org.nombre && org.nombre !== 'Sindicato' ? org.nombre : 'Sindika'
    const href = org.logo || '/sindika.png'
    let link = document.querySelector<HTMLLinkElement>("link[rel='icon']")
    if (!link) { link = document.createElement('link'); link.rel = 'icon'; document.head.appendChild(link) }
    link.href = href
  }, [org])

  useEffect(() => {
    if (!slug) return
    let on = true
    fetchPostsPublicos(slug, 'articulo').then((l) => on && setArticulos(l))
    fetchPostsPublicos(slug, 'anuncio').then((l) => on && setAnuncios(l))
    fetchPostsPublicos(slug, 'documento').then((l) => on && setDocumentos(l))
    return () => { on = false }
  }, [slug])

  // Ruta actual → vista.
  const seg = path.replace(/^\/+|\/+$/g, '').split('/')
  const root = seg[0] || 'inicio'
  const isArticulo = root === 'articulo' || root === 'anuncio'
  const isPagina = root === 'quienes-somos' || root === 'servicios' || root === 'contacto'
  const view: View = isArticulo ? 'post' : (isPagina ? (root as View) : (KNOWN_ROOTS.includes(root) ? (root as View) : 'inicio'))
  const postShortId = isArticulo ? (seg[1]?.split('-').pop() || '') : ''
  const post = useMemo(() => {
    if (!postShortId) return null
    return [...articulos, ...anuncios].find((p) => p.id.startsWith(postShortId)) || null
  }, [postShortId, articulos, anuncios])

  const paginaClave = isPagina ? root : ''
  useEffect(() => {
    if (!paginaClave || !slug) { setPagina(null); return }
    let on = true
    fetchPaginaPublica(slug, paginaClave).then((p) => on && setPagina(p))
    return () => { on = false }
  }, [slug, paginaClave])

  function navigate(p: string) { window.history.pushState({}, '', p); setPath(p); setMenuOpen(false); window.scrollTo(0, 0) }
  function go(v: View) { navigate(VIEW_PATH[v] || '/') }
  function abrirPost(p: PostPublico) { navigate(articuloPath(p)) }
  function compartir(p: PostPublico) {
    const url = `${window.location.origin}/api/post?id=${p.id}&org=${encodeURIComponent(slug)}`
    try { navigator.clipboard.writeText(url); setCopiado(p.id); window.setTimeout(() => setCopiado(''), 2000) } catch { /* sin portapapeles */ }
  }

  const destacados = useMemo(() => articulos.slice(0, 3), [articulos])
  const slides = useMemo(() => {
    const conImg = articulos.filter((a) => a.imagenUrl)
    const marcados = conImg.filter((a) => a.destacado)
    return (marcados.length ? marcados : conImg).slice(0, 5)
  }, [articulos])
  const afiliarseUrl = `${window.location.origin}/?afiliacion=${encodeURIComponent(slug)}`
  const logo = org.logo || '/sindika.png'

  return (
    <div className="min-h-screen bg-canvas">
      {/* Modal de bienvenida: aparece al entrar a la portada y se puede cerrar. */}
      {showWelcome && view === 'inicio' ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-night/60 p-4" onClick={() => setShowWelcome(false)}>
          <div className="relative w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setShowWelcome(false)} className="absolute right-3 top-3 rounded-lg p-2 text-ink/40 transition hover:bg-canvas" aria-label="Cerrar"><XIcon className="h-5 w-5" /></button>
            <img src={logo} alt="" className="mx-auto h-16 w-16 object-contain" />
            <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-gold">Bienvenido</p>
            <h2 className="mt-1 font-display text-2xl font-semibold text-ink">{org.nombre || 'Nuestro sindicato'}</h2>
            <p className="mt-3 text-sm leading-relaxed text-ink/60">Noticias, bienestar, formación y la vida de nuestra organización sindical — en un solo lugar.</p>
            <div className="mt-6 flex flex-col gap-2">
              <a href={afiliarseUrl} className="inline-flex items-center justify-center gap-2 rounded-xl bg-gold px-5 py-3 text-sm font-semibold text-night transition hover:bg-gold/90"><UserPlusIcon className="h-4 w-4" />Afíliate en línea</a>
              <button onClick={() => setShowWelcome(false)} className="rounded-xl px-5 py-2.5 text-sm font-semibold text-ink/60 transition hover:bg-canvas">Explorar el sitio</button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-ink/[0.08] bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3">
          <button onClick={() => go('inicio')} className="flex items-center gap-2.5">
            <img src={logo} alt={org.nombre} className="h-9 w-9 object-contain" />
            <span className="font-display text-sm font-semibold text-ink">{org.nombre}</span>
          </button>
          <nav className="hidden items-center gap-1 lg:flex">
            {NAV.map((n) => <button key={n.v} onClick={() => go(n.v)} className={`rounded-lg px-3 py-2 text-sm font-medium transition ${view === n.v ? 'text-night' : 'text-ink/60 hover:text-night'}`}>{n.label}</button>)}
          </nav>
          <div className="flex items-center gap-2">
            <a href={afiliarseUrl} className="hidden items-center gap-1.5 rounded-xl bg-gold px-3.5 py-2 text-xs font-semibold text-night transition hover:bg-gold/90 sm:inline-flex"><UserPlusIcon className="h-3.5 w-3.5" />Afíliate</a>
            <button onClick={onEnter} className="inline-flex items-center gap-1.5 rounded-xl bg-night px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-night-deep"><LogInIcon className="h-3.5 w-3.5" />Ingresar</button>
            <button onClick={() => setMenuOpen((v) => !v)} className="rounded-lg p-2 text-ink/60 lg:hidden" aria-label="Menú">{menuOpen ? <XIcon className="h-5 w-5" /> : <MenuIcon className="h-5 w-5" />}</button>
          </div>
        </div>
        {menuOpen ? (
          <div className="border-t border-ink/[0.08] bg-white px-5 py-2 lg:hidden">
            {NAV.map((n) => <button key={n.v} onClick={() => go(n.v)} className="block w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium text-ink/70 hover:bg-canvas">{n.label}</button>)}
            <a href={afiliarseUrl} className="mt-1 block rounded-lg bg-gold/15 px-3 py-2.5 text-sm font-semibold text-night">Afíliate</a>
          </div>
        ) : null}
      </header>

      <main className="mx-auto max-w-6xl px-5 py-8">
        {view === 'inicio' ? (
          <>
            {slides.length > 0 ? (
              <Slider slides={slides} onOpen={abrirPost} />
            ) : (
              <section className="overflow-hidden rounded-3xl bg-night px-8 py-14 text-white sm:px-12">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">Bienvenido</p>
                <h1 className="mt-3 font-display text-3xl font-semibold leading-tight sm:text-4xl">{org.nombre}</h1>
                <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/70">Noticias, bienestar, formación y la vida de nuestra organización sindical.</p>
                <a href={afiliarseUrl} className="mt-7 inline-flex items-center gap-2 rounded-xl bg-gold px-5 py-3 text-sm font-semibold text-night transition hover:bg-gold/90"><UserPlusIcon className="h-4 w-4" />Afíliate en línea</a>
              </section>
            )}

            {anuncios.length > 0 ? (
              <section className="mt-8">
                <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-semibold text-ink"><MegaphoneIcon className="h-5 w-5 text-gold" />Anuncios</h2>
                <div className="space-y-2">
                  {anuncios.slice(0, 3).map((a) => (
                    <button key={a.id} onClick={() => abrirPost(a)} className="flex w-full items-center gap-3 rounded-xl border border-ink/[0.08] bg-white px-4 py-3 text-left transition hover:border-night/20">
                      <span className="h-2 w-2 shrink-0 rounded-full bg-gold" />
                      <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-ink">{a.titulo}</span><span className="block truncate text-xs text-ink/50">{a.resumen}</span></span>
                      <span className="shrink-0 text-xs text-ink/40">{fmtFecha(a.fechaPub)}</span>
                    </button>
                  ))}
                </div>
              </section>
            ) : null}

            <section className="mt-8">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-display text-lg font-semibold text-ink">Lo más reciente</h2>
                <button onClick={() => go('blog')} className="text-xs font-semibold text-night hover:underline">Ver todo</button>
              </div>
              <PostGrid posts={destacados} onOpen={abrirPost} onShare={compartir} copiadoId={copiado} />
            </section>
          </>
        ) : null}

        {view === 'blog' ? (
          <section>
            <h1 className="mb-1 font-display text-2xl font-semibold text-ink">Blog</h1>
            <p className="mb-6 text-sm text-ink/50">Artículos y publicaciones de la organización.</p>
            <PostGrid posts={articulos} onOpen={abrirPost} onShare={compartir} copiadoId={copiado} />
          </section>
        ) : null}

        {view === 'anuncios' ? (
          <section>
            <h1 className="mb-1 font-display text-2xl font-semibold text-ink">Anuncios</h1>
            <p className="mb-6 text-sm text-ink/50">Avisos y comunicados institucionales.</p>
            {anuncios.length === 0 ? <Empty texto="No hay anuncios por ahora." /> : (
              <div className="space-y-2">
                {anuncios.map((a) => (
                  <button key={a.id} onClick={() => abrirPost(a)} className="flex w-full items-center gap-3 rounded-xl border border-ink/[0.08] bg-white px-4 py-3.5 text-left transition hover:border-night/20">
                    <span className="h-2 w-2 shrink-0 rounded-full bg-gold" />
                    <span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-ink">{a.titulo}</span><span className="block truncate text-xs text-ink/50">{a.resumen}</span></span>
                    <span className="shrink-0 text-xs text-ink/40">{fmtFecha(a.fechaPub)}</span>
                  </button>
                ))}
              </div>
            )}
          </section>
        ) : null}

        {view === 'post' && !post ? <div className="mx-auto max-w-3xl py-12 text-center text-sm text-ink/50">Cargando…</div> : null}

        {view === 'post' && post ? (
          <article className="mx-auto max-w-3xl">
            <div className="mb-4 flex items-center justify-between">
              <button onClick={() => go(post.tipo === 'anuncio' ? 'anuncios' : 'blog')} className="inline-flex items-center gap-1.5 text-sm font-semibold text-night hover:underline"><ArrowLeftIcon className="h-4 w-4" />Volver</button>
              <button onClick={() => compartir(post)} className="inline-flex items-center gap-1.5 rounded-xl border border-night/20 px-3 py-1.5 text-xs font-semibold text-night transition hover:bg-night/5"><Share2Icon className="h-3.5 w-3.5" />{copiado === post.id ? 'Enlace copiado' : 'Compartir'}</button>
            </div>
            {post.imagenUrl ? <img src={post.imagenUrl} alt="" className="mb-5 max-h-80 w-full rounded-2xl object-cover object-center" /> : null}
            <div className="mb-2 flex items-center gap-2 text-xs text-ink/45">
              {post.categoria ? <span className="rounded-md bg-gold/15 px-2 py-0.5 font-bold uppercase tracking-wide text-[#8a5a12]">{post.categoria}</span> : null}
              <span className="inline-flex items-center gap-1"><CalendarDaysIcon className="h-3.5 w-3.5" />{fmtFecha(post.fechaPub)}</span>
              {post.autor ? <span>· {post.autor}</span> : null}
            </div>
            <h1 className="font-display text-2xl font-semibold leading-tight text-ink">{post.titulo}</h1>
            <div className="mt-5 text-sm"><Parrafos texto={post.contenido} /></div>
            {post.videoUrl ? (
              youtubeEmbed(post.videoUrl) ? (
                <div className="mt-6 aspect-video w-full overflow-hidden rounded-2xl border border-ink/10">
                  <iframe src={youtubeEmbed(post.videoUrl)!} title="Video" className="h-full w-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                </div>
              ) : (
                <video controls src={post.videoUrl} className="mt-6 w-full rounded-2xl border border-ink/10" />
              )
            ) : null}
            {post.galeria && post.galeria.length > 0 ? (
              <div className="mt-6">
                <h3 className="mb-2 font-display text-sm font-semibold text-ink">Galería</h3>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {post.galeria.map((g, i) => <img key={i} src={g} alt="" className="aspect-video w-full rounded-xl border border-ink/10 object-cover" />)}
                </div>
              </div>
            ) : null}
          </article>
        ) : null}

        {view === 'documentos' ? (
          <section>
            <h1 className="mb-1 font-display text-2xl font-semibold text-ink">Documentos</h1>
            <p className="mb-6 text-sm text-ink/50">Documentos públicos de la organización.</p>
            {documentos.length === 0 ? <Empty texto="No hay documentos publicados por ahora." /> : (
              <div className="space-y-2">
                {documentos.map((d) => (
                  <a key={d.id} href={d.archivoUrl || '#'} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-xl border border-ink/[0.08] bg-white px-4 py-3.5 transition hover:border-night/20">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-night/[0.06] text-night"><FileTextIcon className="h-4.5 w-4.5" /></span>
                    <span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-ink">{d.titulo}</span><span className="block truncate text-xs text-ink/50">{d.resumen}</span></span>
                    <span className="shrink-0 text-ink/40"><DownloadIcon className="h-4 w-4" /></span>
                  </a>
                ))}
              </div>
            )}
          </section>
        ) : null}

        {paginaClave ? (
          <section className="mx-auto max-w-3xl">
            <h1 className="mb-4 font-display text-2xl font-semibold text-ink">{pagina?.titulo || NAV.find((n) => n.v === view)?.label}</h1>
            {pagina?.contenido ? <div className="text-sm"><Parrafos texto={pagina.contenido} /></div> : <Empty texto="Esta sección aún no tiene contenido." />}
            {view === 'contacto' ? (
              <div className="mt-6 rounded-2xl border border-ink/[0.08] bg-white p-5 text-sm text-ink/70">
                <p className="mb-2">¿Quieres afiliarte?</p>
                <a href={afiliarseUrl} className="inline-flex items-center gap-2 rounded-xl bg-gold px-4 py-2.5 text-sm font-semibold text-night"><UserPlusIcon className="h-4 w-4" />Afíliate en línea</a>
              </div>
            ) : null}
          </section>
        ) : null}
      </main>

      <footer className="border-t border-ink/[0.08] bg-white">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-5 py-6 text-center sm:flex-row sm:text-left">
          <div className="flex items-center gap-2 text-sm text-ink/60"><GlobeIcon className="h-4 w-4 text-gold" />{org.nombre}</div>
          <p className="text-[11px] text-ink/40">con tecnología de <span className="font-semibold text-ink/55">Sindika</span></p>
        </div>
      </footer>
    </div>
  )
}

function PostGrid({ posts, onOpen, onShare, copiadoId }: { posts: PostPublico[]; onOpen: (p: PostPublico) => void; onShare: (p: PostPublico) => void; copiadoId: string }) {
  if (posts.length === 0) return <Empty texto="Aún no hay publicaciones." />
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {posts.map((p) => (
        <div key={p.id} className="flex flex-col overflow-hidden rounded-2xl border border-ink/[0.08] bg-white transition hover:border-night/20 hover:shadow-lg hover:shadow-night/5">
          <button onClick={() => onOpen(p)} className="block w-full text-left">
            <div className="h-40 bg-canvas">{p.imagenUrl ? <img src={p.imagenUrl} alt="" className="h-full w-full object-cover object-center" /> : <div className="flex h-full items-center justify-center text-ink/20"><GlobeIcon className="h-8 w-8" /></div>}</div>
            <div className="p-4 pb-2">
              <div className="mb-1 flex items-center gap-2 text-[11px] text-ink/45">
                {p.categoria ? <span className="rounded-md bg-gold/15 px-2 py-0.5 font-bold uppercase tracking-wide text-[#8a5a12]">{p.categoria}</span> : null}
                <span>{fmtFecha(p.fechaPub)}</span>
              </div>
              <h3 className="font-display text-base font-semibold leading-snug text-ink">{p.titulo}</h3>
              <p className="mt-1.5 line-clamp-3 text-xs leading-relaxed text-ink/55">{p.resumen || p.contenido}</p>
            </div>
          </button>
          <div className="mt-auto flex items-center justify-between px-4 pb-4 pt-1">
            <button onClick={() => onOpen(p)} className="inline-flex items-center gap-1 text-xs font-semibold text-night">Leer más<ArrowRightIcon className="h-3.5 w-3.5" /></button>
            <button onClick={() => onShare(p)} className="inline-flex items-center gap-1 text-xs font-semibold text-ink/45 transition hover:text-night"><Share2Icon className="h-3.5 w-3.5" />{copiadoId === p.id ? 'Copiado' : 'Compartir'}</button>
          </div>
        </div>
      ))}
    </div>
  )
}

function Slider({ slides, onOpen }: { slides: PostPublico[]; onOpen: (p: PostPublico) => void }) {
  const [i, setI] = useState(0)
  const n = slides.length
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => {
    if (n <= 1) return
    timer.current = window.setInterval(() => setI((v) => (v + 1) % n), 5000)
    return () => window.clearInterval(timer.current)
  }, [n])
  const go = (idx: number) => setI(((idx % n) + n) % n)
  const s = slides[i]
  if (!s) return null
  return (
    <section className="relative overflow-hidden rounded-3xl bg-night">
      <button onClick={() => onOpen(s)} className="block w-full text-left">
        <div className="relative h-[70vh] min-h-[440px] sm:h-[72vh]">
          <img src={s.imagenUrl || ''} alt="" className="h-full w-full object-cover object-center" />
          <div className="absolute inset-0 bg-gradient-to-t from-night/90 via-night/25 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-6 text-white sm:p-8">
            {s.categoria ? <span className="rounded-md bg-gold px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-night">{s.categoria}</span> : null}
            <h2 className="mt-2 max-w-2xl font-display text-2xl font-semibold leading-tight sm:text-3xl">{s.titulo}</h2>
            {s.resumen ? <p className="mt-1 line-clamp-2 max-w-xl text-sm text-white/75">{s.resumen}</p> : null}
          </div>
        </div>
      </button>
      {n > 1 ? (
        <>
          <button onClick={() => go(i - 1)} className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/15 p-2 text-white backdrop-blur transition hover:bg-white/25" aria-label="Anterior"><ChevronLeftIcon className="h-5 w-5" /></button>
          <button onClick={() => go(i + 1)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/15 p-2 text-white backdrop-blur transition hover:bg-white/25" aria-label="Siguiente"><ChevronRightIcon className="h-5 w-5" /></button>
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
            {slides.map((_, idx) => <button key={idx} onClick={() => go(idx)} className={`h-1.5 rounded-full transition-all ${idx === i ? 'w-5 bg-gold' : 'w-1.5 bg-white/40'}`} aria-label={`Ir a ${idx + 1}`} />)}
          </div>
        </>
      ) : null}
    </section>
  )
}

function Empty({ texto }: { texto: string }) {
  return <div className="rounded-2xl border border-dashed border-ink/20 bg-white px-6 py-12 text-center text-sm text-ink/50">{texto}</div>
}
