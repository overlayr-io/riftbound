<script setup lang="ts">
import { ref, computed } from 'vue'
import type { CardState, CardVisibleTo } from '@riftbound/shared'
import { useGameStore } from '@/stores/game'

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

const activeSubmenu = ref<string | null>(null)

const menuStyle = computed(() => ({
  left: props.x + 'px',
  top: props.y + 'px',
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
  // top = order -1 (before all), bottom = max order handled by commitMove
  const round = gameStore.currentRound
  if (!round) return
  if (position === 'top') {
    const minOrder = Math.min(0, ...Object.values(round.cards).filter(c => c.zoneId === 'main_deck').map(c => c.order))
    gameStore.applyAction({ type: 'MOVE_CARD', playerId: props.currentPlayerId, cardId: props.card.cardId, fromZoneId: props.card.zoneId, toZoneId: 'main_deck' })
  } else {
    gameStore.applyAction({ type: 'MOVE_CARD', playerId: props.currentPlayerId, cardId: props.card.cardId, fromZoneId: props.card.zoneId, toZoneId: 'main_deck' })
  }
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
    // SELF — no dedicated action yet; piggyback on HIDE then adjust via direct update
    // For now treat SELF as REVEAL since there's no SET_VISIBLE_TO action
    gameStore.applyAction({ type: 'REVEAL_CARD', playerId: props.currentPlayerId, cardId: props.card.cardId })
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
      <div class="ctx-menu" :style="menuStyle" @mouseleave="activeSubmenu = null">

        <!-- Card name header -->
        <div class="ctx-header">
          {{ card.description.name || 'Carte' }}
        </div>
        <div class="ctx-header-sep" />

        <!-- Vers le deck -->
        <div
          class="ctx-item ctx-item--arrow"
          @mouseenter="activeSubmenu = 'deck'"
          @click="activeSubmenu = activeSubmenu === 'deck' ? null : 'deck'"
        >
          <span class="ctx-icon">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>
          </span>
          <span class="ctx-label">Vers le deck</span>
          <svg class="ctx-arrow-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>

          <div v-if="activeSubmenu === 'deck'" class="ctx-submenu">
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
        <div class="ctx-split-row" @mouseleave="activeSubmenu = activeSubmenu === 'visibleTo' ? 'visibleTo' : null">
          <div class="ctx-split-left" @click="toggleFace">
            <span class="ctx-icon">
              <svg v-if="canSeeFront" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
              <svg v-else width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            </span>
            <span class="ctx-label">{{ canSeeFront ? 'Cacher' : 'Révéler' }}</span>
          </div>
          <div
            class="ctx-split-right"
            @mouseenter="activeSubmenu = 'visibleTo'"
            @click.stop="activeSubmenu = activeSubmenu === 'visibleTo' ? null : 'visibleTo'"
          >
            <span class="ctx-split-right-label">Visible par</span>
            <svg class="ctx-arrow-icon" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>

            <div v-if="activeSubmenu === 'visibleTo'" class="ctx-submenu ctx-submenu--right">
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
  width: 258px;
  background: #0e1624;
  border: 1px solid rgba(255, 255, 255, 0.09);
  border-radius: 10px;
  padding: 6px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.75), 0 0 0 1px rgba(255,255,255,0.04);
  user-select: none;
  font-family: inherit;
}

.ctx-header {
  padding: 10px 12px 8px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #c8a94a;
}

.ctx-header-sep {
  height: 1px;
  background: rgba(200, 169, 74, 0.2);
  margin: 0 0 4px;
}

.ctx-sep {
  height: 1px;
  background: rgba(255, 255, 255, 0.07);
  margin: 4px 0;
}

.ctx-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 12px;
  border-radius: 6px;
  cursor: pointer;
  color: rgba(255, 255, 255, 0.80);
  font-size: 13.5px;
  position: relative;
  transition: background 0.1s;
}

.ctx-item:hover,
.ctx-item--arrow:hover {
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.95);
}

