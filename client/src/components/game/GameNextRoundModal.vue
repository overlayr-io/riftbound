<script setup lang="ts">
import type { GameMatchFormat } from '@riftbound/shared/types/game'

const props = defineProps<{
  open: boolean
  matchFormat: GameMatchFormat | null
  playerNames: Record<string, { name: string }>
  playerIds: string[]
  loading: boolean
}>()

const emit = defineEmits<{
  cancel: []
  confirm: [winnerId: string]
}>()

const actionLabel = props.matchFormat === 'BO1' ? 'Passer en BO3' : 'Partie suivante'
</script>

<template>
  <Teleport to="body">
    <Transition name="next-round-overlay">
      <div
        v-if="open"
        class="next-round-backdrop"
        @mousedown.self="emit('cancel')"
      >
        <div class="next-round-panel">
          <div class="next-round-header">
            <span class="next-round-format-badge">
              {{ matchFormat === 'BO1' ? 'BO1 → BO3' : matchFormat }}
            </span>
            <h2 class="next-round-title">Qui a gagné cette partie ?</h2>
            <p class="next-round-sub">
              Le perdant remporte le dé et choisit qui commence.
            </p>
          </div>

          <div class="next-round-players">
            <button
              v-for="uid in playerIds"
              :key="uid"
              class="player-pick-btn"
              :disabled="loading"
              @click="emit('confirm', uid)"
            >
              <span class="player-pick-btn__name">{{ playerNames[uid]?.name ?? uid.slice(0, 6) }}</span>
              <span class="player-pick-btn__label">{{ actionLabel }}</span>
            </button>
          </div>

          <button class="next-round-cancel" :disabled="loading" @click="emit('cancel')">
            Annuler
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.next-round-backdrop {
  position: fixed;
  inset: 0;
  z-index: 9100;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(2, 9, 28, 0.82);
  backdrop-filter: blur(5px);
}

.next-round-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
  padding: 2.5rem 2rem;
  width: 360px;
  background: linear-gradient(160deg, #0d1c2e 0%, #060d1a 100%);
  border: 1px solid rgba(200, 170, 110, 0.25);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8), 0 0 40px rgba(200, 170, 110, 0.06);
}

.next-round-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  text-align: center;
}

.next-round-format-badge {
  font-size: 0.55rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: #C8AA6E;
  background: rgba(200, 170, 110, 0.08);
  border: 1px solid rgba(200, 170, 110, 0.2);
  padding: 0.2rem 0.6rem;
  border-radius: 2px;
}

.next-round-title {
  font-size: 1rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: #F2E5CD;
  margin: 0;
}

.next-round-sub {
  font-size: 0.7rem;
  color: #4a6a70;
  line-height: 1.5;
  margin: 0;
}

.next-round-players {
  display: flex;
  gap: 0.75rem;
  width: 100%;
}

.player-pick-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.3rem;
  padding: 1rem 0.5rem;
  background: rgba(200, 170, 110, 0.04);
  border: 1px solid rgba(200, 170, 110, 0.18);
  border-radius: 3px;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, transform 0.1s;
}
.player-pick-btn:hover:not(:disabled) {
  background: rgba(200, 170, 110, 0.1);
  border-color: rgba(200, 170, 110, 0.5);
  transform: translateY(-1px);
}
.player-pick-btn:active:not(:disabled) { transform: scale(0.97); }
.player-pick-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.player-pick-btn__name {
  font-size: 0.8rem;
  font-weight: 700;
  color: #F2E5CD;
  letter-spacing: 0.05em;
}
.player-pick-btn__label {
  font-size: 0.55rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  color: #C8AA6E;
}

.next-round-cancel {
  font-size: 0.65rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: #2a4a50;
  background: none;
  border: none;
  cursor: pointer;
  transition: color 0.15s;
  padding: 0.25rem 0.5rem;
}
.next-round-cancel:hover:not(:disabled) { color: #6a8a90; }
.next-round-cancel:disabled { cursor: not-allowed; }

.next-round-overlay-enter-from,
.next-round-overlay-leave-to  { opacity: 0; transform: scale(0.96) translateY(8px); }
.next-round-overlay-enter-active,
.next-round-overlay-leave-active { transition: opacity 0.18s, transform 0.18s; }
</style>
