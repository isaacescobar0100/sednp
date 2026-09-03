import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { Role } from './session'

// Autenticación real con Supabase. El rol de la persona vive en la tabla
// `profiles` (creada por un trigger al registrarse). 'afiliado' usa el portal;
// los demás roles son de la Junta Directiva.
export type AppRole = Role | 'afiliado'
export type Profile = { id: string; full_name: string; role: AppRole; initials: string; platformAdmin: boolean }
// Marca del sindicato al que pertenece la persona (multi-sindicato / SaaS).
export type Org = { nombre: string; logoUrl: string | null }

type Result = { error?: string }

type AuthContextValue = {
  loading: boolean
  session: Session | null
  profile: Profile | null
  org: Org | null              // sindicato actual (nombre + logo) para la marca
  needsMfa: boolean            // hay sesión pero falta el 2do factor (código de la app)
  refreshMfa: () => Promise<void>
  signIn: (email: string, password: string, captchaToken?: string) => Promise<Result>
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
  const [org, setOrg] = useState<Org | null>(null)
  const [needsMfa, setNeedsMfa] = useState(false)

  // ¿La cuenta tiene 2FA activo y aún no ha pasado el segundo factor?
  const refreshMfa = useCallback(async () => {
    try {
      const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
      setNeedsMfa(data?.currentLevel === 'aal1' && data?.nextLevel === 'aal2')
    } catch {
      setNeedsMfa(false)
    }
  }, [])

  const loadProfile = useCallback(async (s: Session | null) => {
    if (!s?.user) { setProfile(null); setOrg(null); return }
    const meta = (s.user.user_metadata?.full_name as string) || ''
    try {
      const { data } = await supabase.from('profiles').select('id, full_name, role, platform_admin').eq('id', s.user.id).maybeSingle()
      const fullName = data?.full_name || meta
      const role = (data?.role as AppRole) || 'afiliado'
      setProfile({ id: s.user.id, full_name: fullName, role, initials: initialsOf(fullName, s.user.email ?? ''), platformAdmin: Boolean(data?.platform_admin) })
      // Marca del sindicato (RLS devuelve solo la organización del usuario).
      try {
        const { data: o } = await supabase.from('organizations').select('nombre, logo_url').maybeSingle()
        setOrg(o ? { nombre: o.nombre as string, logoUrl: (o.logo_url as string | null) ?? null } : null)
      } catch { setOrg(null) }
    } catch {
      // Si la consulta falla (red/RLS), no dejamos la app colgada: perfil mínimo.
      setProfile({ id: s.user.id, full_name: meta, role: 'afiliado', initials: initialsOf(meta, s.user.email ?? ''), platformAdmin: false })
      setOrg(null)
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
        if (data.session) void refreshMfa()
      })
      .catch(() => { if (active) setLoading(false) })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
      void loadProfile(s)
      if (s) void refreshMfa(); else setNeedsMfa(false)
    })
    return () => { active = false; sub.subscription.unsubscribe() }
  }, [loadProfile, refreshMfa])

  const signIn = useCallback(async (email: string, password: string, captchaToken?: string): Promise<Result> => {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
      options: captchaToken ? { captchaToken } : undefined,
    })
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
    setOrg(null)
    setNeedsMfa(false)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({ loading, session, profile, org, needsMfa, refreshMfa, signIn, signUp, signOut }),
    [loading, session, profile, org, needsMfa, refreshMfa, signIn, signUp, signOut],
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
  if (m.includes('captcha')) return 'No se pudo validar el CAPTCHA. Vuelve a intentarlo.'
  return msg
}
