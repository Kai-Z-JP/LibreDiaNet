import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { gtfsLoaderPlugin } from '@gtfs-jp/loader/vite'

export default defineConfig({
  plugins: [react(), gtfsLoaderPlugin()],
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
    proxy: {
      '/api': 'http://127.0.0.1:9090',
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
