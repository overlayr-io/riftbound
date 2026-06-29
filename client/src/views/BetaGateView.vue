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
const showPassword = ref(false)

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
    localError.value = mode.value === 'signup'
      ? "Inscription impossible. Cet email est peut-être déjà utilisé."
      : 'Email ou mot de passe incorrect.'
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
  <div class="root">
    <!-- ── Showcase (gauche) ── -->
    <div class="showcase">
      <div class="showcase-bg" />
      <div class="showcase-overlay" />

      <div class="showcase-content">
        <div class="overlayr-logo">
          <img src="@/assets/icons/icon-final-light-512.png" alt="Overlayr" />
          <span>Overlay<span class="overlayr-r">r</span></span>
        </div>

        <div class="brand-lockup">
          <div class="brand-eyebrow">Accès beta fermée</div>
          <h1 class="brand-title">RIFTBOUND<br /><span>TCG</span></h1>
          <p class="brand-tagline">
            La plateforme pour jouer à Riftbound.<br />
            1v1, 2v2, FFA. Immersion totale.
          </p>
        </div>

        <ul class="features">
          <li class="feature">
            <div class="feature-icon">
              ⚔️
            </div>
            <div>
              <strong>Affronte des joueurs dans différents modes de jeu</strong>
              <span>Redécouvre Riftbound en jouant en 1v1, 2v2 ou en chacun pour soi, dans une toute nouvelle interface.</span>
            </div>
          </li>

          <li class="feature">
            <div class="feature-icon">
              🎨
            </div>
            <div>
              <strong>Ton univers. Ton style.</strong>
              <span>Personnalise ton playmat et tes préférences dans une interface pensée pour Riftbound. Joue comme tu en as envie.</span>
            </div>
          </li>

          <li class="feature">
            <div class="feature-icon">
              📖
            </div>
            <div>
              <strong>
                Apprends vite. Entre dans le Rift.
                <span class="feature-tag">Bientôt</span>
              </strong>
              <span>Découvre les bases du jeu grâce à un tutoriel interactif et à des decks de démarrage.</span>
            </div>
          </li>
        </ul>

        <!-- Floating cards decoration -->
        <div class="cards-deco" aria-hidden="true">
          <div class="deco-card deco-card--1" />
          <div class="deco-card deco-card--2" />
          <div class="deco-card deco-card--3" />
        </div>
      </div>
    </div>

    <!-- ── Auth panel (droite) ── -->
    <div class="auth-panel">
      <div class="auth-card">
        <!-- Logo compact sur mobile -->
        <div class="mobile-brand">RIFTBOUND TCG</div>

        <!-- Étape 1 : pas de compte -->
        <template v-if="!hasAccount">
          <div class="auth-header">
            <h2>{{ mode === 'signup' ? 'Créer un compte' : 'Se connecter' }}</h2>
            <p>{{ mode === 'signup' ? 'Rejoins la beta dès maintenant.' : 'Bon retour parmi nous.' }}</p>
          </div>

          <div class="mode-tabs">
            <button :class="{ active: mode === 'signup' }" @click="mode = 'signup'">Créer un compte</button>
            <button :class="{ active: mode === 'login' }" @click="mode = 'login'">Se connecter</button>
          </div>

          <form class="auth-form" @submit.prevent="authenticate">
            <div class="field">
              <label>Email</label>
              <input
                v-model="email"
                type="email"
                placeholder="ton@email.com"
                autocomplete="username"
                required
              />
            </div>
            <div class="field">
              <label>Mot de passe</label>
              <div class="password-wrapper">
                <input
                  v-model="password"
                  :type="showPassword ? 'text' : 'password'"
                  placeholder="••••••••"
                  autocomplete="current-password"
                  required
                />
                <button type="button" class="toggle-pw" @click="showPassword = !showPassword" tabindex="-1">
                  <svg v-if="!showPassword" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                  </svg>
                </button>
              </div>
            </div>
            <button type="submit" class="btn-primary" :disabled="loading">
              <span v-if="loading" class="spinner" />
              <span v-else>{{ mode === 'signup' ? "S'inscrire" : 'Se connecter' }}</span>
            </button>
          </form>

          <div class="divider"><span>ou</span></div>

          <button type="button" class="btn-google" :disabled="loading" @click="continueWithGoogle">
            <svg viewBox="0 0 24 24" width="18" height="18">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continuer avec Google
          </button>

          <p v-if="localError" class="error-msg">{{ localError }}</p>
        </template>

        <!-- Étape 2 : gating beta -->
        <template v-else-if="state && !state.allowed">
          <template v-if="state.betaAccess === 'waitlisted'">
            <div class="auth-header">
              <div class="status-badge status-badge--ok">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Sur la liste d'attente
              </div>
              <p>On te préviendra dès que ton accès sera ouvert. Merci de ta patience !</p>
            </div>
          </template>

          <template v-else-if="state.phase === 'beta_closed'">
            <div class="auth-header">
              <h2>Code d'invitation</h2>
              <p>Tu as reçu un code ? Entre-le pour rejoindre la beta.</p>
            </div>
            <form class="auth-form" @submit.prevent="redeem">
              <div class="field">
                <label>Code d'invitation</label>
                <input v-model="code" placeholder="XXXX-XXXX" required class="code-input" />
              </div>
              <button type="submit" class="btn-primary" :disabled="loading">
                <span v-if="loading" class="spinner" />
                <span v-else>Valider le code</span>
              </button>
            </form>
            <p v-if="error" class="error-msg">{{ error }}</p>
          </template>

          <template v-else-if="state.phase === 'beta_open'">
            <div class="auth-header">
              <h2>Rejoindre la waitlist</h2>
              <p>La beta est en ouverture progressive. Inscris-toi pour être averti en priorité.</p>
            </div>
            <form class="auth-form" @submit.prevent="joinWaitlist">
              <div class="field">
                <label>Email</label>
                <input v-model="email" type="email" :placeholder="auth.user?.email ?? 'ton@email.com'" />
              </div>
              <button type="submit" class="btn-primary" :disabled="loading">
                <span v-if="loading" class="spinner" />
                <span v-else>Rejoindre la waitlist</span>
              </button>
            </form>
          </template>

          <template v-else>
            <div class="auth-header">
              <p>Accès non autorisé pour le moment.</p>
            </div>
          </template>
        </template>

        <template v-else>
          <div class="auth-header">
            <p class="checking">Vérification de l'accès…</p>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ── Layout root ── */
