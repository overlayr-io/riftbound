<script lang="ts" setup>
import type { ShowdownData } from '@riftbound/shared'

const props = defineProps<{
  showdown: ShowdownData
  myId: string
  opponentName: string
  x: number
  y: number
}>()

defineEmits<{
  pass: []
  conquer: []
  close: []
}>()

const isMyTurn   = () => props.showdown.currentTurnId === props.myId
const isAttacker = () => props.showdown.attackerId === props.myId
</script>

<template>
  <Transition name="sdp">
    <div
      class="sdp"
      :class="{ 'sdp--ended': showdown.ended, 'sdp--myturn': isMyTurn() && !showdown.ended }"
      :style="{ left: x + 'px', top: y + 'px' }"
    >
      <!-- Close -->
      <button class="sdp-close" @click="$emit('close')" title="Fermer">
        <svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <line x1="1" y1="1" x2="9" y2="9"/><line x1="9" y1="1" x2="1" y2="9"/>
        </svg>
      </button>

      <!-- Header -->
      <div class="sdp-label">
        <span class="sdp-label-dot" />
        <span class="sdp-label-text">{{ showdown.ended ? 'Showdown terminé' : 'Showdown' }}</span>
        <span class="sdp-label-dot" />
      </div>
      <div class="sdp-sep" />

      <!-- ── Active showdown ─────────────────────────────────────────── -->
      <template v-if="!showdown.ended">

        <!-- Turn indicator -->
        <div class="sdp-turn-row">
          <span class="sdp-pip" :class="isMyTurn() ? 'sdp-pip--on' : 'sdp-pip--off'" />
          <span class="sdp-turn-who">
            {{ isMyTurn() ? 'À toi de jouer' : `${opponentName} joue…` }}
          </span>
        </div>

        <!-- Pass button (only when my turn) -->
        <button v-if="isMyTurn()" class="sdp-btn sdp-btn--pass" @click="$emit('pass')">
          <span class="sdp-btn-bg" />
          <span class="sdp-btn-body">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg>
            Passer
          </span>
        </button>

        <!-- Waiting dots (opponent's turn) -->
        <div v-else class="sdp-waiting">
          <span class="sdp-dot" /><span class="sdp-dot" /><span class="sdp-dot" />
        </div>

        <!-- Pass progress -->
        <div class="sdp-progress">
          <span
            v-for="i in 2" :key="i"
            class="sdp-progress-pip"
            :class="{ 'sdp-progress-pip--filled': showdown.passCount >= i }"
          />
          <span class="sdp-progress-label">
            {{ showdown.passCount === 0 ? 'Joue ou passe' : '1 passe — encore une' }}
          </span>
        </div>

      </template>

      <!-- ── Ended: conquer (attacker only) ────────────────────────── -->
      <template v-else>
        <template v-if="isAttacker()">
          <button class="sdp-btn sdp-btn--conquer" @click="$emit('conquer')">
            <span class="sdp-btn-bg" />
            <span class="sdp-btn-body">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M2 20h20"/><path d="M5 20 L3 8 L8 13 L12 5 L16 13 L21 8 L19 20"/></svg>
              Conquer + Score
            </span>
            <span class="sdp-conquer-glow" />
          </button>
        </template>
        <div v-else class="sdp-hint">{{ opponentName }} conquiert…</div>
      </template>

    </div>
  </Transition>
</template>

<style scoped>
/* ── Shell ──────────────────────────────────────────────────────────────────── */
.sdp {
  position: fixed;
  z-index: 6;
  width: 182px;
  padding: 0 0 10px;
  transform: translateY(-50%);
  pointer-events: auto;
  background: linear-gradient(160deg, #0d1c2e 0%, #060d1a 100%);
  clip-path: polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px));
  --c: rgba(239,83,80,.4);
  --g: rgba(239,83,80,.12);
  box-shadow: inset 0 0 0 1px var(--c), 0 0 24px rgba(0,0,0,.8), 0 0 10px var(--g);
  filter: drop-shadow(0 0 8px var(--g));
}

.sdp--ended {
  --c: rgba(200,170,110,.65);
  --g: rgba(200,170,110,.2);
}

/* Pulse border lorsque c'est mon tour */
.sdp--myturn {
  animation: sdp-pulse 1.8s ease-in-out infinite;
}
@keyframes sdp-pulse {
  0%,100% { filter: drop-shadow(0 0 8px var(--g)); }
  50%      { filter: drop-shadow(0 0 18px var(--g)); }
}

