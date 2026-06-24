<script setup lang="ts">
import { computed, inject, ref } from 'vue'
import type { CardState } from '@riftbound/shared'
import type { CardLayout } from '@/types/card.type'
import { DRAG_KEY, GAME_ACTIONS_KEY } from '@/composables/useDrag'
import { useBoardShortcuts } from '@/composables/useBoardShortcuts'
import { PING_ARROW_KEY, type PingArrowContext } from '@/composables/useGamePingArrow'
import cardBack from '@/assets/img/card_back.png'
import runeIcon from '@/assets/img/rune_icon.png'
import CardContextMenu from '@/components/game/CardContextMenu.vue'

const props = defineProps<{
  card: CardState
  layout: CardLayout
  currentPlayerId: string
}>()

const drag = inject(DRAG_KEY)
const actions = inject(GAME_ACTIONS_KEY)
const pingArrow = inject<PingArrowContext>(PING_ARROW_KEY)
const { activeKey, handleCardClick } = useBoardShortcuts()

// ── Visibility ──────────────────────────────────────────────────────────────

const isOwned = computed(() => props.card.controllerId === props.currentPlayerId)
const isBeingDragged = computed(() => drag?.dragging.value?.cardId === props.card.cardId)
const isDropInvalid = computed(() =>
  isBeingDragged.value &&
  drag?.hoveredZone.value !== null &&
  drag?.hoveredZoneValid.value === false,
)
const isHovered = ref(false)
const isPinged = computed(() => pingArrow?.pinggedCardIds.value.has(props.card.cardId) ?? false)
const isArrowTarget = computed(() =>
  pingArrow?.arrowGroups.value.some(g => g.targetCardIds.includes(props.card.cardId)) ?? false
)
const isLocalTarget = computed(() => pingArrow?.localTargets.value.has(props.card.cardId) ?? false)
const isArrowSource = computed(() =>
  pingArrow?.arrowGroups.value.some(g => g.sourceCardId === props.card.cardId) ||
  pingArrow?.localSourceCardId.value === props.card.cardId
)
const isArrowMode = computed(() => pingArrow?.isArrowMode.value ?? false)

const canSeeFront = computed(() => {
  const v = props.card.state.visibleTo
  if (v === 'ALL') return true
  if (v === 'NOBODY') return false
  return props.card.controllerId === props.currentPlayerId
})

const innerStyle = computed(() => ({
  transform: canSeeFront.value ? 'rotateY(0deg)' : 'rotateY(180deg)',
}))

// ── Style ───────────────────────────────────────────────────────────────────

function rotStr(rotation?: number, cssRotation?: number): string {
  const base = rotation ? ` rotateZ(${rotation}deg)` : ''
  const css  = cssRotation ? ` rotateZ(${cssRotation}deg)` : ''
  return base + css
}

const runeTokenOpacity = computed(() =>
  props.card.isToken && props.card.description.type === 'rune' ? 0.7 : 1
)

const style = computed(() => {
  if (!isOwned.value) {
    const L = props.layout
    return {
      transform: `translate3d(${L.x}px, ${L.y}px, 0)${rotStr(L.rotation, L.cssRotation)}`,
      width: L.w + 'px',
      height: L.h + 'px',
      zIndex: L.z,
      opacity: runeTokenOpacity.value,
      // Explicit transition so opponent card movements animate when Firestore updates
      transition: 'transform 0.3s var(--ease)',
    }
  }

  if (isBeingDragged.value && drag?.dragging.value) {
    const d = drag.dragging.value
    return {
      transform: `translate3d(${d.x}px, ${d.y}px, 0)${rotStr(d.rotation, d.cssRotation)} scale(1.04)`,
      width: d.w + 'px',
      height: d.h + 'px',
      zIndex: 9999,
      transition: 'none',
      cursor: isDropInvalid.value ? 'not-allowed' : 'grabbing',
      filter: isDropInvalid.value
        ? 'drop-shadow(0 8px 16px rgba(255,60,60,0.5))'
        : 'drop-shadow(0 12px 24px rgba(0,0,0,0.5))',
    }
  }

  const L = props.layout
  const isInHand = props.card.zoneId === 'hand' && isOwned.value
  const liftY = isInHand && isHovered.value && !isBeingDragged.value ? -24 : 0

  return {
    transform: `translate3d(${L.x}px, ${L.y + liftY}px, 0)${rotStr(L.rotation, L.cssRotation)}`,
    width: L.w + 'px',
    height: L.h + 'px',
    zIndex: L.z,
    opacity: runeTokenOpacity.value,
    cursor: isOwned.value && activeKey.value ? 'crosshair' : undefined,
    filter: isOwned.value && activeKey.value && isHovered.value
      ? 'drop-shadow(0 0 10px rgba(192, 57, 43, 0.6))'
      : undefined,
  }
})

