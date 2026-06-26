<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import type { CardState, CardVisibleTo } from '@riftbound/shared'
import { useGameStore } from '@/stores/game'
import { useBoardShortcuts } from '@/composables/useBoardShortcuts'

const props = defineProps<{
  visible: boolean
  card: CardState | null
  x: number
  y: number
  currentPlayerId: string
}>()

const emit = defineEmits<{
  close: []
}>()

const gameStore = useGameStore()
const shortcuts = useBoardShortcuts()

const hasChildren = computed(() => (props.card?.state.groupTo?.length ?? 0) > 0)
const isLoaned = computed(() => !!props.card?.loanedFromId)

function returnControl() {
  if (!props.card) return
  gameStore.applyAction({ type: 'RETURN_CONTROL', playerId: props.currentPlayerId, cardId: props.card.cardId })
  emit('close')
}

const isChild = computed(() => {
  if (!props.card) return false
  return Object.values(gameStore.currentRound?.cards ?? {}).some(
    c => c.state.groupTo?.includes(props.card!.cardId)
  )
})

function startGrouping() {
  if (!props.card) return
  emit('close')
  shortcuts.activateWithSeed('g', props.card)
}

function ungroup() {
  if (!props.card) return
  gameStore.applyAction({ type: 'UNGROUP_CARD', playerId: props.currentPlayerId, cardId: props.card.cardId })
  emit('close')
}

const activeSubmenu = ref<string | null>(null)
let closeTimer: ReturnType<typeof setTimeout> | null = null

function scheduleClose() {
  closeTimer = setTimeout(() => { activeSubmenu.value = null }, 150)
}

function cancelClose() {
  if (closeTimer) { clearTimeout(closeTimer); closeTimer = null }
}
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

const canSeeFront = computed(() => {
  if (!props.card) return false
  const v = props.card.state.visibleTo
  if (v === 'ALL') return true
  if (v === 'NOBODY') return false
  return props.card.controllerId === props.currentPlayerId
})

function onOverlay(e: MouseEvent) {
  if (e.target === e.currentTarget) emit('close')
}

// ── Deck ─────────────────────────────────────────────────────────────────────

function sendToDeck(position: 'top' | 'bottom') {
  if (!props.card) return
  gameStore.sendToDeck(props.card.cardId, 'main_deck', position)
  emit('close')
}

// ── Visibility ────────────────────────────────────────────────────────────────

const visibleTo = computed(() => props.card?.state.visibleTo ?? 'NOBODY')

function setVisibleTo(value: CardVisibleTo) {
  if (!props.card) return
  if (value === 'NOBODY') {
    gameStore.applyAction({ type: 'HIDE_CARD', playerId: props.currentPlayerId, cardId: props.card.cardId })
  } else if (value === 'ALL') {
    gameStore.applyAction({ type: 'REVEAL_CARD', playerId: props.currentPlayerId, cardId: props.card.cardId })
  } else {
    gameStore.applyAction({ type: 'REVEAL_CARD_FOR_SELF', playerId: props.currentPlayerId, cardId: props.card.cardId })
  }
}

function toggleFace() {
  if (!props.card) return
  if (canSeeFront.value) {
    gameStore.applyAction({ type: 'HIDE_CARD', playerId: props.currentPlayerId, cardId: props.card.cardId })
  } else {
    gameStore.applyAction({ type: 'REVEAL_CARD', playerId: props.currentPlayerId, cardId: props.card.cardId })
  }
}

// ── Counters ──────────────────────────────────────────────────────────────────

function adjustCounter(field: 'counters' | 'damages' | 'buffs', delta: number) {
  if (!props.card) return
  const current = props.card.state[field] ?? 0
  const next = Math.max(0, current + delta)
  if (field === 'counters') {
    gameStore.applyAction({ type: 'SET_COUNTERS', playerId: props.currentPlayerId, cardId: props.card.cardId, value: next || null })
  } else if (field === 'damages') {
    gameStore.applyAction({ type: 'SET_DAMAGES', playerId: props.currentPlayerId, cardId: props.card.cardId, value: next || null })
  } else {
    gameStore.applyAction({ type: 'SET_BUFF', playerId: props.currentPlayerId, cardId: props.card.cardId, value: next || null })
  }
}
</script>

