// Subida y descarga de archivos de soporte (facturas/recibos) en Supabase Storage.
import { supabase } from '../lib/supabase'

const BUCKET = 'soportes'

// Sube un archivo y devuelve su ruta dentro del bucket (para guardar en la BD).
export async function subirSoporte(folder: string, file: File): Promise<string> {
  const safe = file.name.replace(/[^\w.\-]+/g, '_')
  const path = `${folder}/${Date.now()}-${safe}`
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: false })
  if (error) throw error
  return path
}

// Abre un soporte en una pestaña nueva mediante una URL firmada temporal.
export async function abrirSoporte(path: string): Promise<void> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 120)
  if (error || !data?.signedUrl) return
  window.open(data.signedUrl, '_blank', 'noopener')
}

// Nombre visible del archivo a partir de su ruta.
export function nombreSoporte(path: string): string {
  const base = path.split('/').pop() ?? path
  return base.replace(/^\d+-/, '')
}