// ── Interactions ─────────────────────────────────────────────────────────────

const EXHAUSTABLE_ZONES = new Set(['base', 'runes', 'legend', 'battlefield', 'battlefield_owner', 'battlefield_opponent'])
const NON_DRAGGABLE_ZONES = new Set(['legend'])

function toggleExhausted() {
  if (!EXHAUSTABLE_ZONES.has(props.card.zoneId)) return
  actions?.applyAction({ type: 'TOGGLE_EXHAUSTED', playerId: props.card.controllerId, cardId: props.card.cardId })
}

function onPointerDown(e: PointerEvent) {
  if (e.button !== 0) return

  if (isArrowMode.value) {
    e.preventDefault()
    e.stopPropagation()
    pingArrow?.toggleTarget(props.card.cardId)
    return
  }

  if (!isOwned.value) return

  if (activeKey.value) {
    e.preventDefault()
    e.stopPropagation()
    handleCardClick(props.card)
    return
  }

  if (NON_DRAGGABLE_ZONES.has(props.card.zoneId)) return
  drag?.onPointerDown(e, props.card.cardId, props.card.ownerId, props.layout, toggleExhausted)
}

function onPingClick(e: MouseEvent) {
  e.preventDefault()
  e.stopPropagation()
  pingArrow?.sendPing(props.card.cardId)
}

function onArrowClick(e: MouseEvent) {
  e.preventDefault()
  e.stopPropagation()
  if (isArrowMode.value) {
    pingArrow?.toggleTarget(props.card.cardId)
  } else {
    pingArrow?.startArrowMode(props.card.cardId)
  }
}

function onClick() {
  if (!isOwned.value) return
  if (!NON_DRAGGABLE_ZONES.has(props.card.zoneId)) return
  toggleExhausted()
}

// ── Context menu ──────────────────────────────────────────────────────────────

const RUNE_ZONES = new Set(['runes', 'runes_deck'])

const isRuneInPlay = computed(() =>
  props.card.zoneId === 'runes' &&
  props.card.description.type === 'rune' &&
  isOwned.value
)

function onRecycleRune(e: MouseEvent) {
  e.preventDefault()
  e.stopPropagation()
  actions?.applyAction({ type: 'RECYCLE_RUNE', playerId: props.card.controllerId, cardId: props.card.cardId })
}

function onRecycleAndToken(e: MouseEvent) {
  e.preventDefault()
  e.stopPropagation()
  // Create a ghost token copy first, then recycle the original
  actions?.applyAction({
    type: 'CREATE_TOKEN',
    playerId: props.card.controllerId,
    cardId: `rune_token_${props.card.cardId}_${Date.now()}`,
    name: props.card.description.name,
    cardType: props.card.description.type,
    imageUrl: props.card.description.imageUrl,
    zoneId: 'runes',
    exhausted: false,
  })
  actions?.applyAction({ type: 'RECYCLE_RUNE', playerId: props.card.controllerId, cardId: props.card.cardId })
}

const ctxVisible = ref(false)
const ctxX = ref(0)
const ctxY = ref(0)

function onContextMenu(e: MouseEvent) {
  if (!isOwned.value) return
  if (RUNE_ZONES.has(props.card.zoneId)) return
  e.preventDefault()
  ctxX.value = e.clientX
  ctxY.value = e.clientY
  ctxVisible.value = true
}
</script>

