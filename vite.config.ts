import path from 'node:path'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'


// https://vite.dev/config/
// Konfigurasi Vitest ada di vitest.config.ts; uji Edge Function berjalan dengan 'deno test' (PRD bagian 2).
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(fileURLToPath(new URL('./src', import.meta.url))),
    },
  },
})
