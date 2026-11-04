import { defineConfig } from 'vitest/config'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  test: {
    environment: 'jsdom',
    // Uji Edge Function dijalankan dengan 'deno test', bukan Vitest (PRD bagian 2).
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
  resolve: {
    alias: {
      '@': path.resolve(fileURLToPath(new URL('./src', import.meta.url))),
    },
  },
})