<template>
  <div
    class="card"
    :class="{
      dragging: isBeingDragged,
      'card--pinged': isPinged,
      'card--arrow-source': isArrowSource,
      'card--arrow-target': isArrowTarget,
      'card--local-target': isLocalTarget,
      'card--arrow-mode': isArrowMode,
    }"
    :style="style"
    @pointerdown="onPointerDown"
    @click="onClick"
    @contextmenu="onContextMenu"
    @mouseenter="isHovered = true"
    @mouseleave="isHovered = false"
  >
    <div class="card-inner" :style="innerStyle">
      <img
        class="card-face card-front object-contain w-full h-full"
        :class="{'card-battlefield': card.zoneId === 'battlefield'}"
        :src="card.description.imageUrl || cardBack"
        :alt="card.description.name"
      >
      <img
        class="card-face card-back object-contain w-full h-full"
        :src="cardBack"
        alt="dos"
      >
    </div>

<div v-if="canSeeFront" class="badges">
      <span v-if="card.state.counters" class="badge badge-counter">{{ card.state.counters }}</span>
      <span v-if="card.state.damages" class="badge badge-damage">{{ card.state.damages }}</span>
      <span v-if="card.state.buffs" class="badge badge-buff">{{ card.state.buffs }}</span>
    </div>

    <!-- Rune: recycle (top-left) -->
    <button
      v-if="isRuneInPlay && isHovered && !isBeingDragged"
      class="rune-action-btn rune-action-btn--left"
      title="Recycler sous le deck de runes"
      @click.stop="onRecycleRune"
      @pointerdown.stop
    >
      <img :src="runeIcon" width="22" height="22" alt="" class="rune-action-img" />
    </button>

    <!-- Rune: recycle + token (top-right, seulement si non-exhausted) -->
    <button
      v-if="isRuneInPlay && isHovered && !isBeingDragged && !card.state.exhausted"
      class="rune-action-btn rune-action-btn--right"
      title="Recycler et créer un token"
      @click.stop="onRecycleAndToken"
      @pointerdown.stop
    >
      <img :src="runeIcon" width="22" height="22" alt="" class="rune-action-img" />
      <span class="rune-action-badge">1</span>
    </button>

    <!-- Arrow button — flush top-left (non-rune cards) -->
    <button
      v-if="!isRuneInPlay && isHovered && !isBeingDragged && pingArrow"
      class="card-action-btn card-action-arrow"
      :class="{ active: isLocalTarget }"
      title="Désigner comme cible"
      @click.stop="onArrowClick"
      @pointerdown.stop
    >
      <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M2 14 C2 7, 9 4, 13 2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" fill="none"/>
        <path d="M10 1.5 L13.5 2 L13 5.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
      </svg>
    </button>

    <!-- Ping button — flush top-right (non-rune cards) -->
    <button
      v-if="!isRuneInPlay && isHovered && !isBeingDragged && pingArrow"
      class="card-action-btn card-action-ping"
      title="Ping"
      @click.stop="onPingClick"
      @pointerdown.stop
    >
      <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="8" cy="8" r="2" fill="currentColor"/>
        <path d="M8 3a5 5 0 0 1 5 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        <path d="M8 1a7 7 0 0 1 7 7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" opacity=".5"/>
        <path d="M8 5.5a2.5 2.5 0 0 1 2.5 2.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" opacity=".75"/>
      </svg>
    </button>

  </div>

  <CardContextMenu
    :visible="ctxVisible"
    :card="card"
    :x="ctxX"
    :y="ctxY"
    :current-player-id="currentPlayerId"
    @close="ctxVisible = false"
  />
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
  perspective: 800px;
  transition: transform 0.3s var(--ease);
}

.card.dragging {
  transition: none;
  cursor: grabbing;
}

.card-inner {
  position: relative;
  width: 100%;
  height: 100%;
  transform-style: preserve-3d;
  transition: transform 0.55s var(--ease);
}

.card-face {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  border-radius: 4px;
  box-shadow: 0 6px 14px rgba(0, 0, 0, 0.35);
}

.card-battlefield {
  box-shadow: none
}

.card-back {
  transform: rotateY(180deg);
}


.badges {
  position: absolute;
  right: -6px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  gap: 3px;
  z-index: 10;
  pointer-events: none;
}

.badge {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 9px;
  font-weight: 700;
  color: #fff;
  border: 1.5px solid rgba(0, 0, 0, 0.4);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.5);
  line-height: 1;
}

