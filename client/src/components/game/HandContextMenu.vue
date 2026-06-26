<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'

const props = defineProps<{
  visible: boolean
  x: number
  y: number
}>()

const emit = defineEmits<{
  close: []
  revealAll: []
  hideSelf: []
  shuffle: []
}>()

const menuRef = ref<HTMLElement | null>(null)
const adjustedX = ref(props.x)
const adjustedY = ref(props.y)

watch(
  () => [props.visible, props.x, props.y] as const,
  async ([visible, x, y]) => {
    if (!visible) return
    adjustedX.value = x
    adjustedY.value = y
    await nextTick()
    const el = menuRef.value
    if (!el) return
    const { width, height } = el.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight
    if (x + width > vw) adjustedX.value = vw - width - 8
    if (y + height > vh) adjustedY.value = vh - height - 8
    if (adjustedX.value < 8) adjustedX.value = 8
    if (adjustedY.value < 8) adjustedY.value = 8
  },
  { immediate: true },
)

const menuStyle = computed(() => ({
  left: adjustedX.value + 'px',
  top: adjustedY.value + 'px',
}))

function onOverlay(e: MouseEvent) {
  if (e.target === e.currentTarget) emit('close')
}

function action(fn: () => void) {
  fn()
  emit('close')
}
</script>

<template>
  <Teleport to="body">
    <div v-if="visible" class="ctx-overlay" @mousedown="onOverlay">
      <div ref="menuRef" class="ctx-menu" :style="menuStyle">

        <div class="ctx-header">Ma main</div>
        <div class="ctx-header-sep" />

        <div class="ctx-item" @click="action(() => emit('revealAll'))">
          <span class="ctx-icon">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          </span>
          <span class="ctx-label">Révéler ma main</span>
        </div>

        <div class="ctx-item" @click="action(() => emit('hideSelf'))">
          <span class="ctx-icon">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
          </span>
          <span class="ctx-label">Cacher ma main</span>
        </div>

        <div class="ctx-sep" />

        <div class="ctx-item" @click="action(() => emit('shuffle'))">
          <span class="ctx-icon">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/></svg>
          </span>
          <span class="ctx-label">Mélanger ma main</span>
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
  transition: background 0.1s, color 0.1s;
}

.ctx-item:hover {
  background: rgba(200, 170, 110, 0.08);
  color: #F2E5CD;
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

.ctx-badge {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.05em;
  color: rgba(200, 170, 110, 0.7);
  background: rgba(200, 170, 110, 0.1);
  border: 1px solid rgba(200, 170, 110, 0.22);
  border-radius: 2px;
  padding: 1px 4px;
  flex-shrink: 0;
}
</style>
