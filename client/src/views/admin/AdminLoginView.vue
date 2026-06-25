<script setup lang="ts">
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import '@/assets/admin.css'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref<string | null>(null)

function redirectAfterLogin() {
  if (!auth.isAdmin) {
    error.value = "Ce compte n'a aucun accès admin."
    return
  }
  const target = typeof route.query.redirect === 'string' ? route.query.redirect : '/admin'
  router.push(target)
}

async function onEmailLogin() {
  loading.value = true
  error.value = null
  try {
    await auth.signInWithEmail(email.value.trim(), password.value)
    redirectAfterLogin()
  } catch {
    error.value = 'Identifiants invalides.'
  } finally {
    loading.value = false
  }
}

async function onGoogleLogin() {
  loading.value = true
  error.value = null
  try {
    await auth.signInWithGoogle()
    redirectAfterLogin()
  } catch {
    error.value = 'Connexion Google échouée.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="adm login-root">
    <div class="adm-bg" />

    <!-- Ornements d'angle -->
    <div class="corner corner--tl" />
    <div class="corner corner--tr" />
    <div class="corner corner--bl" />
    <div class="corner corner--br" />

    <div class="adm-card card">
      <div class="head">
        <div class="brand-mark">RIFTBOUND TCG</div>
        <div class="adm-ornament"><span>◆</span></div>
        <div class="adm-eyebrow">Backoffice</div>
        <p class="subtitle">Accès réservé aux administrateurs</p>
      </div>

      <form @submit.prevent="onEmailLogin">
        <label class="adm-label">Email
          <input v-model="email" class="adm-input" type="email" autocomplete="username" placeholder="admin@overlayr.fr" required />
        </label>
        <label class="adm-label">Mot de passe
          <input v-model="password" class="adm-input" type="password" autocomplete="current-password" placeholder="••••••••" required />
        </label>
        <button type="submit" class="adm-btn adm-btn--primary full" :disabled="loading">
          {{ loading ? 'Connexion…' : 'Se connecter' }}
        </button>
      </form>

      <div class="divider"><span>ou</span></div>

      <button class="adm-btn adm-btn--ghost full" :disabled="loading" @click="onGoogleLogin">
        <svg viewBox="0 0 24 24" width="16" height="16"><path fill="#fff" d="M12 11v2.8h4a3.9 3.9 0 01-4 3 4.3 4.3 0 010-8.6 4 4 0 012.7 1l2-2A7.2 7.2 0 1012 19.3a6.7 6.7 0 007-7 8 8 0 00-.1-1.3z"/></svg>
        Continuer avec Google
      </button>

      <transition name="fade">
        <p v-if="error" class="error">{{ error }}</p>
      </transition>
    </div>
  </div>
</template>

<style scoped>
.login-root {
  position: relative;
  width: 100vw;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--adm-bg);
  overflow: hidden;
}
.corner {
  position: absolute;
  width: 64px;
  height: 64px;
  opacity: 0.55;
  pointer-events: none;
}
.corner--tl { top: 2rem; left: 2rem; border-top: 1.5px solid var(--adm-gold); border-left: 1.5px solid var(--adm-gold); }
.corner--tr { top: 2rem; right: 2rem; border-top: 1.5px solid var(--adm-gold); border-right: 1.5px solid var(--adm-gold); }
.corner--bl { bottom: 2rem; left: 2rem; border-bottom: 1.5px solid var(--adm-gold); border-left: 1.5px solid var(--adm-gold); }
.corner--br { bottom: 2rem; right: 2rem; border-bottom: 1.5px solid var(--adm-gold); border-right: 1.5px solid var(--adm-gold); }

.card {
  position: relative;
  z-index: 1;
  width: 380px;
  padding: 2.25rem 2.1rem;
}
.head { text-align: center; margin-bottom: 1.75rem; }
.brand-mark {
  font-size: 1.5rem;
  font-weight: 900;
  letter-spacing: 0.14em;
  background: var(--adm-gold-grad);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  filter: drop-shadow(0 0 20px rgba(200, 170, 110, 0.2));
}
.head .adm-ornament { margin: 0.7rem 0 0.6rem; }
.subtitle { color: var(--adm-text-dim); font-size: 0.8rem; margin: 0.6rem 0 0; }
form { display: flex; flex-direction: column; gap: 0.85rem; }
.full { width: 100%; padding-top: 0.7rem; padding-bottom: 0.7rem; margin-top: 0.3rem; }
.divider {
  display: flex; align-items: center; gap: 0.75rem;
  color: var(--adm-text-faint); font-size: 0.72rem; margin: 1.1rem 0 0.85rem;
}
.divider::before, .divider::after {
  content: ''; flex: 1; height: 1px;
  background: linear-gradient(90deg, transparent, var(--adm-border), transparent);
}
.error {
  color: var(--adm-danger);
  font-size: 0.82rem;
  text-align: center;
  margin: 1.1rem 0 0;
  padding: 0.55rem;
  border: 1px solid rgba(255, 107, 107, 0.25);
  border-radius: 8px;
  background: rgba(255, 107, 107, 0.06);
}
.fade-enter-active, .fade-leave-active { transition: opacity 0.25s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
