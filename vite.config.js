import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: [],
      manifest: {
        name: 'Chai Wala Babu',
        short_name: 'Chai Wala',
        description: 'Order chai and snacks at Chai Wala Babu',
        theme_color: '#b45309',
        background_color: '#fffbeb',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: '/pwa-icon.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any',
          },
        ],
      },
      workbox: {
        sourcemap: false,
        // Activate new SW immediately and wipe outdated precaches so users
        // never get stuck on stale JS chunks after a redeploy.
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // Make sure the SW never tries to handle Supabase API/realtime traffic
        // as a navigation fallback (those are JSON/WebSocket endpoints, not pages).
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [
          /^\/rest\/v1\//,
          /^\/auth\/v1\//,
          /^\/realtime\//,
          /^\/storage\/v1\//,
        ],
        runtimeCaching: [
          // Static images, styles, and fonts (chunks are precached by globPatterns).
          // Note: we deliberately DO NOT cache /rest/v1/* — that's real-time
          // application data and React Query already handles caching. Caching
          // Supabase REST in the SW added a 4 s timeout on every request and
          // returned stale rows that conflicted with realtime updates.
          {
            urlPattern: ({ request }) =>
              ['style', 'image', 'font'].includes(request.destination),
            handler: 'CacheFirst',
            options: {
              cacheName: 'static-assets',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
            },
          },
          {
            urlPattern: ({ url }) =>
              url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com',
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
            },
          },
        ],
      },
    }),
  ],
  server: {
    host: true,
    port: 5173,
    open: true,
    allowedHosts: ['localhost', '.ngrok-free.app', '.ngrok.io'],
  },
  build: {
    cssCodeSplit: true,
    target: 'es2022',
    sourcemap: false,
    reportCompressedSize: true,
    chunkSizeWarningLimit: 650,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          if (id.includes('@tanstack/react-query')) return 'tanstack-query'
          if (id.includes('@supabase')) return 'vendor-supabase'
          if (id.includes('lucide-react')) return 'vendor-lucide'
          if (id.includes('react-router')) return 'vendor-router'
          if (id.includes('zustand')) return 'vendor-zustand'
          if (
            id.includes('node_modules/react-dom') ||
            id.includes('node_modules/react/') ||
            id.includes('node_modules\\react\\') ||
            id.includes('node_modules\\react-dom') ||
            id.includes('scheduler')
          ) {
            return 'vendor-react'
          }
        },
      },
    },
  },
})