/* ── Close ──────────────────────────────────────────────────────────────────── */
.sdp-close {
  position: absolute; top: 6px; right: 9px;
  width: 16px; height: 16px; display: flex; align-items: center; justify-content: center;
  background: none; border: none; cursor: pointer; color: rgba(200,170,110,.3); padding: 0;
  transition: color .15s; z-index: 1;
}
.sdp-close:hover { color: #C8AA6E; }

/* ── Header ─────────────────────────────────────────────────────────────────── */
.sdp-label {
  display: flex; align-items: center; justify-content: center;
  gap: 5px; padding: 8px 24px 6px;
}
.sdp-label-text {
  font-size: 8px; font-weight: 700; letter-spacing: .14em;
  text-transform: uppercase; color: #C8AA6E; white-space: nowrap;
}
.sdp-label-dot { width: 3px; height: 3px; border-radius: 50%; background: rgba(200,170,110,.5); flex-shrink: 0; }
.sdp-sep {
  height: 1px; margin: 0 0 10px;
  background: linear-gradient(90deg, transparent, rgba(200,170,110,.35) 30%, rgba(200,170,110,.35) 70%, transparent);
}

/* ── Turn row ───────────────────────────────────────────────────────────────── */
.sdp-turn-row {
  display: flex; align-items: center; gap: 7px; padding: 0 12px 8px;
}
.sdp-pip {
  width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; transition: background .2s, box-shadow .2s;
}
.sdp-pip--on  { background: #ef5350; box-shadow: 0 0 7px rgba(239,83,80,.8); animation: sdp-pip 1.4s ease-in-out infinite; }
.sdp-pip--off { background: rgba(200,170,110,.2); }
@keyframes sdp-pip {
  0%,100% { box-shadow: 0 0 4px rgba(239,83,80,.5); }
  50%     { box-shadow: 0 0 12px rgba(239,83,80,.9); }
}
.sdp-turn-who {
  font-size: 10px; font-weight: 600; letter-spacing: .05em; color: #e8dcc8;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}

/* ── Buttons ────────────────────────────────────────────────────────────────── */
.sdp-btn {
  position: relative; display: flex; align-items: center; justify-content: center;
  width: calc(100% - 16px); margin: 0 8px; padding: 0;
  border: none; background: none; cursor: pointer; outline: none; transition: transform .12s;
}
.sdp-btn:active { transform: scale(.97); }

.sdp-btn-bg {
  position: absolute; inset: 0; transition: filter .18s, box-shadow .18s;
}
.sdp-btn--pass .sdp-btn-bg {
  background: linear-gradient(180deg, rgba(74,144,217,.12) 0%, rgba(20,50,90,.08) 100%);
  border: 1px solid rgba(74,144,217,.35);
}
.sdp-btn--pass:hover .sdp-btn-bg { filter: brightness(1.3); box-shadow: 0 0 10px rgba(74,144,217,.2); }

.sdp-btn--conquer .sdp-btn-bg {
  background: linear-gradient(180deg, rgba(200,170,110,.2) 0%, rgba(120,90,30,.1) 100%);
  border: 1px solid rgba(200,170,110,.6);
  box-shadow: inset 0 0 12px rgba(200,170,110,.08);
}
.sdp-btn--conquer:hover .sdp-btn-bg { filter: brightness(1.3); box-shadow: 0 0 16px rgba(200,170,110,.28); }

.sdp-btn-body {
  position: relative; display: flex; align-items: center; justify-content: center;
  gap: 7px; padding: 8px 10px;
  font-weight: 700; font-size: 11px; letter-spacing: .08em; text-transform: uppercase; white-space: nowrap;
}
.sdp-btn--pass    .sdp-btn-body { color: #8aabb0; }
.sdp-btn--conquer .sdp-btn-body { color: #F2E5CD; }

.sdp-conquer-glow {
  position: absolute; inset: 0; pointer-events: none;
  background: radial-gradient(ellipse at 50% 120%, rgba(200,170,110,.14) 0%, transparent 65%);
}

/* ── Waiting dots ───────────────────────────────────────────────────────────── */
.sdp-waiting {
  display: flex; align-items: center; justify-content: center; gap: 5px; padding: 6px 12px 4px;
}
.sdp-dot {
  width: 4px; height: 4px; border-radius: 50%; background: rgba(200,170,110,.5);
  animation: sdp-dot 1.2s ease-in-out infinite; flex-shrink: 0;
}
.sdp-dot:nth-child(2) { animation-delay: .2s; }
.sdp-dot:nth-child(3) { animation-delay: .4s; }
@keyframes sdp-dot {
  0%,80%,100% { opacity:.25; transform:scale(.8); }
  40%         { opacity:1;   transform:scale(1); }
}

/* ── Progress ───────────────────────────────────────────────────────────────── */
.sdp-progress {
  display: flex; align-items: center; gap: 5px; padding: 7px 12px 0;
}
.sdp-progress-pip {
  width: 20px; height: 3px; border-radius: 2px;
  background: rgba(239,83,80,.2); transition: background .2s;
  flex-shrink: 0;
}
.sdp-progress-pip--filled { background: #ef5350; }
.sdp-progress-label {
  font-size: 8.5px; letter-spacing: .04em; color: rgba(200,170,110,.4);
  flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}

/* ── Hint ───────────────────────────────────────────────────────────────────── */
.sdp-hint {
  text-align: center; font-size: 9px; letter-spacing: .05em;
  color: rgba(200,170,110,.4); padding: 6px 12px 2px;
}

/* ── Transition ─────────────────────────────────────────────────────────────── */
.sdp-enter-active { transition: opacity .25s ease, transform .25s cubic-bezier(0.34,1.56,0.64,1); }
.sdp-leave-active { transition: opacity .18s ease, transform .18s ease; }
.sdp-enter-from   { opacity:0; transform:translateY(calc(-50% + 6px)) scale(.95); }
.sdp-leave-to     { opacity:0; transform:translateY(calc(-50% + 3px)) scale(.97); }
</style>
