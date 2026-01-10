import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
  },
  // Cambia esto según tu repositorio
  base: '/Control-Facturas/', // Solo el nombre del repositorio
  build: {
    outDir: 'dist',
    sourcemap: true,
  }
})