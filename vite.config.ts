import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Static build, portable to any static host (k3s nginx, Azure Static Web Apps, ...).
export default defineConfig({
  plugins: [react()],
  base: '/',
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 700,
  },
  server: {
    host: true,
    port: 5173,
  },
})
