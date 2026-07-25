import React, { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { ModuleKey } from '../types/navigation'

// Sesión y roles de la demo. No hay autenticación real: el rol se elige al
// entrar y se puede cambiar en caliente desde el header para mostrar la
// separación de funciones (quien registra ≠ quien aprueba).

export type Role = 'secretaria' | 'tesoreria' | 'fiscal' | 'presidencia'

// Permisos por módulo. Se van sumando a medida que activamos módulos.
export type Permission =
  | 'affiliates.create'
  | 'affiliates.changeStatus'
  | 'finance.create'
  | 'finance.approve'
  | 'finance.pay'
  | 'discipline.instruct'
  | 'discipline.rule'
  | 'governance.manage'
  | 'governance.close'
  | 'documents.manage'
  | 'comms.send'
  | 'committees.manage'
  | 'params.manage'

export const roles: Role[] = ['secretaria', 'tesoreria', 'fiscal', 'presidencia']

export const roleLabel: Record<Role, string> = {
  secretaria: 'Secretaría General',
  tesoreria: 'Tesorería',
  fiscal: 'Fiscal disciplinario',
  presidencia: 'Presidencia',
}

export const roleSummary: Record<Role, string> = {
  secretaria: 'Registra afiliados y gestiona la organización. No aprueba afiliaciones.',
  tesoreria: 'Registra ingresos y egresos. No aprueba gastos.',
  fiscal: 'Instruye expedientes. No dicta el fallo.',
  presidencia: 'Supervisa, aprueba afiliaciones y gastos, y dicta fallos.',
}

const rolePermissions: Record<Role, Permission[]> = {
  secretaria: ['affiliates.create', 'governance.manage', 'documents.manage', 'comms.send', 'committees.manage', 'params.manage'],
  tesoreria: ['finance.create', 'finance.pay'],
  fiscal: ['discipline.instruct'],
  presidencia: ['affiliates.create', 'affiliates.changeStatus', 'finance.approve', 'discipline.rule', 'governance.manage', 'governance.close', 'documents.manage', 'comms.send', 'committees.manage', 'params.manage'],
}

// Módulos visibles en el menú por rol. Presidencia ve todo; los demás solo lo
// que les compete. Financiero y Disciplinario quedan reservados para Tesorería
// y Fiscal (roles que se sumarán al activar esos módulos).
const roleModules: Record<Role, ModuleKey[]> = {
  secretaria: ['dashboard', 'afiliacion', 'gobernanza', 'comites', 'comunicaciones', 'documental', 'reportes', 'parametros'],
  tesoreria: ['dashboard', 'financiero', 'reportes'],
  fiscal: ['dashboard', 'disciplinario', 'reportes'],
  presidencia: ['dashboard', 'afiliacion', 'financiero', 'gobernanza', 'disciplinario', 'comites', 'comunicaciones', 'documental', 'reportes', 'parametros'],
}

type DemoUser = { name: string; initials: string }

const roleUser: Record<Role, DemoUser> = {
  secretaria: { name: 'Ana Sofía Méndez', initials: 'AM' },
  tesoreria: { name: 'Jorge Iván Salcedo', initials: 'JS' },
  fiscal: { name: 'Ricardo León Guerrero', initials: 'RG' },
  presidencia: { name: 'María Fernanda Rojas', initials: 'MR' },
}

type SessionContextValue = {
  role: Role
  user: DemoUser
  setRole: (role: Role) => void
  can: (permission: Permission) => boolean
  modules: ModuleKey[]
  canSeeModule: (module: ModuleKey) => boolean
}

const SessionContext = createContext<SessionContextValue | null>(null)

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<Role>('secretaria')

  const can = useCallback((permission: Permission) => rolePermissions[role].includes(permission), [role])
  const canSeeModule = useCallback((module: ModuleKey) => roleModules[role].includes(module), [role])

  const value = useMemo<SessionContextValue>(
    () => ({ role, user: roleUser[role], setRole, can, modules: roleModules[role], canSeeModule }),
    [role, can, canSeeModule],
  )

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error('useSession debe usarse dentro de <SessionProvider>')
  return ctx
}
