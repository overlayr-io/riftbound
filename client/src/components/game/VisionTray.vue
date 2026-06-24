<script setup lang="ts">
import { ref } from 'vue'
import type { CardState } from '@riftbound/shared'
import cardBack from '@/assets/img/card_back.png'

export type VisionAction = 'top' | 'bottom' | 'hand' | 'reveal'

const props = defineProps<{
  open: boolean
  cards: CardState[]
  mode: 'vision' | 'reveal'
}>()

const emit = defineEmits<{
  action: [cardId: string, action: VisionAction]
  close: []
}>()

const ghostMode = ref(false)

function title() {
  const n = props.cards.length
  return props.mode === 'vision'
    ? `Vision — ${n} carte${n > 1 ? 's' : ''} du dessus`
    : `Révéler — ${n} carte${n > 1 ? 's' : ''}`
}
</script>

<template>
  <Teleport to="body">
    <Transition name="tray-slide">
      <!-- Ghost-mode restore button: floats above the (transparent) tray so it stays clickable -->
      <button
        v-if="ghostMode && open && cards.length"
        class="vt-ghost-restore"
        @click="ghostMode = false"
        title="Afficher le tiroir"
        aria-label="Afficher le tiroir"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
        Voir le tiroir
      </button>

      <div v-if="open && cards.length" class="vt-tray" :class="{ 'vt-tray--ghost': ghostMode }">
        <div class="vt-header">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          <span class="vt-title">{{ title() }}</span>
          <span class="vt-sub">{{ mode === 'vision' ? 'visible par vous seul' : 'révélé à tous' }}</span>
          <button
            class="vt-ghost-btn"
            :class="{ 'vt-ghost-btn--active': ghostMode }"
            @click="ghostMode = !ghostMode"
            :aria-label="ghostMode ? 'Afficher le tiroir' : 'Voir le board'"
            :title="ghostMode ? 'Afficher le tiroir' : 'Voir le board'"
          >
            <svg v-if="!ghostMode" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
          </button>
          <button class="vt-close" @click="emit('close')" aria-label="Fermer">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="5" y1="5" x2="19" y2="19"/><line x1="19" y1="5" x2="5" y2="19"/></svg>
          </button>
        </div>

        <div class="vt-cards">
          <div v-for="card in cards" :key="card.cardId" class="vt-card-col">
            <div class="vt-card">
              <img class="vt-card-img" :src="card.description.imageUrl || cardBack" :alt="card.description.name" />
            </div>
            <div class="vt-card-name">{{ card.description.name }}</div>
            <div class="vt-actions">
              <button class="vt-btn" @click="emit('action', card.cardId, 'top')">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="17 11 12 6 7 11"/><line x1="12" y1="6" x2="12" y2="20"/></svg>
                Dessus du deck
              </button>
              <button class="vt-btn" @click="emit('action', card.cardId, 'bottom')">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="17 13 12 18 7 13"/><line x1="12" y1="4" x2="12" y2="18"/></svg>
                Dessous du deck
              </button>
              <button class="vt-btn" @click="emit('action', card.cardId, 'hand')">
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4"><rect x="1" y="5" width="6" height="9" rx="1"/><rect x="6" y="3" width="6" height="9" rx="1"/></svg>
                Vers la main
              </button>
              <button v-if="mode === 'vision'" class="vt-btn vt-btn--reveal" @click="emit('action', card.cardId, 'reveal')">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                Révéler à tous
              </button>
            </div>
          </div>
        </div>

        <div class="vt-foot">Gauche = dessus du deck · ordre conservé</div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.vt-tray {
  position: fixed;
  left: 50%;
  bottom: 0;
  transform: translateX(-50%);
  z-index: 9100;
  max-width: 96vw;
  padding: 12px 16px 14px;
  background: linear-gradient(160deg, #0d1c2e 0%, #060d1a 100%);
  border: 1px solid rgba(200, 170, 110, 0.28);
  border-bottom: none;
  border-radius: 10px 10px 0 0;
  box-shadow: 0 -8px 32px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(0, 0, 0, 0.4);
  user-select: none;
  font-family: inherit;
}

.vt-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 14px;
  color: #C8AA6E;
}

.vt-title {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.vt-sub {
  margin-left: auto;
  font-size: 10px;
  color: #6a8a90;
  text-transform: none;
  letter-spacing: 0;
}

.vt-tray--ghost {
  opacity: 0.08;
  pointer-events: none;
}

.vt-ghost-restore {
  position: fixed;
  bottom: 8px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9200;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 12px;
  border-radius: 20px;
  border: 1px solid rgba(90, 140, 200, 0.5);
  background: rgba(13, 28, 46, 0.88);
  color: #7fb0e8;
  font-size: 11px;
  font-family: inherit;
  cursor: pointer;
  backdrop-filter: blur(6px);
  transition: background 0.1s, color 0.1s;
}
.vt-ghost-restore:hover { background: rgba(90, 140, 200, 0.2); color: #aed0f5; }

.vt-ghost-btn {
  width: 22px;
  height: 22px;
  border-radius: 4px;
  border: 1px solid rgba(200, 170, 110, 0.25);
  background: transparent;
  color: #8aabb0;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.1s, color 0.1s;
}
.vt-ghost-btn:hover { background: rgba(200, 170, 110, 0.12); color: #F2E5CD; }
.vt-ghost-btn--active { border-color: rgba(90, 140, 200, 0.5); color: #7fb0e8; }
.vt-ghost-btn--active:hover { background: rgba(90, 140, 200, 0.15); }

.vt-close {
  width: 22px;
  height: 22px;
  border-radius: 4px;
  border: 1px solid rgba(200, 170, 110, 0.25);
  background: transparent;
  color: #8aabb0;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.1s, color 0.1s;
}
.vt-close:hover { background: rgba(200, 170, 110, 0.12); color: #F2E5CD; }

.vt-cards {
  display: flex;
  gap: 16px;
  justify-content: center;
  flex-wrap: wrap;
}

.vt-card-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  width: 150px;
}

.vt-card {
  width: 96px;
  height: 134px;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid rgba(200, 170, 110, 0.35);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.6);
}

.vt-card-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.vt-card-name {
  font-size: 10px;
  color: #c8d8e0;
  text-align: center;
  max-width: 140px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.vt-actions {
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 100%;
}

.vt-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 8px;
  border-radius: 4px;
  background: rgba(200, 170, 110, 0.10);
  border: 1px solid rgba(200, 170, 110, 0.25);
  color: #c8d8e0;
  font-size: 11px;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.1s, color 0.1s;
}
.vt-btn svg { color: #C8AA6E; flex-shrink: 0; }
.vt-btn:hover { background: rgba(200, 170, 110, 0.20); color: #F2E5CD; }

.vt-btn--reveal {
  background: rgba(90, 140, 200, 0.12);
  border-color: rgba(90, 140, 200, 0.35);
}
.vt-btn--reveal svg { color: #7fb0e8; }
.vt-btn--reveal:hover { background: rgba(90, 140, 200, 0.24); }

.vt-foot {
  text-align: center;
  margin-top: 12px;
  font-size: 10px;
  color: #6a8a90;
}

.tray-slide-enter-active,
.tray-slide-leave-active {
  transition: transform 0.2s ease, opacity 0.2s ease;
}
.tray-slide-enter-from,
.tray-slide-leave-to {
  transform: translate(-50%, 100%);
  opacity: 0;
}
</style>
