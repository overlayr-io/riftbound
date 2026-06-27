<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'

const props = defineProps<{
  visible: boolean
  x: number
  y: number
  deckCount: number
}>()

const emit = defineEmits<{
  close: []
  vision: [count: number]
  reveal: [count: number]
  draw: [count: number]
  'draw-bottom': [count: number]
}>()

const activeSubmenu = ref<'vision' | 'reveal' | 'draw' | 'draw-bottom' | null>(null)

let closeTimer: ReturnType<typeof setTimeout> | null = null

function scheduleClose() {
  closeTimer = setTimeout(() => {
    activeSubmenu.value = null
  }, 150)
}

function cancelClose() {
  if (closeTimer) {
    clearTimeout(closeTimer)
    closeTimer = null
  }
}

// ── Menu position adjustment ──────────────────────────────────────────────────

const menuRef = ref<HTMLElement | null>(null)
const adjustedX = ref(props.x)
const adjustedY = ref(props.y)

watch(
    () => [props.visible, props.x, props.y] as const,
    async ([visible, x, y]) => {
      if (!visible) {
        activeSubmenu.value = null
        return
      }
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

const FLYOUT_MAX: Record<string, number> = { vision: 5, reveal: 2, draw: 4, 'draw-bottom': 4 }

function flyoutCounts(action: 'vision' | 'reveal' | 'draw' | 'draw-bottom'): number[] {
  const max = Math.min(FLYOUT_MAX[action], props.deckCount)
  return Array.from({ length: max }, (_, i) => i + 1)
}

function onAction(action: 'vision' | 'reveal' | 'draw' | 'draw-bottom', count: number) {
  if (action === 'vision') emit('vision', count)
  else if (action === 'reveal') emit('reveal', count)
  else if (action === 'draw-bottom') emit('draw-bottom', count)
  else emit('draw', count)
  emit('close')
}

function onOverlay(e: MouseEvent) {
  if (e.target === e.currentTarget) emit('close')
}
</script>

<template>
  <Teleport to="body">
    <div v-if="visible" class="ctx-overlay" @mousedown="onOverlay">
      <div ref="menuRef" class="ctx-menu" :style="menuStyle">

        <div class="ctx-header">Deck ({{ deckCount }} cartes)</div>
        <div class="ctx-header-sep" />

        <div
            class="ctx-item ctx-item--arrow"
            @mouseenter="cancelClose(); activeSubmenu = 'vision'"
        >
          <span class="ctx-icon">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          </span>

          <span class="ctx-label" @click.stop="onAction('vision', 1)">Vision / Predict</span>

          <div class="ctx-arrow-zone" @click.stop="activeSubmenu = activeSubmenu === 'vision' ? null : 'vision'">
            <svg class="ctx-arrow-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </div>

          <div v-if="activeSubmenu === 'vision'" class="ctx-submenu" @mouseenter="cancelClose" @mouseleave="scheduleClose">
            <div class="ctx-submenu-title">VISION / PREDICT</div>
            <div v-for="n in flyoutCounts('vision')" :key="n" class="ctx-item" @click.stop="onAction('vision', n)">
              {{ n }} carte{{ n > 1 ? 's' : '' }}
            </div>
          </div>
        </div>

        <div class="ctx-item ctx-item--arrow" @mouseenter="cancelClose(); activeSubmenu = 'reveal'">
          <span class="ctx-icon">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/>
              <line x1="1" y1="1" x2="23" y2="23"/>
            </svg>
          </span>

          <span class="ctx-label" @click.stop="onAction('reveal', 1)">Révéler</span>

          <div class="ctx-arrow-zone" @click.stop="activeSubmenu = activeSubmenu === 'reveal' ? null : 'reveal'">
            <svg class="ctx-arrow-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </div>

          <div v-if="activeSubmenu === 'reveal'" class="ctx-submenu" @mouseenter="cancelClose" @mouseleave="scheduleClose">
            <div class="ctx-submenu-title">REVELER</div>
            <div v-for="n in flyoutCounts('reveal')" :key="n" class="ctx-item" @click.stop="onAction('reveal', n)">
              {{ n }} carte{{ n > 1 ? 's' : '' }}
            </div>
          </div>
        </div>

        <div class="ctx-item ctx-item--arrow" @mouseenter="cancelClose(); activeSubmenu = 'draw'">
          <span class="ctx-icon">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <polyline points="8 17 12 21 16 17"/>
              <line x1="12" y1="3" x2="12" y2="21"/>
            </svg>
          </span>

          <span class="ctx-label" @click.stop="onAction('draw', 1)">Piocher</span>

          <div class="ctx-arrow-zone" @click.stop="activeSubmenu = activeSubmenu === 'draw' ? null : 'draw'">
            <svg class="ctx-arrow-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </div>

          <div v-if="activeSubmenu === 'draw'" class="ctx-submenu" @mouseenter="cancelClose" @mouseleave="scheduleClose">
            <div class="ctx-submenu-title">PIOCHER</div>
            <div v-for="n in flyoutCounts('draw')" :key="n" class="ctx-item" @click.stop="onAction('draw', n)">
              {{ n }} carte{{ n > 1 ? 's' : '' }}
            </div>
          </div>
        </div>

        <div class="ctx-item ctx-item--arrow" @mouseenter="cancelClose(); activeSubmenu = 'draw-bottom'">
          <span class="ctx-icon">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <polyline points="8 17 12 21 16 17"/>
              <line x1="12" y1="3" x2="12" y2="21"/>
              <line x1="5" y1="21" x2="19" y2="21"/>
            </svg>
          </span>

          <span class="ctx-label" @click.stop="onAction('draw-bottom', 1)">Piocher en dessous</span>

          <div class="ctx-arrow-zone" @click.stop="activeSubmenu = activeSubmenu === 'draw-bottom' ? null : 'draw-bottom'">
            <svg class="ctx-arrow-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </div>

          <div v-if="activeSubmenu === 'draw-bottom'" class="ctx-submenu" @mouseenter="cancelClose" @mouseleave="scheduleClose">
            <div class="ctx-submenu-title">PIOCHER EN DESSOUS</div>
            <div v-for="n in flyoutCounts('draw-bottom')" :key="n" class="ctx-item" @click.stop="onAction('draw-bottom', n)">
              {{ n }} carte{{ n > 1 ? 's' : '' }}
            </div>
          </div>
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
  width: 200px;
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

.ctx-item--arrow {
  padding-right: 0;
}

.ctx-arrow-zone {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  align-self: stretch;
  border-left: 1px solid rgba(200, 170, 110, 0.14);
}

.ctx-arrow-icon {
  color: rgba(200, 170, 110, 0.45);
}

.ctx-submenu {
  position: absolute;
  right: calc(100% + 4px);
  bottom: -4px;
  min-width: 180px;
  padding: 4px 0;
  background: linear-gradient(160deg, #0e2030 0%, #060d1a 100%);
  border: 1px solid rgba(200, 170, 110, 0.32);
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(0, 0, 0, 0.4);
  z-index: 10;
}

.ctx-submenu-title {
  padding: 5px 12px 6px;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.1em;
  color: #C8AA6E;
  text-transform: uppercase;
  border-bottom: 1px solid rgba(200, 170, 110, 0.12);
  margin-bottom: 2px;
}
</style>
