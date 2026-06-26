<script setup lang="ts">
import { ref } from 'vue'
import type { CardState } from '@riftbound/shared'
import cardBack from '@/assets/img/card_back.png'

export type ZoneTrayAction = 'top' | 'bottom' | 'hand' | 'discard' | 'banish'

defineProps<{
  open: boolean
  cards: CardState[]
  title: string
  actions: ZoneTrayAction[]
}>()

const emit = defineEmits<{
  action: [cardId: string, action: ZoneTrayAction]
  close: []
}>()

const ghostMode = ref(false)
</script>

<template>
  <Teleport to="body">
    <button
      v-if="open && cards.length && ghostMode"
      class="zt-ghost-restore"
      @click="ghostMode = false"
      title="Afficher le tiroir"
      aria-label="Afficher le tiroir"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
      Voir le tiroir
    </button>
    <Transition name="tray-slide">
      <div v-if="open" class="zt-tray" :class="{ 'zt-tray--ghost': ghostMode }">
        <div class="zt-header">
          <span class="zt-title">{{ title }}</span>
          <button
            class="zt-ghost-btn"
            :class="{ 'zt-ghost-btn--active': ghostMode }"
            @click="ghostMode = !ghostMode"
            :title="ghostMode ? 'Afficher le tiroir' : 'Voir le board'"
          >
            <svg v-if="!ghostMode" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
          </button>
          <button class="zt-close" @click="emit('close')" aria-label="Fermer">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="5" y1="5" x2="19" y2="19"/><line x1="19" y1="5" x2="5" y2="19"/></svg>
          </button>
        </div>

        <div v-if="!cards.length" class="zt-empty">Aucune carte dans cette zone</div>

        <div v-else class="zt-cards">
          <div v-for="card in cards" :key="card.cardId" class="zt-card-col">
            <div class="zt-card">
              <img class="zt-card-img" :src="card.description.imageUrl || cardBack" :alt="card.description.name" />
            </div>
            <div class="zt-card-name">{{ card.description.name }}</div>
            <div class="zt-actions">
              <button
                v-if="actions.includes('top')"
                class="zt-btn zt-btn--icon"
                title="Dessus du deck"
                @click="emit('action', card.cardId, 'top')"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="17 11 12 6 7 11"/><line x1="12" y1="6" x2="12" y2="20"/></svg>
                Dessus deck
              </button>
              <button
                v-if="actions.includes('bottom')"
                class="zt-btn zt-btn--icon"
                title="Dessous du deck"
                @click="emit('action', card.cardId, 'bottom')"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="17 13 12 18 7 13"/><line x1="12" y1="4" x2="12" y2="18"/></svg>
                Dessous deck
              </button>
              <button
                v-if="actions.includes('hand')"
                class="zt-btn zt-btn--icon"
                title="Vers la main"
                @click="emit('action', card.cardId, 'hand')"
              >
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4"><rect x="1" y="5" width="6" height="9" rx="1"/><rect x="6" y="3" width="6" height="9" rx="1"/></svg>
                En main
              </button>
              <button
                v-if="actions.includes('discard')"
                class="zt-btn zt-btn--icon zt-btn--discard"
                title="Défausse"
                @click="emit('action', card.cardId, 'discard')"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                Défausse
              </button>
              <button
                v-if="actions.includes('banish')"
                class="zt-btn zt-btn--icon zt-btn--banish"
                title="Bannis"
                @click="emit('action', card.cardId, 'banish')"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
                Bannis
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.zt-tray {
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

.zt-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 14px;
  color: #C8AA6E;
}

.zt-title {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  flex: 1;
}

.zt-tray--ghost {
  opacity: 0.08;
  pointer-events: none;
}

.zt-ghost-restore {
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
.zt-ghost-restore:hover { background: rgba(90, 140, 200, 0.2); color: #aed0f5; }

.zt-ghost-btn {
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
.zt-ghost-btn:hover { background: rgba(200, 170, 110, 0.12); color: #F2E5CD; }
.zt-ghost-btn--active { border-color: rgba(90, 140, 200, 0.5); color: #7fb0e8; }

.zt-close {
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
.zt-close:hover { background: rgba(200, 170, 110, 0.12); color: #F2E5CD; }

.zt-empty {
  color: #6a8a90;
  font-size: 12px;
  text-align: center;
  padding: 20px 40px;
}

.zt-cards {
  display: flex;
  gap: 16px;
  overflow-x: auto;
  padding-bottom: 4px;
  scrollbar-width: thin;
  scrollbar-color: rgba(200, 170, 110, 0.3) transparent;
}

.zt-card-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  width: 150px;
}

.zt-card {
  width: 96px;
  height: 134px;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid rgba(200, 170, 110, 0.35);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.6);
}

.zt-card-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.zt-card-name {
  font-size: 10px;
  color: #c8d8e0;
  text-align: center;
  max-width: 140px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.zt-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  width: 100%;
  justify-content: center;
}

.zt-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 5px 8px;
  border-radius: 4px;
  background: rgba(200, 170, 110, 0.10);
  border: 1px solid rgba(200, 170, 110, 0.25);
  color: #c8d8e0;
  font-size: 10px;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.1s, color 0.1s;
}
.zt-btn svg { color: #C8AA6E; flex-shrink: 0; }
.zt-btn:hover { background: rgba(200, 170, 110, 0.20); color: #F2E5CD; }

.zt-btn--icon {
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 5px 6px;
}

.zt-btn--discard {
  background: rgba(200, 80, 80, 0.10);
  border-color: rgba(200, 80, 80, 0.28);
}
.zt-btn--discard svg { color: #e07070; }
.zt-btn--discard:hover { background: rgba(200, 80, 80, 0.22); }

.zt-btn--banish {
  background: rgba(140, 80, 200, 0.10);
  border-color: rgba(140, 80, 200, 0.28);
}
.zt-btn--banish svg { color: #b070e0; }
.zt-btn--banish:hover { background: rgba(140, 80, 200, 0.22); }

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
