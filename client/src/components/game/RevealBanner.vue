<script setup lang="ts">
import { ref, watch } from 'vue'
import type { CardState } from '@riftbound/shared'
import cardBack from '@/assets/img/card_back.png'

const props = defineProps<{
  // Cards being revealed (resolved CardState, in order).
  cards: CardState[]
  // Name of the player who revealed them.
  revealerName: string
  // Anchor point near the revealer's deck (viewport px) for phase 2.
  anchorX: number
  anchorY: number
}>()

const emit = defineEmits<{
  done: []
}>()

const phase = ref<'center' | 'docked'>('center')

watch(
  () => props.cards.map(c => c.cardId).join(','),
  (key) => {
    if (!key) return
    phase.value = 'center'
  },
  { immediate: true },
)

function closeEarly() {
  emit('done')
}
</script>

<template>
  <Teleport to="body">
    <div v-if="cards.length" class="rb-root">

      <!-- Phase 1: centered presentation -->
      <Transition name="rb-center">
        <div v-if="phase === 'center'" class="rb-center">
          <div class="rb-center-header">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            {{ revealerName }} révèle {{ cards.length }} carte{{ cards.length > 1 ? 's' : '' }}
          </div>
          <div class="rb-center-cards">
            <div v-for="card in cards" :key="card.cardId" class="rb-big-card">
              <img :src="card.description.imageUrl || cardBack" :alt="card.description.name" />
            </div>
          </div>
          <button class="rb-center-close" @click="closeEarly()" aria-label="Fermer">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="5" y1="5" x2="19" y2="19"/><line x1="19" y1="5" x2="5" y2="19"/></svg>
            Fermer
          </button>
        </div>
      </Transition>

      <!-- Phase 2: docked reminder near the revealer's deck -->
      <div
        v-if="phase === 'docked'"
        class="rb-dock"
        :style="{ left: anchorX + 'px', top: anchorY + 'px' }"
      >
        <div class="rb-dock-label">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          {{ revealerName }} · révélé
        </div>
        <div class="rb-dock-cards">
          <div v-for="card in cards" :key="card.cardId" class="rb-small-card">
            <img :src="card.description.imageUrl || cardBack" :alt="card.description.name" />
          </div>
        </div>
        <button class="rb-dock-close" @click="emit('done')" aria-label="Fermer">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="5" y1="5" x2="19" y2="19"/><line x1="19" y1="5" x2="5" y2="19"/></svg>
        </button>
      </div>

    </div>
  </Teleport>
</template>

<style scoped>
.rb-root {
  position: fixed;
  inset: 0;
  z-index: 9050;
  pointer-events: none;
}

/* Phase 1 — center */
.rb-center {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  pointer-events: auto;
}

.rb-center-header {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #C8AA6E;
  margin-bottom: 12px;
}

.rb-center-cards {
  display: flex;
  gap: 14px;
  justify-content: center;
}

.rb-big-card {
  width: 132px;
  height: 184px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid rgba(200, 170, 110, 0.5);
  box-shadow: 0 8px 36px rgba(0, 0, 0, 0.75);
}
.rb-big-card img { width: 100%; height: 100%; object-fit: cover; }

/* Phase 2 — docked */
.rb-dock {
  position: absolute;
  transform: translate(-100%, -100%);
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  background: rgba(13, 28, 46, 0.94);
  border: 1px solid rgba(200, 170, 110, 0.3);
  border-radius: 8px;
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.6);
  pointer-events: auto;
}

.rb-dock-label {
  display: flex;
  align-items: center;
  gap: 4px;
  writing-mode: horizontal-tb;
  font-size: 9px;
  color: #C8AA6E;
  white-space: nowrap;
  max-width: 70px;
}

.rb-dock-cards {
  display: flex;
  gap: 4px;
}

.rb-small-card {
  width: 40px;
  height: 56px;
  border-radius: 4px;
  overflow: hidden;
  border: 1px solid rgba(200, 170, 110, 0.3);
  transition: transform 0.12s;
}
.rb-small-card:hover { transform: scale(1.6); }
.rb-small-card img { width: 100%; height: 100%; object-fit: cover; }

.rb-dock-close {
  width: 18px;
  height: 18px;
  border-radius: 4px;
  border: 1px solid rgba(200, 170, 110, 0.25);
  background: transparent;
  color: #8aabb0;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.rb-dock-close:hover { color: #F2E5CD; background: rgba(200, 170, 110, 0.12); }

.rb-center-close {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 16px;
  padding: 6px 16px;
  border-radius: 20px;
  border: 1px solid rgba(200, 170, 110, 0.35);
  background: rgba(13, 28, 46, 0.85);
  color: #C8AA6E;
  font-size: 11px;
  font-family: inherit;
  cursor: pointer;
  pointer-events: auto;
  transition: background 0.1s, color 0.1s;
}
.rb-center-close:hover { background: rgba(200, 170, 110, 0.15); color: #F2E5CD; }

.rb-center-enter-active { transition: opacity 0.2s, transform 0.2s; }
.rb-center-leave-active { transition: opacity 0.3s, transform 0.3s; }
.rb-center-enter-from { opacity: 0; transform: translate(-50%, -42%); }
.rb-center-leave-to { opacity: 0; transform: translate(-50%, -58%) scale(0.9); }
</style>