.root {
  display: flex;
  width: 100vw;
  min-height: 100vh;
  background: #030810;
  color: #e8ebf0;
  font-family: inherit;
}

/* ── Showcase (left) ── */
.showcase {
  flex: 1 1 55%;
  position: relative;
  overflow: hidden;
  min-height: 100vh;
  display: flex;
  align-items: center;
}

.showcase-bg {
  position: absolute;
  inset: 0;
  background-image: url('@/assets/img/baron_pit.webp');
  background-size: cover;
  background-position: center 30%;
  transform: scale(1.06);
  filter: brightness(0.18) saturate(0.5) blur(2px);
}

.showcase-overlay {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(to right, rgba(3, 8, 16, 0.3) 0%, rgba(3, 8, 16, 0.92) 100%),
    linear-gradient(to bottom, rgba(3, 8, 16, 0.3) 0%, rgba(3, 8, 16, 0.95) 100%),
    radial-gradient(ellipse 80% 60% at 35% 35%, rgba(200, 170, 110, 0.08) 0%, transparent 65%);
}

.showcase-content {
  position: relative;
  z-index: 2;
  padding: 4rem 3.5rem 4rem 4.5rem;
  max-width: 620px;
}

/* Overlayr Logo */
.overlayr-logo {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  margin-bottom: 2.5rem;
}

.overlayr-logo img {
  width: 3.2rem;
  height: 3.2rem;
  filter: drop-shadow(0 0 8px rgba(130, 91, 255, 0.3));
}

.overlayr-logo span {
  font-size: 0.95rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  color: #dde2ea;
}

.overlayr-r {
  color: #825bff;
  font-weight: 800;
}

/* Brand */
.brand-lockup {
  margin-bottom: 3rem;
}

.brand-eyebrow {
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: #c8aa6e;
  margin-bottom: 0.75rem;
  opacity: 0.85;
}

