<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import type { CardState } from '@riftbound/shared'
import { useGameStore } from '@/stores/game'

const props = defineProps<{
  visible: boolean
  card: CardState | null
  x: number
  y: number
  currentPlayerId: string
}>()

const emit = defineEmits<{ close: [] }>()

const store = useGameStore()

// ── Viewport clamping ─────────────────────────────────────────────────────────

const menuRef = ref<HTMLElement | null>(null)
const menuStyle = ref<Record<string, string>>({})

watch(
  () => [props.visible, props.x, props.y] as const,
  async ([visible, x, y]) => {
    if (!visible) return
    menuStyle.value = { left: x + 'px', top: y + 'px' }
    await nextTick()
    const el = menuRef.value
    if (!el) return
    const { width, height } = el.getBoundingClientRect()
    const margin = 8
    menuStyle.value = {
      left: Math.min(x, window.innerWidth  - width  - margin) + 'px',
      top:  Math.min(y, window.innerHeight - height - margin) + 'px',
    }
  },
)

function onOverlay(e: MouseEvent) {
  if (e.target === e.currentTarget) emit('close')
}

// ── Actions ───────────────────────────────────────────────────────────────────

function copyCard() {
  if (!props.card) return
  const newCardId = `copy_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
  store.applyAction({ type: 'COPY_CARD', playerId: props.currentPlayerId, sourceCardId: props.card.cardId, newCardId })
  emit('close')
}

function takeControl(temporary: boolean) {
  if (!props.card) return
  store.applyAction({ type: 'TAKE_CONTROL', playerId: props.currentPlayerId, cardId: props.card.cardId, temporary })
  emit('close')
}
</script>

<template>
  <Teleport to="body">
    <div v-if="visible && card" class="ctx-overlay" @mousedown="onOverlay">
      <div ref="menuRef" class="ctx-menu" :style="menuStyle">

        <div class="ctx-header">{{ card.description.name || 'Carte' }}</div>
        <div class="ctx-header-sep" />

        <!-- Copier -->
        <div class="ctx-item" @click="copyCard">
          <span class="ctx-icon">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
            </svg>
          </span>
          <span class="ctx-label">Copier</span>
        </div>

        <div class="ctx-sep" />

        <!-- Controller (jusqu'à fin du tour — raccourci direct) -->
        <div class="ctx-item" @click="takeControl(true)">
          <span class="ctx-icon">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
            </svg>
          </span>
          <span class="ctx-label">Controller</span>
          <span class="ctx-hint">fin du tour</span>
        </div>

        <!-- Controller indéfiniment -->
        <div class="ctx-item ctx-item--secondary" @click="takeControl(false)">
          <span class="ctx-icon">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18.364 5.636a9 9 0 010 12.728M15.536 8.464a5 5 0 010 7.072M5.636 5.636a9 9 0 000 12.728M8.464 8.464a5 5 0 000 7.072"/>
              <circle cx="12" cy="12" r="1"/>
            </svg>
          </span>
          <span class="ctx-label">Controller indéfiniment</span>
        </div>

      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.ctx-overlay {
  position: fixed;
  inset: 0;
  z-index: 9000;
}

.ctx-menu {
  position: absolute;
  width: 210px;
  padding: 6px 0;
  background: linear-gradient(160deg, #0d1c2e 0%, #060d1a 100%);
  border: 1px solid rgba(200, 170, 110, 0.28);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.75), 0 0 0 1px rgba(0, 0, 0, 0.4);
  user-select: none;
  font-family: inherit;
}

.ctx-header {
  padding: 5px 12px 7px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #C8AA6E;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ctx-header-sep {
  height: 1px;
  background: rgba(200, 170, 110, 0.15);
  margin: 0 0 3px;
}

.ctx-sep {
  height: 1px;
  background: rgba(200, 170, 110, 0.12);
  margin: 4px 0;
}

.ctx-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  cursor: pointer;
  color: #c8d8e0;
  font-size: 11px;
  position: relative;
  transition: background 0.1s, color 0.1s;
}

.ctx-item:hover {
  background: rgba(200, 170, 110, 0.08);
  color: #F2E5CD;
}

.ctx-item--secondary {
  color: #8aabb0;
  font-size: 10px;
}

.ctx-item--secondary:hover {
  color: #c8d8e0;
  background: rgba(200, 170, 110, 0.06);
}

.ctx-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 13px;
  height: 13px;
  flex-shrink: 0;
  opacity: 0.7;
}

.ctx-label {
  flex: 1;
}

.ctx-hint {
  font-size: 9px;
  color: rgba(200, 170, 110, 0.5);
  white-space: nowrap;
}
</style>
