import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Same routing as nginx.conf in Docker: ingestion (Spring Boot) and core API (FastAPI)
    proxy: {
      '/api/v1/ingest': 'http://localhost:8081',
      '/api/v1': 'http://localhost:8000',
      '/api': 'http://localhost:8000',
    },
  },
})