.brand-title {
  font-size: clamp(2.8rem, 5vw, 4.2rem);
  font-weight: 900;
  letter-spacing: 0.08em;
  line-height: 0.95;
  margin: 0 0 1.25rem;
  background: linear-gradient(160deg, #f8f0e0 0%, #c8aa6e 45%, #8a6530 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  text-shadow: none;
}

.brand-title span {
  display: block;
}

.brand-tagline {
  font-size: 1.05rem;
  color: #9ba5b4;
  line-height: 1.65;
  margin: 0;
  max-width: 420px;
}

/* Features */
.features {
  list-style: none;
  padding: 0;
  margin: 0 0 3rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.feature {
  display: flex;
  gap: 1.1rem;
  align-items: flex-start;
}

.feature-icon {
  flex-shrink: 0;
  width: 2.4rem;
  height: 2.4rem;
  background: linear-gradient(135deg, rgba(200, 170, 110, 0.15), rgba(200, 170, 110, 0.05));
  border: 1px solid rgba(200, 170, 110, 0.25);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #c8aa6e;
  margin-top: 0.1rem;
}

.feature-icon svg {
  width: 1.1rem;
  height: 1.1rem;
}

.feature strong {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  font-size: 0.95rem;
  font-weight: 700;
  color: #dde2ea;
  margin-bottom: 0.2rem;
}

.feature-tag {
  display: inline-block;
  font-size: 0.65rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  background: rgba(200, 170, 110, 0.12);
  border: 1px solid rgba(200, 170, 110, 0.3);
  color: #c8aa6e;
  padding: 0.25rem 0.55rem;
  border-radius: 6px;
}

.feature span {
  font-size: 0.83rem;
  color: #6b7a8d;
  line-height: 1.5;
}

/* Floating cards deco */
.cards-deco {
  position: absolute;
  bottom: 4rem;
  right: -2rem;
  width: 240px;
  height: 180px;
  pointer-events: none;
  opacity: 0.18;
}

.deco-card {
  position: absolute;
  width: 90px;
  height: 130px;
  border-radius: 10px;
  background: linear-gradient(160deg, #1a2540, #0d1525);
  border: 1px solid rgba(200, 170, 110, 0.4);
}

.deco-card--1 {
  top: 0; left: 0;
  transform: rotate(-12deg);
  animation: floatCard 6s ease-in-out infinite;
}

.deco-card--2 {
  top: 20px; left: 70px;
  transform: rotate(-3deg);
  animation: floatCard 6s ease-in-out infinite 0.8s;
}

.deco-card--3 {
  top: 10px; left: 140px;
  transform: rotate(8deg);
  animation: floatCard 6s ease-in-out infinite 1.6s;
}

@keyframes floatCard {
  0%, 100% { transform-origin: center; translate: 0 0px; }
  50%       { translate: 0 -8px; }
}

/* ── Auth panel (right) ── */
.auth-panel {
  flex: 0 0 420px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 3rem 2.5rem;
  background: linear-gradient(180deg, #06080f 0%, #040710 100%);
  border-left: 1px solid rgba(200, 170, 110, 0.1);
  min-height: 100vh;
}

.auth-card {
  width: 100%;
  max-width: 340px;
}

.mobile-brand {
  display: none;
  font-size: 1.1rem;
  font-weight: 900;
  letter-spacing: 0.12em;
  background: linear-gradient(180deg, #f2e5cd, #c8aa6e 52%, #a3751e);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  text-align: center;
  margin-bottom: 2rem;
}

.auth-header {
  margin-bottom: 1.75rem;
}

.auth-header h2 {
  font-size: 1.35rem;
  font-weight: 800;
  letter-spacing: 0.02em;
  color: #eaedf2;
  margin: 0 0 0.4rem;
}

.auth-header p {
  font-size: 0.85rem;
  color: #6b7a8d;
  margin: 0;
  line-height: 1.5;
}

/* Mode tabs */
.mode-tabs {
  display: flex;
  gap: 0.4rem;
  margin-bottom: 1.5rem;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(200, 170, 110, 0.1);
  border-radius: 10px;
  padding: 4px;
}

.mode-tabs button {
  flex: 1;
  background: transparent;
  border: none;
  border-radius: 7px;
  padding: 0.5rem;
  font-size: 0.82rem;
  font-weight: 600;
  color: #5a6a7d;
  cursor: pointer;
  transition: all 0.18s;
}

.mode-tabs button.active {
  background: linear-gradient(135deg, rgba(200, 170, 110, 0.18), rgba(200, 170, 110, 0.08));
  border: 1px solid rgba(200, 170, 110, 0.3);
  color: #e8d5a8;
}

/* Form */
.auth-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.field label {
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #4a5a6e;
}

.field input {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 9px;
  padding: 0.65rem 0.85rem;
  color: #e8ebf0;
  font-size: 0.92rem;
  transition: border-color 0.18s, background 0.18s;
  width: 100%;
  box-sizing: border-box;
}

.field input:focus {
  outline: none;
  border-color: rgba(200, 170, 110, 0.5);
  background: rgba(200, 170, 110, 0.04);
}

.field input::placeholder {
  color: #2e3d4f;
}

.password-wrapper {
  position: relative;
}

.password-wrapper input {
  padding-right: 2.8rem;
}

.toggle-pw {
  position: absolute;
  right: 0.7rem;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  padding: 0.2rem;
  cursor: pointer;
  color: #4a5a6e;
  display: flex;
  align-items: center;
  transition: color 0.15s;
}

.toggle-pw:hover { color: #c8aa6e; }
.toggle-pw svg { width: 1rem; height: 1rem; }

.code-input {
  font-size: 1.1rem !important;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-align: center;
  text-transform: uppercase;
}

/* Buttons */
.btn-primary {
  background: linear-gradient(180deg, #d4b87a 0%, #c8aa6e 40%, #a3751e 100%);
  color: #1a110a;
  font-weight: 800;
  font-size: 0.92rem;
  letter-spacing: 0.04em;
  border: none;
  border-radius: 9px;
  padding: 0.75rem;
  cursor: pointer;
  transition: opacity 0.15s, transform 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  min-height: 2.8rem;
}

.btn-primary:hover:not(:disabled) {
  opacity: 0.9;
  transform: translateY(-1px);
}

.btn-primary:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.btn-google {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.65rem;
  width: 100%;
  background: #ffffff;
  color: #3c3c3c;
  border: none;
  border-radius: 9px;
  padding: 0.72rem;
  font-weight: 600;
  font-size: 0.88rem;
  cursor: pointer;
  transition: opacity 0.15s, transform 0.15s;
}

.btn-google:hover:not(:disabled) {
  opacity: 0.9;
  transform: translateY(-1px);
}

.btn-google:disabled { opacity: 0.5; cursor: not-allowed; }

/* Divider */
.divider {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin: 0.6rem 0;
}

.divider::before,
.divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: rgba(200, 170, 110, 0.1);
}

.divider span {
  font-size: 0.65rem;
  color: #2e3d4f;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

/* Status badge */
.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.4rem 0.85rem;
  border-radius: 99px;
  font-size: 0.8rem;
  font-weight: 700;
  margin-bottom: 0.75rem;
}

.status-badge--ok {
  background: rgba(79, 214, 160, 0.12);
  border: 1px solid rgba(79, 214, 160, 0.3);
  color: #4fd6a0;
}

.status-badge svg {
  width: 1rem;
  height: 1rem;
}

/* Spinner */
.spinner {
  display: inline-block;
  width: 1rem;
  height: 1rem;
  border: 2px solid rgba(26, 17, 10, 0.3);
  border-top-color: #1a110a;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

/* Error */
.error-msg {
  color: #ff6b6b;
  font-size: 0.8rem;
  margin-top: 0.75rem;
  text-align: center;
  background: rgba(255, 107, 107, 0.08);
  border: 1px solid rgba(255, 107, 107, 0.2);
  border-radius: 7px;
  padding: 0.5rem 0.75rem;
}

.checking {
  text-align: center;
  color: #4a5a6e;
  font-size: 0.88rem;
}

/* ── Responsive ── */
@media (max-width: 800px) {
  .root {
    flex-direction: column;
  }

  .showcase {
    flex: 0 0 auto;
    min-height: 55vw;
    max-height: 320px;
  }

  .showcase-content {
    padding: 2.5rem 1.75rem;
  }

  .brand-title {
    font-size: 2.2rem;
  }

  .features {
    display: none;
  }

  .cards-deco {
    display: none;
  }

  .auth-panel {
    flex: 1;
    border-left: none;
    border-top: 1px solid rgba(200, 170, 110, 0.1);
    min-height: auto;
    padding: 2rem 1.5rem;
  }

  .mobile-brand {
    display: block;
  }
}
</style>
