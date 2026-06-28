<script setup lang="ts">
import type { Rect } from '@/types/card.type'

const props = defineProps<{
  playerId: string
  playerName: string
  xp: number
  rect: Rect        // positioned between deck and hand
  canEdit: boolean  // true only for the local player
}>()

const emit = defineEmits<{
  change: [playerId: string, newXp: number]
}>()

function increment() {
  if (props.canEdit) emit('change', props.playerId, props.xp + 1)
}

function decrement() {
  if (props.canEdit) emit('change', props.playerId, Math.max(0, props.xp - 1))
}
</script>

<template>
  <div
    class="xp-counter"
    :style="{
      left:   rect.x + 'px',
      top:    rect.y + 'px',
      width:  rect.w + 'px',
      height: rect.h + 'px',
    }"
  >
    <span class="xp-label">XP</span>
    <div class="xp-controls">
      <button v-if="canEdit" class="xp-btn" @click="decrement">−</button>
      <span class="xp-value">{{ xp }}</span>
      <button v-if="canEdit" class="xp-btn" @click="increment">+</button>
    </div>
  </div>
</template>

<style scoped>
.xp-counter {
  position: fixed;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  pointer-events: auto;
  user-select: none;
}

.xp-label {
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: #C8AA6E;
  opacity: 0.75;
  line-height: 1;
}

.xp-controls {
  display: flex;
  align-items: center;
  gap: 4px;
}

.xp-value {
  min-width: 28px;
  text-align: center;
  font-size: 20px;
  font-weight: 800;
  color: #F2E5CD;
  line-height: 1;
  text-shadow: 0 0 12px rgba(200, 170, 110, 0.6);
}

.xp-btn {
  width: 20px;
  height: 20px;
  border-radius: 4px;
  background: rgba(200, 170, 110, 0.12);
  border: 1px solid rgba(200, 170, 110, 0.4);
  color: #C8AA6E;
  font-size: 16px;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.12s, border-color 0.12s, box-shadow 0.12s;
  padding: 0;
  flex-shrink: 0;
}

.xp-btn:hover {
  background: rgba(200, 170, 110, 0.28);
  border-color: #C8AA6E;
  box-shadow: 0 0 8px rgba(200, 170, 110, 0.35);
}

.xp-btn:active {
  background: rgba(200, 170, 110, 0.4);
}
</style>
