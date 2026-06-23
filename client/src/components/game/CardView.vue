<script setup lang="ts">
import type {CardState} from '@riftbound/shared'
import type {CardLayout} from '@/types/card.type'

const props = defineProps<{
  card: CardState
  layout: CardLayout
}>()
</script>

<template>
  <div
      class="card"
      :style="{
        transform: `translate(${layout.x}px, ${layout.y}px) rotate(${layout.rotation}deg)`,
        width: layout.w + 'px',
        height: layout.h + 'px',
        zIndex: layout.z,
      }"
  >
    <img
        v-if="card.description.imageUrl"
        :src="card.description.imageUrl"
        :alt="card.description.name"
        class="card-image"
    />
    <div v-else class="card-placeholder" :data-type="card.description.type">
      <span class="card-name">{{ card.description.name }}</span>
    </div>
  </div>
</template>

<style scoped>
.card {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: auto;
  cursor: grab;
  touch-action: none;
  will-change: transform;
  transform-origin: 50% 50%;
  transition: transform 0.25s ease;
  border-radius: 4px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0,0,0,0.5);
}

.card-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  border-radius: 4px;
}

.card-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #1a2a4a;
  border: 1px solid #2a4a8a;
  border-radius: 4px;
  padding: 4px;
}

.card-placeholder[data-type="legend"] { background: #2a1a0a; border-color: #8a5a00; }
.card-placeholder[data-type="rune"]   { background: #1a0a2a; border-color: #6a0a8a; }

.card-name {
  font-size: 9px;
  color: #ccd;
  text-align: center;
  line-height: 1.2;
  word-break: break-word;
  overflow: hidden;
  max-height: 100%;
}
</style>
