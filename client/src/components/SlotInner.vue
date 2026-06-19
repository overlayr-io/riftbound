<script setup lang="ts">
import { ref, watch } from 'vue'
import type { Card } from '@riftbound/shared'
import backCardBlack from '@/assets/img/back_card_black.png'

const props = defineProps<{
  playerName: string
  isMe?: boolean
  deckSubmitted: boolean
  legendCard: Card | null
  bfRevealed: boolean
  bfCard: Card | null
  diceRoll: number | null
  isDiceWinner: boolean
  dicePhase?: boolean
}>()

const rolling = ref(false)
const displayedNumber = ref<number | null>(null)
let rollInterval: ReturnType<typeof setInterval> | null = null
let revealTimer: ReturnType<typeof setTimeout> | null = null

watch(
  () => props.dicePhase,
  (active) => {
    if (rollInterval) { clearInterval(rollInterval); rollInterval = null }
    if (revealTimer) { clearTimeout(revealTimer); revealTimer = null }
    if (!active) { rolling.value = false; displayedNumber.value = null; return }

    rolling.value = true
    rollInterval = setInterval(() => {
      displayedNumber.value = Math.floor(Math.random() * 20) + 1
    }, 80)
    revealTimer = setTimeout(() => {
      clearInterval(rollInterval!); rollInterval = null
      rolling.value = false
      displayedNumber.value = null
    }, 2500)
  },
  { immediate: true },
)
</script>

<template>
  <div class="slot">
    <!-- Player identity -->
    <div class="slot__identity">
      <div class="slot__avatar">{{ playerName.charAt(0).toUpperCase() }}</div>
      <div class="slot__info">
        <span class="slot__name">
          {{ playerName }}
          <span v-if="isMe" class="slot__you">(vous)</span>
        </span>
        <span class="slot__status" :class="{ 'slot__status--done': deckSubmitted }">
          {{ deckSubmitted ? '✓ Deck importé' : 'En attente…' }}
        </span>
      </div>
    </div>

    <!-- Legend card -->
    <div class="slot__card-section">
      <span class="slot__card-label">LÉGENDE</span>
      <div class="slot__card-frame">
        <template v-if="deckSubmitted && legendCard">
          <img
            v-if="legendCard.imageUrl"
            :src="legendCard.imageUrl"
            :alt="legendCard.name"
            class="slot__card-img"
          />
          <div v-else class="slot__card-placeholder">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" class="slot__card-icon">
              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
            </svg>
            <span class="slot__card-name">{{ legendCard.name }}</span>
          </div>
        </template>
        <div v-else class="slot__card-back">
          <img :src="backCardBlack" alt="Dos de carte" class="slot__card-img" />
        </div>
      </div>
    </div>

    <!-- Battlefield card -->
    <div class="slot__card-section">
      <span class="slot__card-label">BATTLEFIELD</span>
      <div class="slot__card-frame" :class="{ 'slot__card-frame--revealed': bfRevealed }">
        <template v-if="bfRevealed && bfCard">
          <img
            v-if="bfCard.imageUrl"
            :src="bfCard.imageUrl"
            :alt="bfCard.name"
            class="slot__card-img"
          />
          <div v-else class="slot__card-placeholder slot__card-placeholder--bf">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" class="slot__card-icon">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
            <span class="slot__card-name">{{ bfCard.name }}</span>
          </div>
        </template>
        <div v-else class="slot__card-back slot__card-back--rotated">
          <img :src="backCardBlack" alt="Dos de carte" class="slot__card-img slot__card-img--rotated" />
        </div>
      </div>
    </div>

    <!-- Dice result -->
    <div
      class="slot__dice"
      :class="{
        'slot__dice--rolling': rolling,
        'slot__dice--winner': isDiceWinner && diceRoll !== null && !rolling,
      }"
    >
      <div class="slot__dice-box">
        <span v-if="rolling">{{ displayedNumber ?? '—' }}</span>
        <span v-else>{{ diceRoll ?? '—' }}</span>
      </div>
      <span class="slot__dice-label">
        <template v-if="rolling">EN COURS…</template>
        <template v-else-if="isDiceWinner && diceRoll !== null">VAINQUEUR</template>
        <template v-else-if="diceRoll !== null">RÉSULTAT</template>
        <template v-else>DÉ</template>
      </span>
    </div>
  </div>
</template>

<style scoped>
.slot {
  background: #060f1b;
  border: 1px solid rgba(200, 170, 110, 0.2);
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  position: relative;
  /* filled by sidebar flex — do not set height here */
  min-height: 0;
}

.slot::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, #C8AA6E 50%, transparent);
  opacity: 0.5;
}

/* Identity */
.slot__identity { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }

.slot__avatar {
  width: 28px; height: 28px;
  flex-shrink: 0;
  border: 1px solid rgba(200, 170, 110, 0.3);
  background: rgba(200, 170, 110, 0.08);
  display: flex; align-items: center; justify-content: center;
  font-size: 11px; font-weight: 900; color: #C8AA6E;
}

