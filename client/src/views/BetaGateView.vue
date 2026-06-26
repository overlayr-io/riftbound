<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/stores/auth'
import { useBetaStore } from '@/stores/beta'

const auth = useAuthStore()
const beta = useBetaStore()
const route = useRoute()
const router = useRouter()
const { state, error } = storeToRefs(beta)

const email = ref('')
const password = ref('')
const code = ref(typeof route.query.code === 'string' ? route.query.code : '')
const mode = ref<'signup' | 'login'>('signup')
const loading = ref(false)
const localError = ref<string | null>(null)

// Un compte « réel » = non anonyme (email/password).
const hasAccount = computed(() => !!auth.user && !auth.user.isAnonymous)

onMounted(async () => {
  await auth.waitForInit()
  await beta.refresh()
  if (state.value?.allowed) router.replace('/')
})

async function authenticate() {
  loading.value = true; localError.value = null
  try {
    if (mode.value === 'signup') await auth.signUpPlayer(email.value.trim(), password.value)
    else await auth.signInWithEmail(email.value.trim(), password.value)
    await beta.refresh()
    if (state.value?.allowed) router.replace('/')
  } catch {
    localError.value = mode.value === 'signup' ? "Inscription impossible (email déjà utilisé ?)." : 'Identifiants invalides.'
  } finally {
    loading.value = false
  }
}

async function continueWithGoogle() {
  loading.value = true; localError.value = null
  try {
    await auth.signInWithGoogle()
    await beta.refresh()
    if (state.value?.allowed) router.replace('/')
  } catch {
    localError.value = 'Connexion Google annulée ou impossible.'
  } finally {
    loading.value = false
  }
}

async function redeem() {
  loading.value = true
  try {
    await beta.redeem(code.value.trim())
    if (state.value?.allowed) router.replace('/')
  } catch { /* error exposé via store */ }
  finally { loading.value = false }
}

async function joinWaitlist() {
  loading.value = true
  try {
    await beta.joinWaitlist(email.value.trim() || auth.user?.email || '')
  } catch { /* noop */ }
  finally { loading.value = false }
}
</script>

<template>
  <div class="gate-root">
    <div class="gate-card">
      <div class="brand">RIFTBOUND TCG</div>
      <div class="ornament"><span>◆</span></div>

      <!-- Étape 1 : compte requis -->
      <template v-if="!hasAccount">
        <p class="lead">Accès en beta fermée — connecte-toi pour continuer.</p>
        <div class="tabs">
          <button :class="{ on: mode === 'signup' }" @click="mode = 'signup'">Créer un compte</button>
          <button :class="{ on: mode === 'login' }" @click="mode = 'login'">Se connecter</button>
        </div>
        <form @submit.prevent="authenticate">
          <input v-model="email" type="email" placeholder="Email" autocomplete="username" required />
          <input v-model="password" type="password" placeholder="Mot de passe" autocomplete="current-password" required />
          <button type="submit" class="primary" :disabled="loading">{{ loading ? '…' : (mode === 'signup' ? "S'inscrire" : 'Se connecter') }}</button>
        </form>
        <div class="divider"><span>ou</span></div>
        <button type="button" class="google-btn" :disabled="loading" @click="continueWithGoogle">
          <svg viewBox="0 0 24 24" width="18" height="18"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
          Continuer avec Google
        </button>
        <p v-if="localError" class="err">{{ localError }}</p>
      </template>

      <!-- Étape 2 : gating selon la phase -->
      <template v-else-if="state && !state.allowed">
        <p v-if="state.betaAccess === 'waitlisted'" class="lead ok">
          ✓ Tu es sur la liste d'attente. On te préviendra dès l'ouverture de ton accès.
        </p>

        <template v-else-if="state.phase === 'beta_closed'">
          <p class="lead">Entre ton code d'invitation pour rejoindre la beta.</p>
          <form @submit.prevent="redeem">
            <input v-model="code" placeholder="CODE" required />
            <button type="submit" class="primary" :disabled="loading">Valider le code</button>
          </form>
          <p v-if="error" class="err">{{ error }}</p>
        </template>

        <template v-else-if="state.phase === 'beta_open'">
          <p class="lead">La beta est sur invitation/liste d'attente. Rejoins la waitlist :</p>
          <form @submit.prevent="joinWaitlist">
            <input v-model="email" type="email" :placeholder="auth.user?.email ?? 'Email'" />
            <button type="submit" class="primary" :disabled="loading">Rejoindre la waitlist</button>
          </form>
        </template>

        <p v-else class="lead">Accès non autorisé pour le moment.</p>
      </template>

      <template v-else>
        <p class="lead">Vérification de l'accès…</p>
      </template>
    </div>
  </div>
