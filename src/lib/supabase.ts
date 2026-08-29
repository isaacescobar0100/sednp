import { createClient } from '@supabase/supabase-js'

// Cliente único de Supabase para toda la app.
// Las credenciales vienen de variables de entorno de Vite (.env):
//   VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

if (!url || !anonKey) {
  // No lanzamos error para no romper el build; avisamos en consola.
  console.warn('[Supabase] Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY en .env')
}

export const supabase = createClient(url ?? '', anonKey ?? '', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})

export const hasSupabase = Boolean(url && anonKey)
