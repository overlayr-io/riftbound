<script setup lang="ts">
import type { PresenceStatus } from '@/composables/usePlayerPresence'

defineProps<{
  playerName: string
  status: PresenceStatus
}>()
</script>

<template>
  <Teleport to="body">
    <Transition name="presence">
      <div v-if="status !== 'online'" class="presence-backdrop">
        <div class="presence-panel">

          <!-- Icon -->
          <div class="presence-icon" :class="status === 'gone' ? 'presence-icon--gone' : 'presence-icon--dc'">
            <svg v-if="status === 'gone'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75"/>
            </svg>
            <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M8.288 15.038a5.25 5.25 0 017.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12.53 18.22l-.53.53-.53-.53a.75.75 0 011.06 0z"/>
              <line x1="3" y1="3" x2="21" y2="21" stroke-width="1.5"/>
            </svg>
          </div>

          <!-- Message -->
          <h2 class="presence-title">{{ playerName }}</h2>

          <p v-if="status === 'gone'" class="presence-sub">
            a quitté la partie
          </p>
          <p v-else class="presence-sub">
            semble déconnecté
            <span class="presence-dots"><span>.</span><span>.</span><span>.</span></span>
          </p>

          <p v-if="status === 'disconnected'" class="presence-hint">
            La partie est en pause. En attente de reconnexion.
          </p>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.presence-backdrop {
  position: fixed;
  inset: 0;
  z-index: 8000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(2, 8, 20, 0.72);
  backdrop-filter: blur(4px);
}

.presence-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  padding: 2.5rem 2.5rem;
  width: 340px;
  background: linear-gradient(160deg, #0d1c2e 0%, #060d1a 100%);
  border: 1px solid rgba(200, 170, 110, 0.15);
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.8);
  text-align: center;
}

.presence-icon {
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  animation: presence-pulse 2.4s ease-in-out infinite;
}
.presence-icon svg { width: 24px; height: 24px; }

.presence-icon--dc {
  background: rgba(80, 140, 200, 0.1);
  border: 1px solid rgba(80, 140, 200, 0.28);
  color: #6aabb0;
}
.presence-icon--gone {
  background: rgba(200, 80, 80, 0.1);
  border: 1px solid rgba(200, 80, 80, 0.28);
  color: #e06060;
  animation: none;
}

@keyframes presence-pulse {
  0%, 100% { box-shadow: 0 0 0 0   rgba(80, 140, 200, 0.3); }
  50%       { box-shadow: 0 0 0 8px rgba(80, 140, 200, 0);   }
}

.presence-title {
  font-size: 1rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: #F2E5CD;
  margin: 0;
}

.presence-sub {
  font-size: 0.75rem;
  color: #6a8a90;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 1px;
  justify-content: center;
}

.presence-hint {
  font-size: 0.65rem;
  color: #2a4a50;
  line-height: 1.5;
  margin: 0;
}

/* Blinking dots for disconnected state */
.presence-dots span {
  animation: blink 1.4s infinite;
  opacity: 0;
}
.presence-dots span:nth-child(2) { animation-delay: 0.2s; }
.presence-dots span:nth-child(3) { animation-delay: 0.4s; }
@keyframes blink {
  0%, 100% { opacity: 0; }
  50%       { opacity: 1; }
}

.presence-enter-from, .presence-leave-to  { opacity: 0; transform: scale(0.97); }
.presence-enter-active, .presence-leave-active { transition: opacity 0.2s ease, transform 0.2s ease; }
</style>