<template>
  <Teleport to="body">
    <div v-if="visible && card" class="ctx-overlay" @mousedown="onOverlay">
      <div ref="menuRef" class="ctx-menu" :style="menuStyle" @mouseleave="scheduleClose" @mouseenter="cancelClose">

        <!-- Card name header -->
        <div class="ctx-header">
          {{ card.description.name || 'Carte' }}
        </div>
        <div class="ctx-header-sep" />

        <!-- Retourner chez le propriétaire (carte sous contrôle) -->
        <template v-if="isLoaned">
          <div class="ctx-item ctx-item--return" @click="returnControl">
            <span class="ctx-icon">
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8 L8 3 L8 6 C12 6 14 9 14 13 C12 10 9 9 8 9 L8 13 Z"/></svg>
            </span>
            <span class="ctx-label">Retourner chez le propriétaire</span>
          </div>
          <div class="ctx-sep" />
        </template>

        <!-- Vers le deck -->
        <div
          class="ctx-item ctx-item--arrow"
          @mouseenter="cancelClose(); activeSubmenu = 'deck'"
          @click="activeSubmenu = activeSubmenu === 'deck' ? null : 'deck'"
        >
          <span class="ctx-icon">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>
          </span>
          <span class="ctx-label">Vers le deck</span>
          <svg class="ctx-arrow-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>

          <div v-if="activeSubmenu === 'deck'" class="ctx-submenu" @mouseenter="cancelClose" @mouseleave="scheduleClose">
            <div class="ctx-submenu-title">VERS LE DECK</div>
            <div class="ctx-item" @click.stop="sendToDeck('top')">
              <span class="ctx-icon">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><polyline points="17 11 12 6 7 11"/><line x1="12" y1="6" x2="12" y2="20"/></svg>
              </span>
              <span class="ctx-label">Au-dessus du deck</span>
            </div>
            <div class="ctx-item" @click.stop="sendToDeck('bottom')">
              <span class="ctx-icon">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><polyline points="17 13 12 18 7 13"/><line x1="12" y1="4" x2="12" y2="18"/></svg>
              </span>
              <span class="ctx-label">En-dessous du deck</span>
            </div>
          </div>
        </div>

        <div class="ctx-sep" />

        <!-- Split: face toggle | Visible par -->
        <div class="ctx-split-row">
          <div class="ctx-split-left" @click="toggleFace">
            <span class="ctx-icon">
              <svg v-if="canSeeFront" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
              <svg v-else width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            </span>
            <span class="ctx-label">{{ canSeeFront ? 'Cacher' : 'Révéler' }}</span>
          </div>
          <div
            class="ctx-split-right"
            @mouseenter="cancelClose(); activeSubmenu = 'visibleTo'"
            @click.stop="activeSubmenu = activeSubmenu === 'visibleTo' ? null : 'visibleTo'"
          >
            <span class="ctx-split-right-label">Visible par</span>
            <svg class="ctx-arrow-icon" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>

            <div v-if="activeSubmenu === 'visibleTo'" class="ctx-submenu ctx-submenu--right" @mouseenter="cancelClose" @mouseleave="scheduleClose">
              <div class="ctx-item ctx-item--check" @click.stop="setVisibleTo('ALL')">
                <span class="ctx-radio" :class="{ 'ctx-radio--on': visibleTo === 'ALL' }">
                  <span v-if="visibleTo === 'ALL'" class="ctx-radio-dot" />
                </span>
                <span class="ctx-label">Tout le monde</span>
              </div>
              <div class="ctx-item ctx-item--check" @click.stop="setVisibleTo('SELF')">
                <span class="ctx-radio" :class="{ 'ctx-radio--on': visibleTo === 'SELF' }">
                  <span v-if="visibleTo === 'SELF'" class="ctx-radio-dot" />
                </span>
                <span class="ctx-label">Seulement vous</span>
              </div>
              <div class="ctx-item ctx-item--check" @click.stop="setVisibleTo('NOBODY')">
                <span class="ctx-radio" :class="{ 'ctx-radio--on': visibleTo === 'NOBODY' }">
                  <span v-if="visibleTo === 'NOBODY'" class="ctx-radio-dot" />
                </span>
                <span class="ctx-label">Personne</span>
              </div>
            </div>
          </div>
        </div>

        <div class="ctx-sep" />

        <!-- Compteurs -->
        <div class="ctx-item ctx-item--stepper">
          <span class="ctx-icon">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="12" y1="8" x2="12" y2="16"/></svg>
          </span>
          <span class="ctx-label">Compteurs</span>
          <div class="ctx-stepper">
            <button class="ctx-btn ctx-btn--neutral" @click.stop="adjustCounter('counters', -1)">−</button>
            <span class="ctx-val">{{ card.state.counters ?? 0 }}</span>
            <button class="ctx-btn ctx-btn--neutral ctx-btn--plus" @click.stop="adjustCounter('counters', 1)">+</button>
          </div>
        </div>

        <!-- Dégâts -->
        <div class="ctx-item ctx-item--stepper">
          <span class="ctx-icon">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
          </span>
          <span class="ctx-label">Dégâts</span>
          <div class="ctx-stepper">
            <button class="ctx-btn ctx-btn--dmg" @click.stop="adjustCounter('damages', -1)">−</button>
            <span class="ctx-val">{{ card.state.damages ?? 0 }}</span>
            <button class="ctx-btn ctx-btn--dmg ctx-btn--plus" @click.stop="adjustCounter('damages', 1)">+</button>
          </div>
        </div>

        <!-- Buff -->
        <div class="ctx-item ctx-item--stepper">
          <span class="ctx-icon">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          </span>
          <span class="ctx-label">Buff</span>
          <div class="ctx-stepper">
            <button class="ctx-btn ctx-btn--neutral" @click.stop="adjustCounter('buffs', -1)">−</button>
            <span class="ctx-val">{{ card.state.buffs ?? 0 }}</span>
            <button class="ctx-btn ctx-btn--neutral ctx-btn--plus" @click.stop="adjustCounter('buffs', 1)">+</button>
          </div>
        </div>

        <div class="ctx-sep" />

        <!-- Grouper -->
        <div class="ctx-item ctx-item--group" @click="startGrouping">
          <span class="ctx-icon">
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="5" width="7" height="9" rx="1"/><rect x="8" y="2" width="7" height="9" rx="1"/></svg>
          </span>
          <span class="ctx-label">Grouper</span>
          <kbd class="ctx-kbd">G</kbd>
        </div>

        <!-- Dégrouper (parent avec enfants) -->
        <div v-if="hasChildren" class="ctx-item ctx-item--ungroup" @click="ungroup">
          <span class="ctx-icon">
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="5" width="7" height="9" rx="1"/><rect x="8" y="2" width="7" height="9" rx="1"/><line x1="1" y1="1" x2="15" y2="15"/></svg>
          </span>
          <span class="ctx-label">Dégrouper tout</span>
        </div>

        <!-- Retirer du groupe (enfant) -->
        <div v-if="isChild" class="ctx-item ctx-item--ungroup" @click="ungroup">
          <span class="ctx-icon">
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="5" width="7" height="9" rx="1"/><rect x="8" y="2" width="7" height="9" rx="1"/><line x1="1" y1="1" x2="15" y2="15"/></svg>
          </span>
          <span class="ctx-label">Retirer du groupe</span>
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

