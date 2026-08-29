import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { Role } from './session'

// Autenticación real con Supabase. El rol de la persona vive en la tabla
// `profiles` (creada por un trigger al registrarse). 'afiliado' usa el portal;
// los demás roles son de la Junta Directiva.
export type AppRole = Role | 'afiliado'
export type Profile = { id: string; full_name: string; role: AppRole; initials: string }

type Result = { error?: string }

type AuthContextValue = {
  loading: boolean
  session: Session | null
  profile: Profile | null
  signIn: (email: string, password: string) => Promise<Result>
  signUp: (email: string, password: string, fullName: string) => Promise<Result & { needsConfirmation?: boolean }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

function initialsOf(name: string, email: string): string {
  const src = name.trim() || email
  return src.split(/[\s.@]+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase()
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)

  const loadProfile = useCallback(async (s: Session | null) => {
    if (!s?.user) { setProfile(null); return }
    const meta = (s.user.user_metadata?.full_name as string) || ''
    try {
      const { data } = await supabase.from('profiles').select('id, full_name, role').eq('id', s.user.id).maybeSingle()
      const fullName = data?.full_name || meta
      const role = (data?.role as AppRole) || 'afiliado'
      setProfile({ id: s.user.id, full_name: fullName, role, initials: initialsOf(fullName, s.user.email ?? '') })
    } catch {
      // Si la consulta falla (red/RLS), no dejamos la app colgada: perfil mínimo.
      setProfile({ id: s.user.id, full_name: meta, role: 'afiliado', initials: initialsOf(meta, s.user.email ?? '') })
    }
  }, [])

  useEffect(() => {
    let active = true
    // Desbloquea la app apenas sabemos si hay sesión; el perfil se carga aparte.
    supabase.auth.getSession()
      .then(({ data }) => {
        if (!active) return
        setSession(data.session)
        setLoading(false)
        void loadProfile(data.session)
      })
      .catch(() => { if (active) setLoading(false) })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
      void loadProfile(s)
    })
    return () => { active = false; sub.subscription.unsubscribe() }
  }, [loadProfile])

  const signIn = useCallback(async (email: string, password: string): Promise<Result> => {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    return error ? { error: translate(error.message) } : {}
  }, [])

  const signUp = useCallback(async (email: string, password: string, fullName: string) => {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { full_name: fullName.trim(), role: 'afiliado' } },
    })
    if (error) return { error: translate(error.message) }
    // Si el proyecto exige confirmación de correo, no hay sesión todavía.
    return { needsConfirmation: !data.session }
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    setProfile(null)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({ loading, session, profile, signIn, signUp, signOut }),
    [loading, session, profile, signIn, signUp, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}

// Traduce los mensajes de error más comunes de Supabase Auth.
function translate(msg: string): string {
  const m = msg.toLowerCase()
  if (m.includes('invalid login credentials')) return 'Correo o contraseña incorrectos.'
  if (m.includes('email not confirmed')) return 'Debes confirmar tu correo antes de ingresar.'
  if (m.includes('user already registered')) return 'Ya existe una cuenta con ese correo.'
  if (m.includes('password should be at least')) return 'La contraseña debe tener al menos 6 caracteres.'
  if (m.includes('unable to validate email')) return 'Correo no válido.'
  return msg
}
