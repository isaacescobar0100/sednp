// Catálogos (datos maestros) administrables desde el módulo Parámetros:
// cargos, dependencias y tipos de vinculación. Se guardan en el store y
// persisten en localStorage. El formulario de afiliación los lee de aquí.

import { DEPENDENCIES, ROLES } from './affiliates'

export type VinculacionType = { id: string; name: string; color: string }

// Paleta para asignar color a los tipos de vinculación nuevos.
export const CATALOG_PALETTE = ['#0F1B3D', '#C9973B', '#B23A3A', '#3D5AAE', '#2E7D5B', '#7A5195', '#EF7B45', '#4E6E81']

export function seedCargos(): string[] {
  return [...ROLES]
}

export function seedDependencias(): string[] {
  return [...DEPENDENCIES]
}

// Tipos de vinculación laboral según el Art. 5, literal b) de los Estatutos.
export function seedVinculaciones(): VinculacionType[] {
  return [
    { id: 'vin-carrera', name: 'Carrera administrativa', color: '#0F1B3D' },
    { id: 'vin-provisional', name: 'Provisionalidad', color: '#C9973B' },
    { id: 'vin-lnr', name: 'Libre nombramiento y remoción', color: '#B23A3A' },
    { id: 'vin-prueba', name: 'Periodo de prueba', color: '#3D5AAE' },
    { id: 'vin-temporal', name: 'Planta temporal', color: '#2E7D5B' },
  ]
}

export function nextVinculacionColor(existing: VinculacionType[]): string {
  return CATALOG_PALETTE[existing.length % CATALOG_PALETTE.length]
}