.badge-counter { background: #3a3d45; }
.badge-damage  { background: #c0392b; }
.badge-buff    { background: #e67e22; }

/* ── Ping golden border ──────────────────────────────────────────────────── */

.card--pinged .card-face {
  box-shadow:
    0 0 0 2px #C8AA6E,
    0 0 20px rgba(200, 170, 110, 0.8),
    0 0 40px rgba(200, 170, 110, 0.4);
  animation: ping-pulse 0.6s ease-in-out infinite alternate;
}

@keyframes ping-pulse {
  from {
    box-shadow:
      0 0 0 2px #C8AA6E,
      0 0 12px rgba(200, 170, 110, 0.6),
      0 0 28px rgba(200, 170, 110, 0.3);
  }
  to {
    box-shadow:
      0 0 0 3px #e8ca8e,
      0 0 28px rgba(200, 170, 110, 1),
      0 0 50px rgba(200, 170, 110, 0.6);
  }
}

/* ── Arrow source & targets ──────────────────────────────────────────────── */

.card--arrow-source .card-face {
  box-shadow:
    0 0 0 2px rgba(255, 112, 67, 0.9),
    0 0 14px rgba(255, 112, 67, 0.5);
}

.card--arrow-target .card-face {
  box-shadow:
    0 0 0 2px #ef5350,
    0 0 16px rgba(239, 83, 80, 0.5);
}

.card--local-target .card-face {
  box-shadow:
    0 0 0 2px #ff7043,
    0 0 18px rgba(255, 112, 67, 0.7);
}

/* Subtle pointer hint for all cards when arrow mode is active */
.card--arrow-mode {
  cursor: crosshair !important;
}

/* ── Card action buttons (hover) ─────────────────────────────────────────── */

.card-action-btn {
  position: absolute;
  width: 20px;
  height: 20px;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  pointer-events: auto;
  padding: 3px;
  backdrop-filter: blur(4px);
  transition: background 0.15s, color 0.15s;
  z-index: 20;
}

.card-action-arrow {
  top: 0;
  left: 0;
  border-radius: 0 0 5px 0;
  background: rgba(6, 15, 27, 0.82);
  color: rgba(200, 170, 110, 0.85);
  border-right: 1px solid rgba(200, 170, 110, 0.25);
  border-bottom: 1px solid rgba(200, 170, 110, 0.25);
}

.card-action-arrow:hover {
  background: rgba(200, 170, 110, 0.18);
  color: #C8AA6E;
}

.card-action-arrow.active {
  background: rgba(255, 112, 67, 0.22);
  color: #ff7043;
  border-right-color: rgba(255, 112, 67, 0.4);
  border-bottom-color: rgba(255, 112, 67, 0.4);
}

.card-action-ping {
  top: 0;
  right: 0;
  border-radius: 0 0 0 5px;
  background: rgba(6, 15, 27, 0.82);
  color: rgba(200, 170, 110, 0.85);
  border-left: 1px solid rgba(200, 170, 110, 0.25);
  border-bottom: 1px solid rgba(200, 170, 110, 0.25);
}

.card-action-ping:hover {
  background: rgba(200, 170, 110, 0.18);
  color: #C8AA6E;
}

.card-action-btn svg {
  width: 100%;
  height: 100%;
}

.rune-action-btn {
  position: absolute;
  top: 0;
  width: 26px;
  height: 26px;
  padding: 2px;
  border: none;
  cursor: pointer;
  pointer-events: auto;
  z-index: 20;
  background: rgba(6, 15, 27, 0.82);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s;
}

.rune-action-btn--left {
  left: 0;
  border-radius: 0 0 5px 0;
  border-right: 1px solid rgba(200, 170, 110, 0.25);
  border-bottom: 1px solid rgba(200, 170, 110, 0.25);
}

.rune-action-btn--right {
  right: 0;
  border-radius: 0 0 0 5px;
  border-left: 1px solid rgba(200, 170, 110, 0.25);
  border-bottom: 1px solid rgba(200, 170, 110, 0.25);
}

.rune-action-btn:hover {
  background: rgba(200, 170, 110, 0.18);
}

.rune-action-img {
  display: block;
  width: 28px;
  height: 28px;
  object-fit: contain;
}

.rune-action-badge {
  position: absolute;
  bottom: 2px;
  right: 2px;
  width: 13px;
  height: 13px;
  border-radius: 50%;
  background: #C8AA6E;
  color: #060d1a;
  font-size: 8px;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  border: 1px solid rgba(0, 0, 0, 0.4);
  pointer-events: none;
}
</style>
