import { defineConfig } from 'vite'
import { readFileSync } from 'fs'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'
import basicSsl from '@vitejs/plugin-basic-ssl'

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'))

// https://vite.dev/config/
export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __APP_RELEASE_URL__: JSON.stringify(
      `https://github.com/plamarque/chrono-eps/releases/tag/v${pkg.version}`
    )
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['vitest.setup.js']
  },
  base: '/chrono-eps/',
  plugins: [
    basicSsl(),
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Chrono EPS',
        short_name: 'Chrono EPS',
        description: 'Chronomètre multi-élèves pour les enseignants d\'EPS',
        theme_color: '#2563eb',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/chrono-eps/',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,svg}', 'pwa-192x192.png'],
        cleanupOutdatedCaches: true,
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024
      }
    })
  ],
  server: {
    https: true,
    host: true
  }
})
