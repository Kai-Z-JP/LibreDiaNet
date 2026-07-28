import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { gtfsLoaderPlugin } from '@gtfs-jp/loader/vite'
import type { Connect, Plugin } from 'vite'

const FIREBASE_AUTH_PATH = '/firebase-auth'

function crossOriginIsolationHeaders(): Plugin {
  const install = (middlewares: Connect.Server) => {
    middlewares.use((request, response, next) => {
      const pathname = new URL(request.url ?? '/', 'http://localhost').pathname
      if (pathname !== FIREBASE_AUTH_PATH) {
        response.setHeader('Cross-Origin-Opener-Policy', 'same-origin')
        response.setHeader('Cross-Origin-Embedder-Policy', 'require-corp')
      }
      next()
    })
  }

  return {
    name: 'libre-dianet-cross-origin-isolation',
    configureServer(server) {
      install(server.middlewares)
    },
    configurePreviewServer(server) {
      install(server.middlewares)
    },
  }
}

export default defineConfig({
  base: process.env.VITE_BASE ?? '/',
  plugins: [crossOriginIsolationHeaders(), react(), gtfsLoaderPlugin()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/testSetup.ts',
  },
})