</template>

<style scoped>
.gate-root {
  width: 100vw; height: 100vh; display: flex; align-items: center; justify-content: center;
  background: radial-gradient(ellipse 140% 90% at 50% 25%, #091629 0%, #030810 65%);
  color: #e8ebf0;
}
.gate-card {
  width: 360px; padding: 2.25rem 2rem; text-align: center;
  background: linear-gradient(180deg, #0c121d, #0a0f18);
  border: 1px solid #1b2435; border-radius: 14px;
}
.brand {
  font-size: 1.4rem; font-weight: 900; letter-spacing: 0.14em;
  background: linear-gradient(180deg, #f2e5cd, #c8aa6e 52%, #a3751e);
  -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
}
.ornament { display: flex; align-items: center; gap: 0.7rem; margin: 0.7rem 0 1.2rem; }
.ornament::before, .ornament::after { content: ''; flex: 1; height: 1px; background: linear-gradient(90deg, transparent, rgba(200,170,110,0.45)); }
.ornament::after { background: linear-gradient(90deg, rgba(200,170,110,0.45), transparent); }
.ornament span { color: #c8aa6e; font-size: 0.5rem; }
.lead { color: #aeb4c0; font-size: 0.88rem; margin-bottom: 1.2rem; line-height: 1.5; }
.lead.ok { color: #4fd6a0; }
.tabs { display: flex; gap: 0.5rem; margin-bottom: 1rem; }
.tabs button { flex: 1; background: #111927; border: 1px solid #1b2435; color: #aeb4c0; padding: 0.5rem; border-radius: 8px; cursor: pointer; }
.tabs button.on { border-color: #c8aa6e; color: #f2e5cd; }
form { display: flex; flex-direction: column; gap: 0.7rem; }
input { background: #070b12; border: 1px solid #2a3445; border-radius: 8px; padding: 0.6rem 0.75rem; color: #fff; }
input:focus { outline: none; border-color: #c8aa6e; }
.primary { background: linear-gradient(180deg, #f2e5cd, #c8aa6e 52%, #a3751e); color: #1a130a; font-weight: 700; border: none; border-radius: 8px; padding: 0.65rem; cursor: pointer; }
.primary:disabled { opacity: 0.5; }
.divider { display: flex; align-items: center; gap: 0.7rem; margin: 0.25rem 0; }
.divider::before, .divider::after { content: ''; flex: 1; height: 1px; background: rgba(200,170,110,0.15); }
.divider span { font-size: 0.65rem; color: #4a6a70; letter-spacing: 0.1em; }
.google-btn {
  display: flex; align-items: center; justify-content: center; gap: 0.6rem;
  background: #fff; color: #3c3c3c; border: none; border-radius: 8px;
  padding: 0.65rem; font-weight: 600; font-size: 0.85rem; cursor: pointer;
  transition: opacity 0.15s;
  width: 100%;
}
.google-btn:disabled { opacity: 0.5; }
.google-btn:hover:not(:disabled) { opacity: 0.9; }
.err { color: #ff6b6b; font-size: 0.82rem; margin-top: 0.9rem; }
</style>
