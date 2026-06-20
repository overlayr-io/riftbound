import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { doc, onSnapshot, type Unsubscribe } from 'firebase/firestore'
import type { Card, DeckList, GameMode, GameMatchFormat, GameDeckFormat, GameRound } from '@riftbound/shared'
import type { PlayerId } from '@riftbound/shared'
import { firestore } from '@/firebase'
import { useAuthStore } from './auth'
import { gameApi } from '@/services/api'
import { DeckParser } from '@/utils/deckParser'

export const useGameStore = defineStore('game', () => {
  const authStore = useAuthStore()

  // ── Game metadata ────────────────────────────────────────────────────────────
  const gameId = ref<string | null>(null)
  const mode = ref<GameMode | null>(null)
  const matchFormat = ref<GameMatchFormat | null>(null)
  const deckFormat = ref<GameDeckFormat | null>(null)
  const playerIds = ref<PlayerId[]>([])
  const playerNames = ref<Record<PlayerId, { name: string; teamId: '1' | '2' | null }>>({})
  const currentRoundId = ref<string | null>(null)

  // ── Current round ────────────────────────────────────────────────────────────
  const currentRound = ref<GameRound | null>(null)

  // ── Local deck state (client-only until submitted) ───────────────────────────
  const myDeck = ref<DeckList | null>(null)
  const importing = ref(false)
  const importError = ref<string | null>(null)

  // ── Listeners ────────────────────────────────────────────────────────────────
  let unsubGame: Unsubscribe | null = null
  let unsubRound: Unsubscribe | null = null

  // ── Computed ─────────────────────────────────────────────────────────────────

  const myUid = computed(() => authStore.user?.uid ?? null)

  const myState = computed(() => {
    const uid = myUid.value
    if (!uid || !currentRound.value) return null
    return currentRound.value.players[uid] ?? null
  })

  const myTeam = computed((): PlayerId[] => {
    const uid = myUid.value
    if (!uid) return []
    if (mode.value !== '2v2') return [uid]
    const myTeamId = playerNames.value[uid]?.teamId
    return playerIds.value.filter((id) => playerNames.value[id]?.teamId === myTeamId)
  })

  const opponents = computed((): PlayerId[] => {
    const uid = myUid.value
    if (!uid) return []
    const mine = new Set(myTeam.value)
    return playerIds.value.filter((id) => !mine.has(id))
  })

  const allDecksDone = computed(() =>
    currentRound.value
      ? Object.values(currentRound.value.players).every((p) => p.hasSubmittedDeck)
      : false,
  )

  const allBFDone = computed(() =>
    currentRound.value
      ? Object.values(currentRound.value.players).every((p) => p.submittedBattlefield !== null)
      : false,
  )

  const allDiceRolled = computed(() =>
    currentRound.value
      ? Object.values(currentRound.value.players).every((p) => p.diceRoll !== null)
      : false,
  )

  const tiedPlayerIds = computed(() => currentRound.value?.tiedPlayerIds ?? null)

  const bfDisplayOrder = computed(() => currentRound.value?.bfDisplayOrder ?? null)

  // ── Listeners ────────────────────────────────────────────────────────────────

  function attachRound(gId: string, rId: string) {
    unsubRound?.()
    unsubRound = onSnapshot(
      doc(firestore, 'games', gId, 'rounds', rId),
      (snap) => {
        if (!snap.exists()) return
        const d = snap.data()
        currentRound.value = {
          roundId: snap.id,
          gameId: d.gameId,
          round: d.round,
          previousRound: d.previousRound ?? null,
          setup: d.setup,
          diceWinnerId: d.diceWinnerId ?? null,
          tiedPlayerIds: d.tiedPlayerIds ?? null,
          firstPlayerId: d.firstPlayerId ?? null,
          discardedBattlefieldId: d.discardedBattlefieldId ?? null,
          bfDisplayOrder: d.bfDisplayOrder ?? null,
          winnerId: d.winnerId ?? null,
          currentTurn: d.currentTurn ?? null,
          players: d.players ?? {},
          cards: d.cards ?? {},
          updatedAt: d.updatedAt?.toDate() ?? new Date(),
          endedAt: d.endedAt?.toDate() ?? null,
        }
      },
      (err) => console.error('[round] listener error', err),
    )
  }

  function attachGame(id: string) {
    gameId.value = id

    unsubGame = onSnapshot(
      doc(firestore, 'games', id),
      (snap) => {
        if (!snap.exists()) return
        const d = snap.data()
        mode.value = d.mode
        matchFormat.value = d.matchFormat
        deckFormat.value = d.deckFormat
        playerIds.value = d.playerIds ?? []
        playerNames.value = d.playerNames ?? {}

        const newRoundId: string = d.currentRoundId
        if (newRoundId && newRoundId !== currentRoundId.value) {
          currentRoundId.value = newRoundId
          attachRound(id, newRoundId)
        }
      },
      (err) => console.error('[game] listener error', err),
    )
  }

  function detach() {
    unsubGame?.()
    unsubRound?.()
    unsubGame = null
    unsubRound = null
    gameId.value = null
    mode.value = null
    currentRoundId.value = null
    currentRound.value = null
    playerIds.value = []
    playerNames.value = {}
    myDeck.value = null
    importing.value = false
    importError.value = null
  }

  // ── Actions ──────────────────────────────────────────────────────────────────

  async function importDeck(deckText: string): Promise<void> {
    if (importing.value) return
    importing.value = true
    importError.value = null
    try {
      const parser = new DeckParser()
      const deck = await parser.parse(deckText)
      myDeck.value = deck
      if (gameId.value && currentRoundId.value && deck.legend) {
        await gameApi.submitDeck(gameId.value, currentRoundId.value, deck.legend)
      }
    } catch {
      importError.value = 'Erreur lors de l\'import du deck.'
    } finally {
      importing.value = false
    }
  }

  async function selectBattlefield(card: Card): Promise<void> {
    if (!gameId.value || !currentRoundId.value) return
    await gameApi.selectBattlefield(gameId.value, currentRoundId.value, card)
  }

  async function rollDice(): Promise<void> {
    if (!gameId.value || !currentRoundId.value) return
    await gameApi.rollDice(gameId.value, currentRoundId.value)
  }

  async function chooseFirstPlayer(chosenPlayerId: string): Promise<void> {
    if (!gameId.value || !currentRoundId.value) return
    await gameApi.chooseFirstPlayer(gameId.value, currentRoundId.value, chosenPlayerId)
  }

  async function discardBattlefield(cardId: string): Promise<void> {
    if (!gameId.value || !currentRoundId.value) return
    await gameApi.discardBattlefield(gameId.value, currentRoundId.value, cardId)
  }

  async function confirmDiscard(): Promise<void> {
    if (!gameId.value || !currentRoundId.value) return
    await gameApi.confirmDiscard(gameId.value, currentRoundId.value)
  }

  async function submitMulligan(count: number): Promise<void> {
    if (!gameId.value || !currentRoundId.value) return
    await gameApi.submitMulligan(gameId.value, currentRoundId.value, count)
  }

  return {
    gameId,
    mode,
    matchFormat,
    deckFormat,
    playerIds,
    playerNames,
    currentRoundId,
    currentRound,
    myDeck,
    importing,
    importError,
    myUid,
    myState,
    myTeam,
    opponents,
    allDecksDone,
    allBFDone,
    allDiceRolled,
    tiedPlayerIds,
    bfDisplayOrder,
    attachGame,
    detach,
    importDeck,
    selectBattlefield,
    rollDice,
    chooseFirstPlayer,
    discardBattlefield,
    confirmDiscard,
    submitMulligan,
  }
})
