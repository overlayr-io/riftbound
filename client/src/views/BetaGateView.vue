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
.err { color: #ff6b6b; font-size: 0.82rem; margin-top: 0.9rem; }
</style>
