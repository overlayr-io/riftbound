<script setup lang="ts">
import type { ZoomState } from '@/composables/useCardZoom'

defineProps<{ zoom: ZoomState | null }>()
</script>

<template>
  <Teleport to="body">
    <Transition name="card-zoom">
      <div
        v-if="zoom"
        class="card-zoom-popup"
        :style="{ left: zoom.x + 'px', top: zoom.y + 'px' }"
      >
        <img :src="zoom.imageUrl" alt="" class="card-zoom-popup__img" />
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.card-zoom-popup {
  position: fixed;
  z-index: 9500;
  width: 210px;
  height: 294px;
  pointer-events: none;
  border-radius: 6px;
  overflow: hidden;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(200, 170, 110, 0.2);
}

.card-zoom-popup__img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
}

.card-zoom-enter-active { transition: opacity 0.1s ease, transform 0.1s ease; }
.card-zoom-leave-active { transition: opacity 0.08s ease; }
.card-zoom-enter-from  { opacity: 0; transform: scale(0.95); }
.card-zoom-leave-to    { opacity: 0; }
</style>
