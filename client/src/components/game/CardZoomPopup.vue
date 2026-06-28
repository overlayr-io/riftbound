<script setup lang="ts">
import type { ZoomState } from '@/composables/useCardZoom'
import { KEYWORD_MAP } from '@/config/keywords'

defineProps<{ zoom: ZoomState | null }>()
</script>

<template>
  <Teleport to="body">
    <Transition name="card-zoom">
      <div
        v-if="zoom"
        class="card-zoom-popup"
        :class="{'card-zoom-popup-battlefield': zoom.cardType === 'battlefield'}"
        :style="{ left: zoom.x + 'px', top: zoom.y + 'px', width: zoom.w + 'px', height: zoom.h + 'px' }"
      >
        <img :src="zoom.imageUrl" alt="" class="card-zoom-popup__img" />

        <div v-if="zoom.keywords.length" class="kw-zoom-badges">
          <span
            v-for="kw in zoom.keywords"
            :key="kw"
            class="kw-zoom-badge"
            :style="{ '--kw-color': KEYWORD_MAP.get(kw)?.color ?? '#666' }"
          >{{ kw }}</span>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.card-zoom-popup {
  position: fixed;
  z-index: 9500;
  pointer-events: none;
  border-radius: 6px;
  overflow: hidden;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(200, 170, 110, 0.2);
}
.card-zoom-popup-battlefield {
  box-shadow: none !important;
}

.card-zoom-popup__img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
}

.kw-zoom-badges {
  position: absolute;
  top: 60px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 4px;
  width: 90%;
}

.kw-zoom-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 3px 10px;
  font-size: 14px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #fff;
  background: color-mix(in srgb, var(--kw-color) 80%, rgba(0, 0, 0, 0.4));
  clip-path: polygon(6px 0%, 100% 0%, calc(100% - 6px) 100%, 0% 100%);
  white-space: nowrap;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.6);
}

.card-zoom-enter-active { transition: opacity 0.1s ease, transform 0.1s ease; }
.card-zoom-leave-active { transition: opacity 0.08s ease; }
.card-zoom-enter-from  { opacity: 0; transform: scale(0.95); }
.card-zoom-leave-to    { opacity: 0; }
</style>
