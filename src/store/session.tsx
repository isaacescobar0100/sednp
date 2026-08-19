import React, { createContext, useCallback, useContext, useMemo, useState } from 'react'
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

// Módulos visibles en el menú por rol. Presidencia y Vicepresidencia supervisan
// (ven todo). El Fiscal ve Financiero (control de cuentas) además de lo suyo.
const roleModules: Record<Role, ModuleKey[]> = {
  presidencia: ['dashboard', 'afiliacion', 'financiero', 'gobernanza', 'disciplinario', 'comites', 'comunicaciones', 'documental', 'reportes', 'parametros'],
  vicepresidencia: ['dashboard', 'afiliacion', 'financiero', 'gobernanza', 'disciplinario', 'comites', 'comunicaciones', 'documental', 'reportes', 'parametros'],
  secretaria: ['dashboard', 'afiliacion', 'gobernanza', 'comites', 'comunicaciones', 'documental', 'reportes', 'parametros'],
  tesoreria: ['dashboard', 'financiero', 'reportes'],
  fiscal: ['dashboard', 'afiliacion', 'financiero', 'disciplinario', 'reportes'],
}

type DemoUser = { name: string; initials: string }

// Junta Directiva Nacional real (Resolución No. 011 de 2026).
const roleUser: Record<Role, DemoUser> = {
  presidencia: { name: 'Heisson G. Cifuentes Meneses', initials: 'HC' },
  vicepresidencia: { name: 'Zulay Olarte Bermúdez', initials: 'ZO' },
  secretaria: { name: 'Ludy Maritza Montoya Roberto', initials: 'LM' },
  tesoreria: { name: 'Lina María Ocampo Palacio', initials: 'LO' },
  fiscal: { name: 'Nini Dahyana Idarraga Garay', initials: 'NI' },
}

// Junta Directiva Nacional (Art. 13): cada cargo tiene principal y suplente.
// Los principales provienen de la Resolución 011; los suplentes se designan.
export const juntaDirectiva = roles.map((r) => ({
  cargo: roleLabel[r],
  principal: roleUser[r].name,
  suplente: 'Por designar',
}))

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
