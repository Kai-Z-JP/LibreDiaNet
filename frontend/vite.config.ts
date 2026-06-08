import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { gtfsLoaderPlugin } from '@gtfs-jp/loader/vite'

export default defineConfig({
  base: process.env.VITE_BASE ?? '/',
  plugins: [react(), gtfsLoaderPlugin()],
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
  preview: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/testSetup.ts',
  },
})