.ctx-item:hover,
.ctx-item--arrow:hover {
  background: rgba(200, 170, 110, 0.08);
  color: #F2E5CD;
}

.ctx-item--stepper {
  cursor: default;
}
.ctx-item--stepper:hover {
  background: transparent;
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

.ctx-arrow-icon {
  color: rgba(200, 170, 110, 0.45);
  flex-shrink: 0;
}

/* Split button */
.ctx-split-row {
  display: flex;
  overflow: visible;
  position: relative;
}

.ctx-split-left {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  flex: 1;
  cursor: pointer;
  color: #c8d8e0;
  font-size: 11px;
  transition: background 0.1s, color 0.1s;
}

.ctx-split-left:hover {
  background: rgba(200, 170, 110, 0.08);
  color: #F2E5CD;
}

.ctx-split-left .ctx-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 13px;
  height: 13px;
  flex-shrink: 0;
  opacity: 0.7;
}

.ctx-split-right {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 6px 10px;
  cursor: pointer;
  color: #6a8a90;
  font-size: 10px;
  border-left: 1px solid rgba(200, 170, 110, 0.14);
  transition: background 0.1s, color 0.1s;
  position: relative;
}

.ctx-split-right:hover {
  background: rgba(200, 170, 110, 0.08);
  color: #c8d8e0;
}

