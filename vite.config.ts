import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // New versions install in the background and take over on the next visit.
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Gursch',
        short_name: 'Gursch',
        description: 'Scorekeeping for the card game Gursch',
        lang: 'en',
        start_url: '/',
        display: 'standalone',
        background_color: '#f6f5f1',
        theme_color: '#1f6f54',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Precache the whole build, including the lazily loaded Firebase chunk, so the app opens offline.
        globPatterns: ['**/*.{js,css,html,svg,png}'],
        navigateFallback: '/index.html',
        // Firebase's own sign-in helper pages must never be answered from the cache.
        navigateFallbackDenylist: [/^\/__\//],
      },
    }),
  ],
  server: { host: true, port: 5173 },
  test: { include: ['src/**/*.test.ts'] },
})
