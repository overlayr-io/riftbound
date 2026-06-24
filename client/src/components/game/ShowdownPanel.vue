<script lang="ts" setup>
defineProps<{
  phase: 'idle' | 'showdown' | 'resolve'
  hasOpponentCards: boolean
  x: number
  y: number
}>()

defineEmits<{
  startShowdown: []
  conquer: []
  close: []
}>()
</script>

<template>
  <Transition name="sdp">
    <div
      class="sdp"
      :class="`sdp--${phase}`"
      :style="{ left: x + 'px', top: y + 'px' }"
    >
      <!-- Close -->
      <button v-if="phase !== 'showdown'" class="sdp-close" @click="$emit('close')" title="Fermer">
        <svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <line x1="1" y1="1" x2="9" y2="9"/><line x1="9" y1="1" x2="1" y2="9"/>
        </svg>
      </button>

      <!-- Header label -->
      <div class="sdp-label">
        <span class="sdp-label-dot" />
        <span class="sdp-label-text">
          {{ phase === 'showdown' ? 'Showdown en cours' : phase === 'resolve' ? 'Résolution' : 'Champ de bataille' }}
        </span>
        <span class="sdp-label-dot" />
      </div>

      <!-- Gold separator -->
      <div class="sdp-sep" />

      <!-- Phase: idle — initiate -->
      <template v-if="phase === 'idle'">
        <button class="sdp-action sdp-action--attack" @click="$emit('startShowdown')">
          <span class="sdp-action-bg" />
          <span class="sdp-action-body">
            <!-- Sword SVG -->
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5"/>
              <line x1="13" y1="19" x2="19" y2="13"/>
              <line x1="16" y1="16" x2="20" y2="20"/>
              <line x1="19" y1="21" x2="21" y2="19"/>
            </svg>
            <span class="sdp-action-label">{{ hasOpponentCards ? 'Attaquer' : 'Créer un showdown' }}</span>
          </span>
          <span class="sdp-action-glow" />
        </button>
      </template>

      <!-- Phase: showdown — reaction loop, no action -->
      <template v-else-if="phase === 'showdown'">
        <div class="sdp-waiting">
          <span class="sdp-waiting-dot" />
          <span class="sdp-waiting-dot" />
          <span class="sdp-waiting-dot" />
          <span class="sdp-waiting-text">Réactions en cours</span>
        </div>
        <div class="sdp-hint">Chaque joueur peut réagir</div>
      </template>

      <!-- Phase: resolve — conquer -->
      <template v-else-if="phase === 'resolve'">
        <button class="sdp-action sdp-action--conquer" @click="$emit('conquer')">
          <span class="sdp-action-bg" />
          <span class="sdp-action-body">
            <!-- Crown SVG -->
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M2 20h20"/>
              <path d="M5 20 L3 8 L8 13 L12 5 L16 13 L21 8 L19 20"/>
            </svg>
            <span class="sdp-action-label">Conquer + Score</span>
          </span>
          <span class="sdp-action-glow" />
        </button>
      </template>

    </div>
  </Transition>
</template>

<style scoped>
/* ── Panel shell ────────────────────────────────────────────────────────────── */
.sdp {
  position: fixed;
  z-index: 6;
  width: 180px;
  padding: 0 0 10px;
  transform: translateY(-50%);
  pointer-events: auto;

  background: linear-gradient(160deg, #0d1c2e 0%, #060d1a 100%);
  clip-path: polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px));

  /* Phase-aware border via CSS var */
  --phase-color: rgba(200, 170, 110, 0.35);
  --phase-glow:  rgba(200, 170, 110, 0.08);
  box-shadow:
    inset 0 0 0 1px var(--phase-color),
    0 0 24px rgba(0, 0, 0, 0.8),
    0 0 12px var(--phase-glow);
  filter: drop-shadow(0 0 10px var(--phase-glow));
}

.sdp--idle    { --phase-color: rgba(239, 83, 80, 0.45); --phase-glow: rgba(239, 83, 80, 0.15); }
.sdp--showdown{ --phase-color: rgba(200, 170, 110, 0.3); --phase-glow: rgba(200, 170, 110, 0.08); }
.sdp--resolve { --phase-color: rgba(200, 170, 110, 0.6); --phase-glow: rgba(200, 170, 110, 0.2); }

