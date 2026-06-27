<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import type { Card } from '@riftbound/shared'
import { useGameStore } from '@/stores/game'
import GameSetupTimeline from '@/components/GameSetupTimeline.vue'
import GameSetupPanel from '@/components/GameSetupPanel.vue'
import SlotInner from '@/components/SlotInner.vue'
import GameBoardDual from './GameBoardDual.vue'
import GameBoard2v2 from './GameBoard2v2.vue'
import GameBoardFFA from './GameBoardFFA.vue'

const route = useRoute()
const game = useGameStore()

const gameId = computed(() => route.params.gameId as string)

onMounted(() => { game.attachGame(gameId.value) })
onUnmounted(() => { game.detach() })

const isSetup = computed(() =>
  !game.currentRound || game.currentRound.setup !== 'completed',
)

// ── Sidebar helpers ───────────────────────────────────────────────────────────

function playerName(uid: string) {
  return game.playerNames[uid]?.name ?? uid
}

function playerState(uid: string) {
  return game.currentRound?.players[uid] ?? null
}

// My own legend: visible immediately after I import my deck
// Opponent's legend: only visible once every player has submitted their deck
function legendCardFor(uid: string) {
  if (uid === game.myUid) return game.myDeck?.legend ?? null
  return game.allDecksDone ? (playerState(uid)?.legendCard ?? null) : null
}

// Use battlefieldCard stored in PlayerState (works for both self and opponents)
function bfCard(uid: string) {
  return playerState(uid)?.battlefieldCard ?? null
}

// BF cards only revealed once every player has selected their battlefield
const bfRevealed = computed(() => game.allBFDone)

// ── Panel props ───────────────────────────────────────────────────────────────

const myBattlefields = computed(() => game.myDeck?.battlefields ?? [])

const setup = computed(() => game.currentRound?.setup ?? 'deck_selection')

// Keep showing dice_roll UI until the animation finishes, even if the server already advanced
const effectiveSetup = computed(() =>
  dicePhase.value && (setup.value === 'choose_first_player' || setup.value === 'select_battlefield_discard')
    ? 'dice_roll'
    : setup.value,
)
const round = computed(() => game.currentRound?.round ?? 1)
const matchFormat = computed(() => game.matchFormat ?? 'BO1')
const mode = computed(() => game.mode ?? 'dual')

function handleImportDeck(text: string) {
  game.importDeck(text)
}

function handleSubmitSideboard(newDeckList: import('@riftbound/shared').DeckList) {
  game.submitSideboard(newDeckList)
}

function handleSelectBattlefield(card: Card) {
  game.selectBattlefield(card)
}

// dicePhase stays true for DICE_ANIM_MS regardless of how fast the server advances the step.
// Without this, dicePhase (= setup === 'dice_roll') turns false in < 1s and kills the animation.
const DICE_ANIM_MS = 4000
const dicePhase = ref(false)
let dicePhaseTimer: ReturnType<typeof setTimeout> | null = null

function startDiceAnimation() {
  if (dicePhaseTimer) clearTimeout(dicePhaseTimer)
  dicePhase.value = true
  dicePhaseTimer = setTimeout(() => { dicePhase.value = false }, DICE_ANIM_MS)
}

// Initial dice_roll step entry
watch(setup, (step) => {
  if (step !== 'dice_roll') return
  if (!game.myState?.diceRoll) game.rollDice()
  startDiceAnimation()
})

// Tie detected: animate but wait for the manual "RELANCER" button
watch(
  () => game.tiedPlayerIds,
  (tied) => {
    if (tied && game.myUid && tied.includes(game.myUid)) {
      startDiceAnimation()
    }
  },
)

// Re-roll button in center panel (manual trigger, already starts animation via watcher above,
// but kept as fallback for the emit path)
function handleReroll() {
  startDiceAnimation()
  game.rollDice()
}

// ── choose_first_player ───────────────────────────────────────────────────────

