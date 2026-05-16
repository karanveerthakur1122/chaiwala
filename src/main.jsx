import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import './index.css'

/**
 * Service worker hygiene:
 * - `immediate: true` registers right away so the SW can pre-cache shell.
 * - `onNeedRefresh` fires when a new build is waiting; we silently activate it
 *   and reload so users never get stuck on stale JS chunks (the classic
 *   "the page froze, but a reload fixes it" symptom).
 * - `onRegisterError` surfaces SW failures in the console for diagnostics.
 */
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    void updateSW(true)
  },
  onOfflineReady() {
    if (import.meta.env.DEV) {
      console.info('[pwa] Ready to work offline')
    }
  },
  onRegisterError(err) {
    console.error('[pwa] Service worker registration failed:', err)
  },
})

if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    console.error('[unhandledrejection]', event.reason)
  })
  window.addEventListener('error', (event) => {
    if (event.error) console.error('[window.error]', event.error)
  })
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
)
