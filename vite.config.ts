import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // Librerías pesadas en chunks propios: quedan en caché de largo plazo y
        // no re-descargan cuando cambia el código de la app.
        manualChunks: {
          recharts: ['recharts'],
          supabase: ['@supabase/supabase-js'],
          motion: ['framer-motion'],
        },
      },
    },
  },
})