const isDiceWinner = computed(() =>
  !!(game.currentRound?.diceWinnerId && game.currentRound.diceWinnerId === game.myUid),
)

const playerChoices = computed(() => {
  return game.playerIds.map((uid) => {
    const legendName = game.currentRound?.players[uid]?.legendCard?.name
    if (uid === game.myUid) return { uid, label: 'Moi' }
    return { uid, label: legendName ? `Adversaire` : playerName(uid) }
  })
})

function handleChooseFirstPlayer(uid: string) {
  game.chooseFirstPlayer(uid)
}

// ── select_battlefield_discard ────────────────────────────────────────────────

const allBFCards = computed(() => {
  const map: Record<string, import('@riftbound/shared').Card | null> = {}
  for (const uid of game.playerIds) {
    map[uid] = game.currentRound?.players[uid]?.battlefieldCard ?? null
  }
  return map
})

function handleDiscardBattlefield(cardId: string) {
  game.discardBattlefield(cardId)
}

function handleConfirmDiscard() {
  if (isDiceWinner.value) game.confirmDiscard()
}

// ── Mulligan ──────────────────────────────────────────────────────────────────

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const mulliganHand = ref<import('@riftbound/shared').Card[]>([])

watch(setup, (step) => {
  if (step !== 'mulligan') return
  // Auto-skip mulligan until bug is fixed — submit immediately with 0 swaps
  if (!game.myState?.mulliganDone) game.submitMulligan(0)
  if (!game.myDeck?.mainDeck?.length) return
  mulliganHand.value = shuffleArray(game.myDeck.mainDeck).slice(0, 4)
})

const myMulliganDone = computed(() => game.myState?.mulliganDone ?? false)
const myMulliganCount = computed(() => game.myState?.mulliganCount ?? null)
const allMulliganDone = computed(() =>
  game.currentRound
    ? Object.values(game.currentRound.players).every((p) => p.mulliganDone)
    : false,
)

function handleSubmitMulligan(count: number) {
  game.submitMulligan(count)
}

const isDev = import.meta.env.DEV
</script>

