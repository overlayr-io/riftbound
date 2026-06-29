import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './assets/main.css'
import { auth } from './firebase'
import { publicApi } from './services/publicApi'

declare const __APP_VERSION__: string

const pinia = createPinia()
const app = createApp(App)
app.use(pinia)
app.use(router)

// Logger d'erreurs client léger (throttlé : 1 envoi / 10 s, only si authentifié).
let lastErrorAt = 0
function reportError(message: string, stack?: string) {
  const now = Date.now()
  if (now - lastErrorAt < 10_000 || !auth.currentUser) return
  lastErrorAt = now
  publicApi.reportError({
    message, stack,
    path: window.location.pathname,
    clientVersion: typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev',
  }).catch(() => { /* best-effort */ })
}

// Erreur Vue component : redirection vers /welcome sans déconnexion.
let vueErrorCooldown = false
app.config.errorHandler = (err) => {
  const e = err as Error
  console.error('[App error]', e)
  reportError(e?.message ?? 'Vue error', e?.stack)
  if (!vueErrorCooldown && router.currentRoute.value.name !== 'welcome') {
    vueErrorCooldown = true
    router.push('/welcome').finally(() => {
      setTimeout(() => { vueErrorCooldown = false }, 5000)
    })
  }
}

// Grosse erreur non catchée : déconnexion + redirection.
let fatalErrorCooldown = false
window.addEventListener('unhandledrejection', async (ev) => {
  reportError(`Unhandled rejection: ${ev.reason?.message ?? ev.reason}`, ev.reason?.stack)
  if (fatalErrorCooldown) return
  fatalErrorCooldown = true
  try {
    const { useAuthStore } = await import('./stores/auth')
    await useAuthStore().signOut()
  } catch { /* best-effort */ }
  router.push('/welcome').finally(() => {
    setTimeout(() => { fatalErrorCooldown = false }, 5000)
  })
})

app.mount('#app')