.ctx-split-right-label {
  white-space: nowrap;
}

/* Steppers */
.ctx-stepper {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-left: auto;
}

.ctx-btn {
  width: 20px;
  height: 20px;
  border-radius: 3px;
  border: 1px solid;
  font-size: 14px;
  font-weight: 700;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.1s;
}

.ctx-btn--neutral {
  border-color: rgba(200, 170, 110, 0.25);
  background: rgba(200, 170, 110, 0.10);
  color: #C8AA6E;
}
.ctx-btn--neutral:hover {
  background: rgba(200, 170, 110, 0.22);
}

.ctx-btn--dmg {
  border-color: rgba(200, 60, 60, 0.25);
  background: rgba(200, 60, 60, 0.10);
  color: #e06060;
}
.ctx-btn--dmg:hover {
  background: rgba(200, 60, 60, 0.22);
}

.ctx-btn--plus.ctx-btn--neutral {
  border-color: rgba(200, 170, 110, 0.25);
  background: rgba(200, 170, 110, 0.10);
  color: #C8AA6E;
}
.ctx-btn--plus.ctx-btn--neutral:hover {
  background: rgba(200, 170, 110, 0.22);
}

.ctx-btn--plus.ctx-btn--dmg {
  border-color: rgba(200, 60, 60, 0.25);
  background: rgba(200, 60, 60, 0.10);
  color: #e06060;
}

.ctx-val {
  min-width: 20px;
  text-align: center;
  font-size: 13px;
  font-weight: 700;
  color: #F2E5CD;
  line-height: 1;
}

/* Submenus */
.ctx-submenu {
  position: absolute;
  left: calc(100% + 4px);
  top: -4px;
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

/* Radio items */
.ctx-item--check {
  gap: 10px;
}

.ctx-radio {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 1.5px solid rgba(200, 170, 110, 0.3);
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: border-color 0.15s;
  background: transparent;
}

.ctx-radio--on {
  border-color: #C8AA6E;
}

.ctx-radio-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #C8AA6E;
}

.ctx-kbd {
  font-size: 9px;
  padding: 1px 5px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 3px;
  color: rgba(255, 255, 255, 0.35);
  font-family: inherit;
  letter-spacing: 0.04em;
}

.ctx-item--group:hover  { color: #a0e8c0; background: rgba(60, 200, 130, 0.07); }
.ctx-item--ungroup      { color: #8aabb0; font-size: 10px; }
.ctx-item--ungroup:hover { color: #e09060; background: rgba(200, 100, 60, 0.07); }
.ctx-item--return       { color: #a0c8e0; }
.ctx-item--return:hover  { color: #60b8f0; background: rgba(60, 140, 200, 0.1); }
</style>
