import React, { createContext, useCallback, useContext, useMemo } from 'react'
import { ModuleKey } from '../types/navigation'

// Sesión y roles de la demo. No hay autenticación real: el rol se elige al
// entrar y se puede cambiar en caliente desde el header para mostrar la
// separación de funciones (quien registra ≠ quien aprueba).

export type Role = 'presidencia' | 'vicepresidencia' | 'secretaria' | 'tesoreria' | 'fiscal'

// Permisos por módulo. Se van sumando a medida que activamos módulos.
export type Permission =
  | 'affiliates.create'
  | 'affiliates.changeStatus'
  | 'affiliates.concept'
  | 'finance.create'
  | 'finance.approve'
  | 'finance.pay'
  | 'finance.sign'
  | 'discipline.instruct'
  | 'discipline.rule'
  | 'governance.manage'
  | 'governance.close'
  | 'documents.manage'
  | 'comms.send'
  | 'committees.manage'
  | 'params.manage'

export const roles: Role[] = ['presidencia', 'vicepresidencia', 'secretaria', 'tesoreria', 'fiscal']

// Junta Directiva Nacional (Art. 13): Presidente, Vicepresidente, Secretario
// general, Tesorero y Fiscal.
export const roleLabel: Record<Role, string> = {
  presidencia: 'Presidencia',
  vicepresidencia: 'Vicepresidencia',
  secretaria: 'Secretaría General',
  tesoreria: 'Tesorería',
  fiscal: 'Fiscal',
}

export const roleSummary: Record<Role, string> = {
  presidencia: 'Representación legal. Aprueba afiliaciones y gastos, y dicta decisiones.',
  vicepresidencia: 'Reemplaza a la Presidencia y apoya la dirección. Supervisa.',
  secretaria: 'Registra afiliados y gestiona la organización. No aprueba afiliaciones.',
  tesoreria: 'Registra ingresos y egresos. No aprueba gastos.',
  fiscal: 'Control financiero y de legalidad; emite conceptos y refrenda cuentas.',
}

const rolePermissions: Record<Role, Permission[]> = {
  presidencia: ['affiliates.create', 'affiliates.changeStatus', 'finance.approve', 'finance.sign', 'discipline.rule', 'governance.manage', 'governance.close', 'documents.manage', 'comms.send', 'committees.manage', 'params.manage'],
  vicepresidencia: ['governance.manage'],
  secretaria: ['affiliates.create', 'governance.manage', 'documents.manage', 'comms.send', 'committees.manage', 'params.manage'],
  tesoreria: ['finance.create', 'finance.pay', 'finance.sign'],
  fiscal: ['discipline.instruct', 'finance.sign', 'affiliates.concept'],
}

// Todos los cargos de la directiva VEN todos los módulos (vista completa de la
// organización). Lo que cambia por rol es qué puede MODIFICAR: crear, editar,
// borrar o aprobar está controlado por permisos (rolePermissions / can()), no
// por la visibilidad del módulo. Así, quien no tiene el permiso ve la
// información pero en modo solo lectura.
const allModules: ModuleKey[] = ['dashboard', 'afiliacion', 'financiero', 'gobernanza', 'disciplinario', 'comites', 'comunicaciones', 'documental', 'libro', 'publicaciones', 'reportes', 'parametros']
const roleModules: Record<Role, ModuleKey[]> = {
  presidencia: allModules,
  vicepresidencia: allModules,
  secretaria: allModules,
  tesoreria: allModules,
  fiscal: allModules,
}

type DemoUser = { name: string; initials: string }

// Etiqueta genérica por cargo (respaldo cuando la sesión no trae el nombre real
// del perfil). No contiene nombres de personas: cada sindicato tiene los suyos.
const roleUser: Record<Role, DemoUser> = {
  presidencia: { name: 'Presidencia', initials: 'PR' },
  vicepresidencia: { name: 'Vicepresidencia', initials: 'VP' },
  secretaria: { name: 'Secretaría', initials: 'SE' },
  tesoreria: { name: 'Tesorería', initials: 'TE' },
  fiscal: { name: 'Fiscalía', initials: 'FI' },
}

// Composición de la Junta Directiva: cada cargo con principal y suplente.
// Los nombres los designa cada sindicato (no vienen precargados).
export const juntaDirectiva = roles.map((r) => ({
  cargo: roleLabel[r],
  principal: 'Por designar',
  suplente: 'Por designar',
}))

type SessionContextValue = {
  role: Role
  user: DemoUser
  can: (permission: Permission) => boolean
  modules: ModuleKey[]
  canSeeModule: (module: ModuleKey) => boolean
}

const SessionContext = createContext<SessionContextValue | null>(null)

// El rol viene del perfil autenticado (Supabase). Cada persona opera con su rol.
export function SessionProvider({ role, userName, children }: { role: Role; userName?: string; children: React.ReactNode }) {
  const can = useCallback((permission: Permission) => rolePermissions[role].includes(permission), [role])
  const canSeeModule = useCallback((module: ModuleKey) => roleModules[role].includes(module), [role])

  const user = useMemo<DemoUser>(() => {
    const base = roleUser[role]
    if (!userName) return base
    const initials = userName.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase()
    return { name: userName, initials: initials || base.initials }
  }, [role, userName])

  const value = useMemo<SessionContextValue>(
    () => ({ role, user, can, modules: roleModules[role], canSeeModule }),
    [role, user, can, canSeeModule],
  )

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error('useSession debe usarse dentro de <SessionProvider>')
  return ctx
}