.ctx-item--stepper {
  cursor: default;
}
.ctx-item--stepper:hover {
  background: rgba(255, 255, 255, 0.03);
}

.ctx-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  flex-shrink: 0;
  color: rgba(255, 255, 255, 0.38);
}

.ctx-item:hover .ctx-icon,
.ctx-item--arrow:hover .ctx-icon {
  color: rgba(255, 255, 255, 0.60);
}

.ctx-label {
  flex: 1;
}

.ctx-arrow-icon {
  color: rgba(255, 255, 255, 0.30);
  flex-shrink: 0;
}

/* Split button */
.ctx-split-row {
  display: flex;
  border-radius: 6px;
  overflow: visible;
  position: relative;
}

.ctx-split-left {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 12px;
  flex: 1;
  cursor: pointer;
  color: rgba(255, 255, 255, 0.80);
  font-size: 13.5px;
  border-radius: 6px 0 0 6px;
  transition: background 0.1s;
}

.ctx-split-left:hover {
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.95);
}

.ctx-split-left .ctx-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  flex-shrink: 0;
  color: rgba(255, 255, 255, 0.38);
}

.ctx-split-right {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 9px 10px;
  cursor: pointer;
  color: rgba(255, 255, 255, 0.42);
  font-size: 12px;
  border-left: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 0 6px 6px 0;
  transition: background 0.1s, color 0.1s;
  position: relative;
}

.ctx-split-right:hover {
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.80);
}

.ctx-split-right-label {
  white-space: nowrap;
}

/* Steppers */
.ctx-stepper {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-left: auto;
}

.ctx-btn {
  width: 26px;
  height: 26px;
  border-radius: 5px;
  border: 1px solid;
  font-size: 16px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.1s;
  font-weight: 500;
}

.ctx-btn--neutral {
  border-color: rgba(255, 255, 255, 0.16);
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.65);
}
.ctx-btn--neutral:hover {
  background: rgba(255, 255, 255, 0.13);
  color: rgba(255, 255, 255, 0.9);
}

.ctx-btn--dmg {
  border-color: rgba(210, 60, 60, 0.45);
  background: rgba(210, 60, 60, 0.10);
  color: rgba(255, 110, 110, 0.9);
}
.ctx-btn--dmg:hover {
  background: rgba(210, 60, 60, 0.20);
}

.ctx-btn--plus.ctx-btn--neutral {
  border-color: rgba(80, 200, 120, 0.35);
  background: rgba(80, 200, 120, 0.08);
  color: rgba(100, 220, 140, 0.9);
}
.ctx-btn--plus.ctx-btn--neutral:hover {
  background: rgba(80, 200, 120, 0.17);
}

.ctx-btn--plus.ctx-btn--dmg {
  border-color: rgba(210, 60, 60, 0.45);
  background: rgba(210, 60, 60, 0.10);
  color: rgba(255, 110, 110, 0.9);
}

.ctx-val {
  width: 22px;
  text-align: center;
  font-size: 13px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.88);
}

/* Submenus */
.ctx-submenu {
  position: absolute;
  left: calc(100% + 6px);
  top: -6px;
  min-width: 210px;
  background: #0e1624;
  border: 1px solid rgba(255, 255, 255, 0.09);
  border-radius: 10px;
  padding: 6px;
  box-shadow: 0 16px 50px rgba(0, 0, 0, 0.7);
  z-index: 10;
}

.ctx-submenu-title {
  padding: 8px 12px 6px;
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.1em;
  color: #c8a94a;
  text-transform: uppercase;
}

/* Radio items */
.ctx-item--check {
  gap: 12px;
}

.ctx-radio {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 1.5px solid rgba(255, 255, 255, 0.22);
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: border-color 0.15s, background 0.15s;
  background: transparent;
}

.ctx-radio--on {
  border-color: #c8a94a;
}

.ctx-radio-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #c8a94a;
}
</style>