/* ── Close ──────────────────────────────────────────────────────────────────── */
.sdp-close {
  position: absolute;
  top: 6px;
  right: 9px;
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  cursor: pointer;
  color: rgba(200, 170, 110, 0.35);
  padding: 0;
  transition: color 0.15s;
  z-index: 1;
}
.sdp-close:hover { color: #C8AA6E; }

/* ── Label ──────────────────────────────────────────────────────────────────── */
.sdp-label {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 8px 24px 6px;
}

.sdp-label-text {
  font-size: 8.5px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #C8AA6E;
  white-space: nowrap;
}

.sdp-label-dot {
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: rgba(200, 170, 110, 0.5);
  flex-shrink: 0;
}

/* ── Separator ──────────────────────────────────────────────────────────────── */
.sdp-sep {
  height: 1px;
  margin: 0 0 10px;
  background: linear-gradient(90deg, transparent, rgba(200, 170, 110, 0.35) 30%, rgba(200, 170, 110, 0.35) 70%, transparent);
}

/* ── Action button ──────────────────────────────────────────────────────────── */
.sdp-action {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: calc(100% - 16px);
  margin: 0 8px;
  padding: 0;
  border: none;
  background: none;
  cursor: pointer;
  outline: none;
  transition: transform 0.12s;
}
.sdp-action:active { transform: scale(0.97); }

.sdp-action-bg {
  position: absolute;
  inset: 0;
  transition: filter 0.18s, box-shadow 0.18s;
}
.sdp-action--attack .sdp-action-bg {
  background: linear-gradient(180deg, rgba(180, 30, 28, 0.25) 0%, rgba(120, 10, 10, 0.15) 100%);
  border: 1px solid rgba(239, 83, 80, 0.5);
  box-shadow: inset 0 0 12px rgba(239, 83, 80, 0.08);
}
.sdp-action--conquer .sdp-action-bg {
  background: linear-gradient(180deg, rgba(200, 170, 110, 0.18) 0%, rgba(120, 90, 30, 0.1) 100%);
  border: 1px solid rgba(200, 170, 110, 0.55);
  box-shadow: inset 0 0 12px rgba(200, 170, 110, 0.08);
}

.sdp-action:hover .sdp-action-bg {
  filter: brightness(1.3);
}
.sdp-action--attack:hover .sdp-action-bg {
  box-shadow: inset 0 0 16px rgba(239, 83, 80, 0.14), 0 0 16px rgba(239, 83, 80, 0.18);
}
.sdp-action--conquer:hover .sdp-action-bg {
  box-shadow: inset 0 0 16px rgba(200, 170, 110, 0.14), 0 0 16px rgba(200, 170, 110, 0.22);
}

.sdp-action-body {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 9px 12px;
  font-weight: 800;
  font-size: 11px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  white-space: nowrap;
}
.sdp-action--attack  .sdp-action-body { color: #ef5350; }
.sdp-action--conquer .sdp-action-body { color: #F2E5CD; }

.sdp-action:hover .sdp-action--attack .sdp-action-body  { color: #ff7070; }
.sdp-action:hover.sdp-action--conquer .sdp-action-body { color: #fff; }

.sdp-action-glow {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
.sdp-action--attack  .sdp-action-glow { background: radial-gradient(ellipse at 50% 120%, rgba(239, 83, 80, 0.1) 0%, transparent 65%); }
.sdp-action--conquer .sdp-action-glow { background: radial-gradient(ellipse at 50% 120%, rgba(200, 170, 110, 0.12) 0%, transparent 65%); }

/* ── Waiting state ──────────────────────────────────────────────────────────── */
.sdp-waiting {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 4px 12px 2px;
}

.sdp-waiting-text {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.06em;
  color: rgba(200, 170, 110, 0.7);
  text-transform: uppercase;
}

.sdp-waiting-dot {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: #C8AA6E;
  animation: sdp-pulse 1.2s ease-in-out infinite;
  flex-shrink: 0;
}
.sdp-waiting-dot:nth-child(2) { animation-delay: 0.2s; }
.sdp-waiting-dot:nth-child(3) { animation-delay: 0.4s; }

@keyframes sdp-pulse {
  0%, 80%, 100% { opacity: 0.2; transform: scale(0.8); }
  40%            { opacity: 1;   transform: scale(1); }
}

.sdp-hint {
  text-align: center;
  font-size: 9px;
  letter-spacing: 0.05em;
  color: rgba(200, 170, 110, 0.38);
  padding: 4px 12px 2px;
}

/* ── Transition ─────────────────────────────────────────────────────────────── */
.sdp-enter-active { transition: opacity 0.25s ease, transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1); }
.sdp-leave-active { transition: opacity 0.18s ease, transform 0.18s ease; }
.sdp-enter-from   { opacity: 0; transform: translateY(calc(-50% + 6px)) scale(0.95); }
.sdp-leave-to     { opacity: 0; transform: translateY(calc(-50% + 3px)) scale(0.97); }
</style>
