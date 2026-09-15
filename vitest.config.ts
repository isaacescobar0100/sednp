import { defineConfig } from 'vitest/config'

// Configuración de tests (Vitest). Solo prueba lógica pura de src/store/*.
// jsdom da un `window` para las funciones que leen el host (aislamiento por dominio).
export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts'],
  },
})
