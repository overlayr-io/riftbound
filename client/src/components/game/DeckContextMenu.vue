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
}>()

// ── Menu position adjustment ──────────────────────────────────────────────────

const menuRef = ref<HTMLElement | null>(null)
const adjustedX = ref(props.x)
const adjustedY = ref(props.y)

watch(
  () => [props.visible, props.x, props.y] as const,
  async ([visible, x, y]) => {
    if (!visible) { activeFlyout.value = null; return }
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

// ── Flyout (position: fixed, coordonnées viewport) ────────────────────────────

const activeFlyout = ref<'vision' | 'reveal' | 'draw' | null>(null)
const flyoutStyle = ref<Record<string, string>>({})

const FLYOUT_MAX: Record<string, number> = { vision: 5, reveal: 2, draw: 4 }

function flyoutCounts(action: 'vision' | 'reveal' | 'draw'): number[] {
  const max = Math.min(FLYOUT_MAX[action], props.deckCount)
  return Array.from({ length: max }, (_, i) => i + 1)
}

async function openFlyout(e: MouseEvent, action: 'vision' | 'reveal' | 'draw') {
  e.preventDefault()
  e.stopPropagation()
  if (activeFlyout.value === action) { activeFlyout.value = null; return }
  activeFlyout.value = action
  await nextTick()

  const flyoutEl = document.querySelector('.ctx-flyout-fixed') as HTMLElement | null
  if (!flyoutEl) return
  const menuEl = menuRef.value
  if (!menuEl) return

  const menuRect = menuEl.getBoundingClientRect()
  const fw = flyoutEl.offsetWidth || 210
  const fh = flyoutEl.offsetHeight || 90
  const vw = window.innerWidth
  const vh = window.innerHeight

  // Horizontal: à droite du menu si possible, sinon à gauche
  const spaceRight = vw - menuRect.right - 8
  const left = spaceRight >= fw
    ? menuRect.right + 4
    : menuRect.left - fw - 4

  // Vertical: aligner avec le haut de la row cliquée, clamper
  const rowEl = (e.currentTarget as HTMLElement).closest('.ctx-row') as HTMLElement
  const rowRect = rowEl?.getBoundingClientRect() ?? menuRect
  let top = rowRect.top
  if (top + fh > vh - 8) top = vh - 8 - fh
  if (top < 8) top = 8

  flyoutStyle.value = {
    position: 'fixed',
    left: left + 'px',
    top: top + 'px',
    zIndex: '9500',
  }
}

function onAction(action: 'vision' | 'reveal' | 'draw', count: number) {
  if (action === 'vision') emit('vision', count)
  else if (action === 'reveal') emit('reveal', count)
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

        <!-- Vision / Predict -->
        <div class="ctx-row" :class="{ 'ctx-row--active': activeFlyout === 'vision' }">
          <div class="ctx-main" @click="onAction('vision', 1)">
            <span class="ctx-icon">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            </span>
            <span class="ctx-label">Vision / Predict</span>
          </div>
          <button class="ctx-arrow-btn" @click="openFlyout($event, 'vision')">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
        </div>

        <div class="ctx-sep" />

        <!-- Révéler -->
        <div class="ctx-row" :class="{ 'ctx-row--active': activeFlyout === 'reveal' }">
          <div class="ctx-main" @click="onAction('reveal', 1)">
            <span class="ctx-icon">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/>
                <line x1="1" y1="1" x2="23" y2="23"/>
              </svg>
            </span>
            <span class="ctx-label">Révéler</span>
          </div>
          <button class="ctx-arrow-btn" @click="openFlyout($event, 'reveal')">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
        </div>

        <div class="ctx-sep" />

        <!-- Piocher -->
        <div class="ctx-row" :class="{ 'ctx-row--active': activeFlyout === 'draw' }">
          <div class="ctx-main" @click="onAction('draw', 1)">
            <span class="ctx-icon">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                <polyline points="8 17 12 21 16 17"/>
                <line x1="12" y1="3" x2="12" y2="21"/>
              </svg>
            </span>
            <span class="ctx-label">Piocher</span>
          </div>
          <button class="ctx-arrow-btn" @click="openFlyout($event, 'draw')">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
        </div>

      </div>

      <!-- Flyout en position fixed pour rester dans le viewport -->
      <Teleport to="body">
        <div v-if="activeFlyout" class="ctx-flyout-fixed" :style="flyoutStyle">
          <div class="ctx-flyout-title">
            {{ activeFlyout === 'vision' ? 'VISION' : activeFlyout === 'reveal' ? 'RÉVÉLER' : 'PIOCHER' }}
            — NOMBRE DE CARTES
          </div>
          <div class="ctx-flyout-pills">
            <button
              v-for="n in flyoutCounts(activeFlyout)"
              :key="n"
              class="ctx-pill"
              @click.stop="onAction(activeFlyout!, n)"
            >{{ n }}</button>
          </div>
        </div>
      </Teleport>

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

.ctx-row {
  display: flex;
  align-items: stretch;
  transition: background 0.1s;
}

.ctx-row:hover,
.ctx-row--active {
  background: rgba(200, 170, 110, 0.06);
}

.ctx-main {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 10px 7px 12px;
  flex: 1;
  cursor: pointer;
  color: #c8d8e0;
  font-size: 11px;
  transition: color 0.1s;
}

.ctx-main:hover {
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

.ctx-arrow-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  background: transparent;
  border: none;
  border-left: 1px solid rgba(200, 170, 110, 0.14);
  cursor: pointer;
  color: rgba(200, 170, 110, 0.4);
  padding: 0;
  transition: background 0.1s, color 0.1s;
}

.ctx-arrow-btn:hover {
  background: rgba(200, 170, 110, 0.10);
  color: #C8AA6E;
}

/* Flyout — rendu dans un second Teleport, position: fixed dans le script */
.ctx-flyout-fixed {
  min-width: 210px;
  padding: 6px 0 10px;
  background: linear-gradient(160deg, #0e2030 0%, #060d1a 100%);
  border: 1px solid rgba(200, 170, 110, 0.32);
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.85), 0 0 0 1px rgba(0, 0, 0, 0.4);
}

.ctx-flyout-title {
  padding: 5px 12px 8px;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.1em;
  color: #C8AA6E;
  text-transform: uppercase;
  border-bottom: 1px solid rgba(200, 170, 110, 0.12);
  margin-bottom: 8px;
}

.ctx-flyout-pills {
  display: flex;
  gap: 6px;
  padding: 0 12px;
  flex-wrap: wrap;
}

.ctx-pill {
  width: 32px;
  height: 28px;
  border-radius: 3px;
  border: 1px solid rgba(200, 170, 110, 0.25);
  background: rgba(200, 170, 110, 0.08);
  color: #C8AA6E;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.1s, border-color 0.1s;
}

.ctx-pill:hover {
  background: rgba(200, 170, 110, 0.22);
  border-color: rgba(200, 170, 110, 0.5);
}
</style>
