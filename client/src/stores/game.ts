import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { doc, onSnapshot, updateDoc, serverTimestamp, type Unsubscribe } from 'firebase/firestore'
import type { Card, CardVisibleTo, DeckList, GameMode, GameMatchFormat, GameDeckFormat, GameRound, ZoneId } from '@riftbound/shared'
import type { PlayerId } from '@riftbound/shared'
import { firestore } from '@/firebase'
import { useAuthStore } from './auth'
import { gameApi } from '@/services/api'
import { DeckParser } from '@/utils/deckParser'

export const useGameStore = defineStore('game', () => {
  const authStore = useAuthStore()

  // Unique per browser tab — used to filter own Firestore echoes
  const sessionId = Math.random().toString(36).slice(2, 10)

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
        // Echo guard: skip own writes (optimistic update already applied locally)
        if (d['_updatedBy'] === sessionId) return
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
        await gameApi.submitDeck(gameId.value, currentRoundId.value, deck.legend, deck)
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

  async function devSkipSetup(): Promise<void> {
    if (!gameId.value || !currentRoundId.value) return
    const DEV_DECK = "Legend:\n1 Kha'Zix, Voidreaver\n\nChampion:\n1 Kha'Zix, Evolving Hunter\n\nMainDeck:\n3 Grim Resolve\n3 Irresistible Faefolk\n3 Void Assault\n\nBattlefields:\n1 Monastery of Hirana\n1 The Arena's Greatest\n1 Star Spring\n\nRunes:\n7 Body Rune\n5 Chaos Rune"
    const playersDecks: Record<string, DeckList> = {}
    for (const uid of playerIds.value) {
      playersDecks[uid] = await new DeckParser().parse(DEV_DECK)
    }
    await gameApi.devSkipSetup(gameId.value, currentRoundId.value, playersDecks)
  }

  // ── Direct Firestore game actions (client-side, optimistic) ──────────────────

  function roundRef() {
    const gId = gameId.value
    const rId = currentRoundId.value
    if (!gId || !rId) return null
    return doc(firestore, 'games', gId, 'rounds', rId)
  }

  const DECK_ZONES = new Set<ZoneId>(['main_deck', 'runes_deck'])

  function resolveVisibility(cardId: string, toZoneId: ZoneId): CardVisibleTo | null {
    const card = currentRound.value?.cards[cardId]
    if (!card) return null
    if (DECK_ZONES.has(toZoneId)) return 'NOBODY'
    if (toZoneId === 'hand') {
      // Don't reveal a card that was explicitly hidden by the player
      return card.state.visibleTo === 'NOBODY' && !DECK_ZONES.has(card.zoneId) ? 'NOBODY' : 'SELF'
    }
    return null
  }

  function moveCard(cardId: string, toZoneId: ZoneId) {
    const round = currentRound.value
    if (!round?.cards[cardId]) return
    const ref = roundRef()
    if (!ref) return

    const targetCards = Object.values(round.cards).filter(c => c.zoneId === toZoneId)
    const newOrder = targetCards.length > 0 ? Math.max(...targetCards.map(c => c.order)) + 1 : 0
    const newVisibility = resolveVisibility(cardId, toZoneId)

    round.cards[cardId] = {
      ...round.cards[cardId],
      zoneId: toZoneId,
      order: newOrder,
      ...(newVisibility ? { state: { ...round.cards[cardId].state, visibleTo: newVisibility } } : {}),
    }

    updateDoc(ref, {
      [`cards.${cardId}.zoneId`]: toZoneId,
      [`cards.${cardId}.order`]: newOrder,
      ...(newVisibility ? { [`cards.${cardId}.state.visibleTo`]: newVisibility } : {}),
      _updatedBy: sessionId,
      updatedAt: serverTimestamp(),
    }).catch(console.error)
  }

  function drawTopCard(ownerId: string, fromZone: ZoneId, toZone: ZoneId) {
    const round = currentRound.value
    if (!round) return
    const ref = roundRef()
    if (!ref) return

    const topCard = Object.values(round.cards)
      .filter(c => c.ownerId === ownerId && c.zoneId === fromZone)
      .sort((a, b) => b.order - a.order)[0]
    if (!topCard) return

    const toCards = Object.values(round.cards)
      .filter(c => c.ownerId === ownerId && c.zoneId === toZone)
    const newOrder = toCards.length > 0 ? Math.max(...toCards.map(c => c.order)) + 1 : 0

    // Optimistic update → card animates instantly from deck to hand
    round.cards[topCard.cardId] = {
      ...round.cards[topCard.cardId],
      zoneId: toZone,
      order: newOrder,
      state: { ...round.cards[topCard.cardId].state, visibleTo: 'SELF' },
    }

    updateDoc(ref, {
      [`cards.${topCard.cardId}.zoneId`]: toZone,
      [`cards.${topCard.cardId}.order`]: newOrder,
      [`cards.${topCard.cardId}.state.visibleTo`]: 'SELF',
      _updatedBy: sessionId,
      updatedAt: serverTimestamp(),
    }).catch(console.error)
  }

  function toggleExhausted(cardId: string) {
    const round = currentRound.value
    if (!round?.cards[cardId]) return
    const ref = roundRef()
    if (!ref) return

    const newValue = !round.cards[cardId].state.exhausted

    // Optimistic update
    round.cards[cardId] = {
      ...round.cards[cardId],
      state: { ...round.cards[cardId].state, exhausted: newValue },
    }

    updateDoc(ref, {
      [`cards.${cardId}.state.exhausted`]: newValue,
      _updatedBy: sessionId,
      updatedAt: serverTimestamp(),
    }).catch(console.error)
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
    devSkipSetup,
    moveCard,
    drawTopCard,
    toggleExhausted,
  }
})
