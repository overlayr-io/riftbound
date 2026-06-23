<script setup lang="ts">
import { computed, inject, ref } from 'vue'
import type { CardState } from '@riftbound/shared'
import type { CardLayout } from '@/types/card.type'
import { DRAG_KEY, GAME_ACTIONS_KEY } from '@/composables/useDrag'
import cardBack from '@/assets/img/card_back.png'
import runeIcon from '@/assets/img/rune_icon.png'

const props = defineProps<{
  card: CardState
  layout: CardLayout
  currentPlayerId: string
}>()

const drag = inject(DRAG_KEY)
const actions = inject(GAME_ACTIONS_KEY)

// ── Visibility ──────────────────────────────────────────────────────────────

const isOwned = computed(() => props.card.controllerId === props.currentPlayerId)
const isBeingDragged = computed(() => drag?.dragging.value?.cardId === props.card.cardId)
const isDropInvalid = computed(() =>
  isBeingDragged.value &&
  drag?.hoveredZone.value !== null &&
  drag?.hoveredZoneValid.value === false,
)
const isHovered = ref(false)

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

const style = computed(() => {
  if (!isOwned.value) {
    const L = props.layout
    return {
      transform: `translate3d(${L.x}px, ${L.y}px, 0)${rotStr(L.rotation, L.cssRotation)}`,
      width: L.w + 'px',
      height: L.h + 'px',
      zIndex: L.z,
      pointerEvents: 'none' as const,
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
  }
})

// ── Interactions ─────────────────────────────────────────────────────────────

const EXHAUSTABLE_ZONES = new Set(['base', 'runes', 'legend', 'battlefield', 'battlefield_owner', 'battlefield_opponent'])
const NON_DRAGGABLE_ZONES = new Set(['legend'])

function toggleExhausted() {
  if (!EXHAUSTABLE_ZONES.has(props.card.zoneId)) return
  actions?.toggleExhausted(props.card.cardId)
}

function onPointerDown(e: PointerEvent) {
  if (!isOwned.value) return
  if (e.button !== 0) return
  if (NON_DRAGGABLE_ZONES.has(props.card.zoneId)) return
  drag?.onPointerDown(e, props.card.cardId, props.card.ownerId, props.layout, toggleExhausted)
}

function onClick() {
  if (!isOwned.value) return
  if (!NON_DRAGGABLE_ZONES.has(props.card.zoneId)) return
  toggleExhausted()
}
</script>

<template>
  <div
    class="card"
    :class="{ dragging: isBeingDragged }"
    :style="style"
    @pointerdown="onPointerDown"
    @click="onClick"
    @mouseenter="isHovered = true"
    @mouseleave="isHovered = false"
  >
    <div class="card-inner" :style="innerStyle">
      <img
        class="card-face card-front object-cover w-full h-full"
        :src="card.description.imageUrl || cardBack"
        :alt="card.description.name"
      >
      <img
        class="card-face card-back object-cover w-full h-full"
        :src="cardBack"
        alt="dos"
      >
    </div>

    <img
      v-if="card.description.type === 'rune' && isOwned"
      class="rune-badge"
      :src="runeIcon"
      alt="rune"
    >

    <div v-if="canSeeFront" class="badges">
      <span v-if="card.state.counters" class="badge badge-counter">{{ card.state.counters }}</span>
      <span v-if="card.state.damages" class="badge badge-damage">{{ card.state.damages }}</span>
      <span v-if="card.state.buffs" class="badge badge-buff">{{ card.state.buffs }}</span>
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
  object-fit: cover;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  border-radius: 4px;
  box-shadow: 0 6px 14px rgba(0, 0, 0, 0.35);
}

.card-back {
  transform: rotateY(180deg);
}

.rune-badge {
  position: absolute;
  top: 4px;
  left: 4px;
  width: 22px;
  height: 22px;
  object-fit: contain;
  opacity: 0;
  transition: opacity 0.15s, transform 0.15s;
  pointer-events: none;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.8));
  z-index: 10;
}

.card:hover .rune-badge {
  opacity: 0.85;
}

.rune-badge:hover {
  opacity: 1 !important;
  transform: scale(1.15);
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
</style>
