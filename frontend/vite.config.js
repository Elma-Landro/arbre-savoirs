import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Vite config : proxy /api vers le backend FastAPI (port 8000).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
  },
})
