<script setup lang="ts">
import type {CardState} from '@riftbound/shared'
import type {CardLayout} from '@/types/card.type'
import cardBack from '@/assets/img/card_back.png'
import runeIcon from '@/assets/img/rune_icon.png'

const props = defineProps<{
  card: CardState
  layout: CardLayout
  currentPlayerId: string
}>()

function isVisible(): boolean {
  const v = props.card.state.visibleTo
  if (v === 'ALL') return true
  if (v === 'NOBODY') return false
  // SELF
  return props.card.controllerId === props.currentPlayerId
}
</script>

<template>
  <div
      class="card"
      :class="{
        'card-battlefield': card.description.type === 'battlefield',
        'card-exhausted': card.state.exhausted,
        'card-rune': card.description.type === 'rune',
      }"
      :style="{
        transform: `translate(${layout.x}px, ${layout.y}px) rotate(${layout.rotation}deg)`,
        width: layout.w + 'px',
        height: layout.h + 'px',
        zIndex: layout.z,
      }"
  >
    <!-- Card face or back -->
    <img
        :src="isVisible() && card.description.imageUrl ? card.description.imageUrl : cardBack"
        :alt="card.description.name"
        class="card-image"
    />

    <!-- Rune icon badge (visible on hover) -->
    <img
        v-if="card.description.type === 'rune'"
        :src="runeIcon"
        class="rune-badge"
        alt="rune"
    />

    <!-- Counters / Damages / Buffs badges -->
    <div class="badges">
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
  transition: transform 0.25s ease;
  border-radius: 4px;
  overflow: visible;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
}

.card-battlefield {
  box-shadow: none;
}

.card-exhausted {
  transform-origin: 50% 50%;
}

/* La rotation exhausted s'additionne à celle du layout via JS si besoin ;
   ici on l'applique via la classe pour ne pas perturber le translate. */
.card-exhausted .card-image {
  filter: brightness(0.8);
}

/* On surcharge le transform pour ajouter les 90° d'exhaustion.
   On utilise une CSS var pour ne pas perdre le translate du layout. */
.card-exhausted {
  --extra-rotate: 90deg;
}

.card-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
  border-radius: 4px;
}

/* Rune icon — hidden by default, shown on hover */
.rune-badge {
  position: absolute;
  top: 4px;
  left: 4px;
  width: 20px;
  height: 20px;
  object-fit: contain;
  opacity: 0;
  transition: opacity 0.15s ease;
  pointer-events: none;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.8));
}

.card:hover .rune-badge {
  opacity: 1;
}

/* Badges container — bottom-right corner */
.badges {
  position: absolute;
  bottom: 4px;
  right: 4px;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
  pointer-events: none;
}

.badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 16px;
  height: 16px;
  padding: 0 3px;
  border-radius: 50%;
  font-size: 9px;
  font-weight: 700;
  line-height: 1;
  color: #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.7);
}

.badge-counter { background: #555; }
.badge-damage  { background: #c0392b; }
.badge-buff    { background: #e67e22; }
</style>
