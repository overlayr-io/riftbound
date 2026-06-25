<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useActiveGame } from '@/composables/useActiveGame'
import TitleOrnament from '@/components/TitleOrnament.vue'
import GameButton from '@/components/GameButton.vue'

const router = useRouter()
const authStore = useAuthStore()

const { activeGame } = useActiveGame(() => authStore.user?.uid ?? null)

const navItems = [
  { label: 'DECKS',    icon: 'M4 6h16M4 10h16M4 14h16M4 18h16',   route: '/decks'    },
  { label: 'SETTINGS', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z', route: '/settings' },
]
</script>

<template>
  <div class="home">

    <!-- Titre principal -->
    <div class="title-block">
      <TitleOrnament />

      <h1 class="title">RIFTBOUND TCG</h1>
      <p class="subtitle">Overlayr</p>

      <TitleOrnament />
    </div>

    <!-- Bannière partie en cours -->
    <Transition name="active-game">
      <div v-if="activeGame" class="active-game-banner" @click="router.push('/game/' + activeGame.gameId)">
        <div class="active-game-banner__dot" />
        <div class="active-game-banner__text">
          <span class="active-game-banner__label">PARTIE EN COURS</span>
          <span class="active-game-banner__sub">{{ activeGame.mode.toUpperCase() }} · {{ activeGame.matchFormat }}</span>
        </div>
        <svg class="active-game-banner__arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"/>
        </svg>
      </div>
    </Transition>

    <!-- Actions -->
    <div class="actions">
      <GameButton variant="primary" @click="router.push('/lobby')">
        <svg class="play-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3 1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5"/>
        </svg>
        JOUER
      </GameButton>

      <GameButton variant="secondary" :coming-soon="true">
        TUTORIEL
      </GameButton>
    </div>

    <!-- Navigation secondaire -->
    <nav class="bottom-nav">
      <div class="nav-divider" />
      <div class="nav-items">
        <button
          v-for="item in navItems"
          :key="item.label"
          class="nav-item"
          @click="router.push(item.route)"
        >
          <svg class="nav-item__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" :d="item.icon" />
          </svg>
          <span class="nav-item__label">{{ item.label }}</span>
        </button>
      </div>
    </nav>

    <!-- Disclaimer -->
    <div class="disclaimer">
      Overlayr was created under Riot Games' "Legal Jibber Jabber" policy using assets owned by Riot Games. Riot Games does not endorse or sponsor this project.
    </div>

  </div>
</template>

<style scoped>
.home {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 5rem;
  padding: 4rem 2rem 6rem;
  min-height: 100vh;
  position: relative;
}

/* ── Titre ── */
.title-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  text-align: center;
}

.title {
  font-size: clamp(3.5rem, 7vw, 6rem);
  font-weight: 900;
  letter-spacing: 0.2em;
  line-height: 1;
  background: linear-gradient(180deg, #f2e5cd 0%, #c8aa6e 50%, #a3751e 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  text-shadow: none;
  filter: drop-shadow(0 0 24px rgba(200, 170, 110, 0.25));
}

.subtitle {
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.45em;
  color: #00ccb9;
  text-transform: uppercase;
}

/* ── Actions ── */
.actions {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  width: 100%;
  max-width: 24rem;
}

.play-icon {
  width: 1.5rem;
  height: 1.5rem;
  color: #c8aa6e;
}

/* ── Navigation secondaire ── */
.bottom-nav {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
  width: 100%;
  max-width: 28rem;
}
.nav-divider {
  width: 100%;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(48, 47, 46, 0.8) 30%, rgba(48, 47, 46, 0.8) 70%, transparent);
}
.nav-items {
  display: flex;
  gap: 0;
  width: 100%;
}
.nav-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: none;
  border: none;
  cursor: pointer;
  opacity: 0.45;
  transition: opacity 0.2s, color 0.2s;
  border-right: 1px solid rgba(48, 47, 46, 0.6);
}
.nav-item:last-child {
  border-right: none;
}
.nav-item:hover {
  opacity: 1;
}
.nav-item:hover .nav-item__icon {
  color: #c8aa6e;
}
.nav-item:hover .nav-item__label {
  color: #c8aa6e;
}
.nav-item__icon {
  width: 1.5rem;
  height: 1.5rem;
  color: #8aabb0;
  transition: color 0.2s;
}
.nav-item__label {
  font-size: 0.6rem;
  font-weight: 700;
  letter-spacing: 0.25em;
  color: #8aabb0;
  text-transform: uppercase;
  transition: color 0.2s;
}

/* ── Bannière partie en cours ── */
.active-game-banner {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.7rem 1.25rem;
  background: rgba(0, 204, 185, 0.06);
  border: 1px solid rgba(0, 204, 185, 0.3);
  cursor: pointer;
  width: 100%;
  max-width: 24rem;
  transition: background 0.15s, border-color 0.15s;
}

.active-game-banner:hover {
  background: rgba(0, 204, 185, 0.12);
  border-color: rgba(0, 204, 185, 0.55);
}

.active-game-banner__dot {
  width: 0.45rem;
  height: 0.45rem;
  border-radius: 50%;
  background: #00CCB9;
  flex-shrink: 0;
  animation: pulse-dot 2s ease-in-out infinite;
}

.active-game-banner__text {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}

.active-game-banner__label {
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.2em;
  color: #00CCB9;
}

.active-game-banner__sub {
  font-size: 0.55rem;
  letter-spacing: 0.1em;
  color: #4a8a84;
}

.active-game-banner__arrow {
  width: 1rem;
  height: 1rem;
  color: #00CCB9;
  flex-shrink: 0;
}

@keyframes pulse-dot {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(0.75); }
}

.active-game-enter-active { transition: opacity 0.2s ease, transform 0.2s ease; }
.active-game-leave-active { transition: opacity 0.15s ease; }
.active-game-enter-from  { opacity: 0; transform: translateY(-6px); }
.active-game-leave-to    { opacity: 0; }

/* ── Disclaimer ── */
.disclaimer {
  position: absolute;
  bottom: 1.25rem;
  left: 50%;
  transform: translateX(-50%);
  width: calc(100% - 4rem);
  max-width: 28rem;
  text-align: center;
  font-size: 0.65rem;
  line-height: 1.5;
  color: #8aabb0;
  opacity: 0.7;
}
</style>
