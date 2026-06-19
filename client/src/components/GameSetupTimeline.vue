<script setup lang="ts">
import { computed } from 'vue'
import type { GameMode, GameMatchFormat, GameSetupStep } from '@riftbound/shared'

const props = defineProps<{
  setup: GameSetupStep
  mode: GameMode
  round: number
  matchFormat: GameMatchFormat
}>()

interface StepDef { key: GameSetupStep; label: string }

const STEPS = computed((): StepDef[] => {
  const base: StepDef[] = [
    { key: 'deck_selection', label: 'DECK' },
    { key: 'select_battlefield', label: 'CHAMP DE BATAILLE' },
    { key: 'dice_roll', label: 'DÉ' },
  ]
  if (props.mode === 'dual') {
    base.push({ key: 'choose_first_player', label: 'PREMIER JOUEUR' })
  } else {
    base.push({ key: 'select_battlefield_discard', label: 'DÉFAUSSE CHAMP' })
  }
  base.push({ key: 'mulligan', label: 'MULLIGAN' })
  return base
})

const currentIndex = computed(() => STEPS.value.findIndex(s => s.key === props.setup))

function statusOf(i: number): 'done' | 'current' | 'upcoming' {
  if (i < currentIndex.value) return 'done'
  if (i === currentIndex.value) return 'current'
  return 'upcoming'
}

const matchFormatLabel = computed(() => {
  const labels: Record<GameMatchFormat, string> = { BO1: 'MANCHE UNIQUE', BO3: 'MEILLEUR DES 3', BO5: 'MEILLEUR DES 5' }
  return labels[props.matchFormat] ?? props.matchFormat
})
</script>

<template>
  <div class="timeline">
    <div class="timeline__steps">
      <template v-for="(step, i) in STEPS" :key="i">
        <div class="step" :class="`step--${statusOf(i)}`">
          <span class="step__dot">
            <svg v-if="statusOf(i) === 'done'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span v-else>{{ i + 1 }}</span>
          </span>
          <span class="step__label">{{ step.label }}</span>
        </div>
        <div v-if="i < STEPS.length - 1" class="step__connector" :class="{ 'step__connector--done': i < currentIndex }" />
      </template>
    </div>

    <div class="timeline__match">
      <span class="timeline__match-key">MANCHE</span>
      <span class="timeline__match-val">PARTIE {{ round }} / {{ matchFormatLabel }}</span>
    </div>
  </div>
</template>

<style scoped>
.timeline {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.5rem;
  padding: 0.85rem 1.5rem;
  background: rgba(4, 10, 20, 0.65);
  border-bottom: 1px solid rgba(200, 170, 110, 0.14);
  flex-shrink: 0;
}

.timeline__steps {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.step { display: flex; align-items: center; gap: 0.45rem; }

.step__dot {
  width: 1.25rem;
  height: 1.25rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.6rem;
  font-weight: 900;
  border: 1px solid rgba(90, 110, 130, 0.4);
  color: #4a6a70;
  flex-shrink: 0;
}
.step__dot svg { width: 0.7rem; height: 0.7rem; }

.step__label {
  font-size: 0.58rem;
  letter-spacing: 0.18em;
  font-weight: 700;
  color: #4a6a70;
  white-space: nowrap;
}

.step--done .step__dot { border-color: #00ccb9; color: #00ccb9; background: rgba(0, 204, 185, 0.12); }
.step--done .step__label { color: #00ccb9; }

.step--current .step__dot { border-color: #c8aa6e; color: #c8aa6e; background: rgba(200, 170, 110, 0.16); }
.step--current .step__label { color: #f2e5cd; font-weight: 900; }

.step__connector { width: 1rem; height: 1px; background: rgba(90, 110, 130, 0.3); flex-shrink: 0; }
.step__connector--done { background: rgba(0, 204, 185, 0.35); }

.timeline__match { display: flex; flex-direction: column; align-items: flex-end; flex-shrink: 0; }
.timeline__match-key { font-size: 0.5rem; letter-spacing: 0.3em; color: #4a6a70; font-weight: 700; }
.timeline__match-val { font-size: 0.7rem; letter-spacing: 0.12em; color: #c8aa6e; font-weight: 900; }
</style>
