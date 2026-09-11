// Página Web / CMS: publicaciones (artículos, anuncios, páginas fijas).
import { supabase } from '../lib/supabase'

export type PubTipo = 'articulo' | 'anuncio' | 'pagina' | 'documento'
export type PubEstado = 'borrador' | 'publicado'

export type Publicacion = {
  id: string
  tipo: PubTipo
  clave: string
  titulo: string
  resumen: string
  contenido: string
  categoria: string
  imagenUrl: string
  videoUrl: string
  galeria: string[]
  destacado: boolean
  archivoUrl: string
  estado: PubEstado
  fechaPub?: string
  autor: string
}

type Row = {
  id: string
  tipo: PubTipo
  clave: string | null
  titulo: string | null
  resumen: string | null
  contenido: string | null
  categoria: string | null
  imagen_url: string | null
  video_url: string | null
  galeria: string[] | null
  destacado: boolean | null
  archivo_url: string | null
  estado: PubEstado
  fecha_pub: string | null
  autor: string | null
}

function rowToPub(r: Row): Publicacion {
  return {
    id: r.id,
    tipo: r.tipo,
    clave: r.clave ?? '',
    titulo: r.titulo ?? '',
    resumen: r.resumen ?? '',
    contenido: r.contenido ?? '',
    categoria: r.categoria ?? '',
    imagenUrl: r.imagen_url ?? '',
    videoUrl: r.video_url ?? '',
    galeria: Array.isArray(r.galeria) ? r.galeria : [],
    destacado: Boolean(r.destacado),
    archivoUrl: r.archivo_url ?? '',
    estado: r.estado,
    fechaPub: r.fecha_pub ?? undefined,
    autor: r.autor ?? '',
  }
}

function pubToRow(p: Partial<Publicacion>): Record<string, unknown> {
  const row: Record<string, unknown> = {}
  const set = (k: string, v: unknown) => { if (v !== undefined) row[k] = v }
  set('tipo', p.tipo); set('clave', p.clave); set('titulo', p.titulo); set('resumen', p.resumen)
  set('contenido', p.contenido); set('categoria', p.categoria); set('imagen_url', p.imagenUrl)
  set('video_url', p.videoUrl); set('galeria', p.galeria); set('destacado', p.destacado); set('archivo_url', p.archivoUrl)
  set('estado', p.estado); set('fecha_pub', p.fechaPub); set('autor', p.autor)
  return row
}

// --- Administración (directiva) ---------------------------------------------
export async function fetchPublicaciones(): Promise<Publicacion[]> {
  const { data, error } = await supabase.from('publicaciones').select('*').order('updated_at', { ascending: false })
  if (error) throw error
  return (data as Row[]).map(rowToPub)
}

export async function insertPublicacion(p: Partial<Publicacion>): Promise<Publicacion> {
  const { data, error } = await supabase.from('publicaciones').insert(pubToRow(p)).select().single()
  if (error) throw error
  return rowToPub(data as Row)
}

export async function updatePublicacion(id: string, p: Partial<Publicacion>): Promise<void> {
  const { error } = await supabase.from('publicaciones').update({ ...pubToRow(p), updated_at: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}

export async function deletePublicacion(id: string): Promise<void> {
  const { error } = await supabase.from('publicaciones').delete().eq('id', id)
  if (error) throw error
}

// --- Lectura pública (anónima, vía RPC) -------------------------------------
export type PostPublico = {
  id: string; tipo: PubTipo; clave: string | null; titulo: string; resumen: string
  contenido: string; categoria: string; imagenUrl: string | null; fechaPub: string | null; autor: string
  videoUrl?: string | null; galeria?: string[] | null; destacado?: boolean; archivoUrl?: string | null
}

export async function fetchPostsPublicos(slug: string, tipo?: PubTipo): Promise<PostPublico[]> {
  const { data, error } = await supabase.rpc('posts_publicos', { p_slug: slug, p_tipo: tipo ?? null })
  if (error || !Array.isArray(data)) return []
  return data as PostPublico[]
}

export async function fetchPaginaPublica(slug: string, clave: string): Promise<{ titulo?: string; contenido?: string; imagenUrl?: string } | null> {
  const { data, error } = await supabase.rpc('pagina_publica', { p_slug: slug, p_clave: clave })
  if (error || !data) return null
  return data as { titulo?: string; contenido?: string; imagenUrl?: string }
}