.slot__info { display: flex; flex-direction: column; gap: 2px; min-width: 0; }

.slot__name {
  font-size: 11px; font-weight: 700; color: #F2E5CD;
  letter-spacing: 0.04em;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}

.slot__you { font-size: 9px; color: #4a6a70; font-weight: 400; margin-left: 3px; }

.slot__status {
  font-size: 8px; color: #4a6a70; letter-spacing: 0.08em;
}
.slot__status--done { color: #00CCB9; }

/* Card sections — each grows to fill available sidebar height */
.slot__card-section {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
  min-height: 0;
}

.slot__card-label {
  font-size: 6.5px; font-weight: 700; letter-spacing: 0.22em;
  color: #4a6a70;
  flex-shrink: 0;
}

/* No aspect-ratio: let the frame fill its flex share */
.slot__card-frame {
  width: 100%;
  flex: 1;
  min-height: 0;
  overflow: hidden;
  position: relative;
  perspective: 600px;
}

/* Flip-in animation when a card is revealed */
.slot__card-img,
.slot__card-placeholder {
  animation: none;
}

.slot__card-frame--revealed .slot__card-img,
.slot__card-frame--revealed .slot__card-placeholder {
  animation: card-flip-in 0.45s ease-out;
}

@keyframes card-flip-in {
  from { opacity: 0; transform: rotateY(-90deg) scale(0.92); }
  to   { opacity: 1; transform: rotateY(0deg) scale(1); }
}

.slot__card-img {
  width: 100%; height: 100%;
  object-fit: contain;
  border-radius: 12px !important;
  display: block;
}

.slot__card-back {
  width: 100%;
  height: 100%;
  position: relative;
}

/* BF back card: placed on its side (landscape) while hidden */
.slot__card-back--rotated {
  overflow: hidden;
}
.slot__card-back--rotated .slot__card-img--rotated {
  position: absolute;
  top: 50%; left: 50%;
  width: 100%; height: 100%;
  transform: translate(-50%, -50%) rotate(-90deg);
  object-fit: cover;
}

.slot__card-placeholder {
  width: 100%; height: 100%;
  background: linear-gradient(160deg, rgba(20, 40, 70, 0.9), rgba(10, 20, 40, 0.95));
  border: 1px solid rgba(200, 170, 110, 0.25);
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 8px; padding: 8px;
}

.slot__card-placeholder--bf { border-color: rgba(0, 204, 185, 0.25); }

.slot__card-icon {
  width: 28px; height: 28px; color: #C8AA6E; opacity: 0.5; flex-shrink: 0;
}

.slot__card-name {
  font-size: 8px; font-weight: 700; color: #C8AA6E;
  letter-spacing: 0.06em; text-align: center;
  overflow: hidden; display: -webkit-box;
  -webkit-line-clamp: 3; -webkit-box-orient: vertical;
}

/* Dice */
.slot__dice {
  display: flex; align-items: center; gap: 8px;
  padding-top: 2px;
  flex-shrink: 0;
}

.slot__dice-box {
  width: 28px; height: 28px;
  border: 1px solid rgba(90, 110, 130, 0.35);
  background: rgba(10, 21, 37, 0.8);
  display: flex; align-items: center; justify-content: center;
  font-size: 11px; font-weight: 900; color: #4a6a70;
  flex-shrink: 0;
  transition: border-color 0.25s, color 0.25s, background 0.25s;
}

.slot__dice-label { font-size: 7px; color: #4a6a70; letter-spacing: 0.1em; }

/* Rolling state */
.slot__dice--rolling .slot__dice-box {
  border-color: rgba(200, 170, 110, 0.6);
  color: #C8AA6E;
  background: rgba(200, 170, 110, 0.06);
}
.slot__dice--rolling .slot__dice-label { color: rgba(200, 170, 110, 0.6); }

.slot__dice-rolling-icon {
  display: inline-block;
  animation: dice-spin 0.3s steps(6) infinite;
  font-size: 14px;
  line-height: 1;
}

@keyframes dice-spin {
  0%   { content: '⚀'; }
  16%  { opacity: 0.4; }
  33%  { opacity: 1; }
  50%  { opacity: 0.4; }
  66%  { opacity: 1; }
  83%  { opacity: 0.4; }
  100% { opacity: 1; }
}

/* Winner state */
.slot__dice--winner .slot__dice-box {
  border-color: #C8AA6E;
  color: #C8AA6E;
  background: rgba(200, 170, 110, 0.1);
  animation: dice-pop 0.35s ease-out;
}
.slot__dice--winner .slot__dice-label { color: #C8AA6E; font-weight: 700; }

@keyframes dice-pop {
  0%   { transform: scale(0.7); opacity: 0.5; }
  60%  { transform: scale(1.15); }
  100% { transform: scale(1); opacity: 1; }
}
</style>