<template>
  <!-- ── Setup flow (steps 1-N) ──────────────────────────────────────────── -->
  <div v-if="isSetup" class="game-view">
    <GameSetupTimeline
      :setup="setup"
      :mode="mode"
      :round="round"
      :match-format="matchFormat"
    />

    <div class="game-body">
      <!-- Left sidebar: my team -->
      <div class="sidebar sidebar--left">
        <span class="sidebar__label">MON CAMP</span>
        <SlotInner
          v-for="uid in game.myTeam"
          :key="uid"
          :player-name="playerName(uid)"
          :is-me="uid === game.myUid"
          :deck-submitted="playerState(uid)?.hasSubmittedDeck ?? false"
          :legend-card="legendCardFor(uid)"
          :bf-revealed="bfRevealed"
          :bf-card="bfCard(uid)"
          :dice-roll="playerState(uid)?.diceRoll ?? null"
          :is-dice-winner="game.currentRound?.diceWinnerId === uid"
          :dice-phase="dicePhase"
          :is-first-player="game.currentRound?.firstPlayerId ? game.currentRound.firstPlayerId === uid : undefined"
        />
      </div>

      <!-- Center: dynamic action zone -->
      <div class="game-center">
        <div class="game-center__inner">
          <GameSetupPanel
            :setup="effectiveSetup"
            :battlefields="myBattlefields"
            :all-decks-done="game.allDecksDone"
            :all-b-f-done="game.allBFDone"
            :all-sideboard-done="game.allSideboardDone"
            :importing="game.importing"
            :import-error="game.importError"
            :is-tied="!!(game.tiedPlayerIds && game.myUid && game.tiedPlayerIds.includes(game.myUid))"
            :my-dice-roll="game.myState?.diceRoll ?? null"
            :current-deck-list="game.myDeck"
            :my-sideboard-done="game.myState?.sideboardDone ?? false"
            :used-battlefield-ids="game.myUid ? (game.currentRound?.usedBattlefields?.[game.myUid] ?? []) : []"
            :is-dice-winner="isDiceWinner"
            :player-choices="playerChoices"
            :first-player-id="game.currentRound?.firstPlayerId ?? null"
            :bf-display-order="game.bfDisplayOrder"
            :all-b-f-cards="allBFCards"
            :discarded-b-f-id="game.currentRound?.discardedBattlefieldId ?? null"
            @import-deck="handleImportDeck"
            @submit-sideboard="handleSubmitSideboard"
            @select-battlefield="handleSelectBattlefield"
            @reroll="handleReroll"
            :mulligan-hand="mulliganHand"
            :my-mulligan-done="myMulliganDone"
            :my-mulligan-count="myMulliganCount"
            :all-mulligan-done="allMulliganDone"
            @choose-first-player="handleChooseFirstPlayer"
            @discard-battlefield="handleDiscardBattlefield"
            @confirm-discard="handleConfirmDiscard"
            @submit-mulligan="handleSubmitMulligan"
          />
        </div>
      </div>

      <!-- Right sidebar: opponents -->
      <div class="sidebar sidebar--right">
        <span class="sidebar__label">{{ mode === '2v2' ? 'ADVERSAIRES' : 'ADVERSAIRE' }}</span>
        <SlotInner
          v-for="uid in game.opponents"
          :key="uid"
          :player-name="playerName(uid)"
          :is-me="false"
          :deck-submitted="playerState(uid)?.hasSubmittedDeck ?? false"
          :legend-card="legendCardFor(uid)"
          :bf-revealed="bfRevealed"
          :bf-card="bfCard(uid)"
          :dice-roll="playerState(uid)?.diceRoll ?? null"
          :is-dice-winner="game.currentRound?.diceWinnerId === uid"
          :dice-phase="dicePhase"
          :is-first-player="game.currentRound?.firstPlayerId ? game.currentRound.firstPlayerId === uid : undefined"
        />
      </div>
    </div>

    <!-- DEV ONLY: skip all setup steps instantly -->
    <button v-if="isDev" class="dev-skip-btn" @click="game.devSkipSetup()">
      ⚡ DEV SKIP
    </button>
  </div>

  <!-- ── Post-setup: game board ──────────────────────────────────────────── -->
  <template v-else>
    <GameBoardDual v-if="mode === 'dual'" />
    <GameBoard2v2 v-else-if="mode === '2v2'" />
    <GameBoardFFA v-else-if="mode === 'FFA'" />
  </template>
</template>

<style scoped>
/* 100vh/100vw — bypass any flex-centering from GameLayout */
.game-view {
  display: flex;
  flex-direction: column;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}

.game-body {
  display: grid;
  grid-template-columns: 240px 1fr 240px;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

/* Sidebars — fixed height, no scroll */
.sidebar {
  background: rgba(4, 10, 20, 0.6);
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px 12px;
  overflow: hidden;
  height: 100%;
}

.sidebar--left { border-right: 1px solid rgba(200, 170, 110, 0.1); }
.sidebar--right { border-left: 1px solid rgba(200, 170, 110, 0.1); }

.sidebar__label {
  font-size: 0.48rem;
  letter-spacing: 0.3em;
  font-weight: 700;
  color: #4a6a70;
  flex-shrink: 0;
}

/* Each SlotInner fills its share of the sidebar height */
.sidebar :deep(.slot) {
  flex: 1;
  min-height: 0;
}

/* Center */
.game-center {
  background: #060d19;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow-y: auto;
  min-height: 0;
  padding: 24px 0;
}

.game-center__inner {
  width: 80%;
  height: 100%;
}

.dev-skip-btn {
  position: fixed;
  bottom: 16px;
  right: 16px;
  z-index: 9999;
  padding: 8px 16px;
  background: #ff4500;
  color: #fff;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  opacity: 0.85;
}
.dev-skip-btn:hover { opacity: 1; }
</style>
