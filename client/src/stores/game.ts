import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { doc, onSnapshot, updateDoc, serverTimestamp, type Unsubscribe } from 'firebase/firestore'
import type { Card, CardVisibleTo, DeckList, GameAction, GameMode, GameMatchFormat, GameDeckFormat, GameRound, ZoneId } from '@riftbound/shared'
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

  function resolveVisibility(cardId: string, toZoneId: ZoneId): CardVisibleTo {
    const card = currentRound.value?.cards[cardId]
    // Card already hidden by the player → keep hidden wherever it goes
    if (card?.state.visibleTo === 'NOBODY' && !DECK_ZONES.has(card.zoneId)) return 'NOBODY'
    // Deck zones → always hidden
    if (DECK_ZONES.has(toZoneId)) return 'NOBODY'
    // Going to hand → visible only to self
    if (toZoneId === 'hand') return 'SELF'
    // Everywhere else (battlefield, runes, discard, banish…) → visible to all
    return 'ALL'
  }

  function sendToDeck(cardId: string, deckZone: ZoneId, position: 'top' | 'bottom') {
    const round = currentRound.value
    if (!round?.cards[cardId]) return
    const ref = roundRef()
    if (!ref) return

    const deckCards = Object.values(round.cards).filter(c => c.zoneId === deckZone)
    const newOrder = position === 'top'
      ? Math.max(-1, ...deckCards.map(c => c.order)) + 1
      : Math.min(0, ...deckCards.map(c => c.order)) - 1

    round.cards[cardId] = {
      ...round.cards[cardId],
      zoneId: deckZone,
      order: newOrder,
      state: { ...round.cards[cardId].state, visibleTo: 'NOBODY', exhausted: round.cards[cardId].state.exhausted },
    }

    updateDoc(ref, {
      [`cards.${cardId}.zoneId`]: deckZone,
      [`cards.${cardId}.order`]: newOrder,
      [`cards.${cardId}.state.visibleTo`]: 'NOBODY',
      _updatedBy: sessionId,
      updatedAt: serverTimestamp(),
    }).catch(console.error)
  }

  const DISSOLVE_GROUP_ZONES = new Set<ZoneId>(['discard', 'banish', 'hand', 'main_deck', 'runes_deck'])

  // Remove a card from any group it belongs to (as parent or child)
  function dissolveGroup(cardId: string, ref: ReturnType<typeof roundRef>) {
    const round = currentRound.value
    if (!round || !ref) return
    const updates: Record<string, unknown> = {}

    // Clear children if this card is a parent
    const card = round.cards[cardId]
    if (card?.state.groupTo?.length) {
      round.cards[cardId] = { ...card, state: { ...card.state, groupTo: [] } }
      updates[`cards.${cardId}.state.groupTo`] = []
    }

    // Remove this card from any parent's groupTo
    for (const [id, c] of Object.entries(round.cards)) {
      if (id === cardId) continue
      const idx = c.state.groupTo?.indexOf(cardId) ?? -1
      if (idx === -1) continue
      const newGroupTo = c.state.groupTo!.filter(gid => gid !== cardId)
      round.cards[id] = { ...c, state: { ...c.state, groupTo: newGroupTo } }
      updates[`cards.${id}.state.groupTo`] = newGroupTo
    }

    if (Object.keys(updates).length) {
      updateDoc(ref, { ...updates, _updatedBy: sessionId, updatedAt: serverTimestamp() }).catch(console.error)
    }
  }

  // Zones where cards are placed permanently — exhausted state is managed manually
  const NO_AUTO_EXHAUST_ZONES = new Set<ZoneId>(['champion', 'legend', 'hand', 'main_deck', 'runes_deck'])

  // Core primitive — all game actions funnel through this
  function commitMove(cardId: string, toZoneId: ZoneId, overrideVisibility?: CardVisibleTo) {
    const round = currentRound.value
    if (!round?.cards[cardId]) return
    const ref = roundRef()
    if (!ref) return

    if (DISSOLVE_GROUP_ZONES.has(toZoneId)) dissolveGroup(cardId, ref)

    const newOrder = Math.max(-1, ...Object.values(round.cards).filter(c => c.zoneId === toZoneId).map(c => c.order)) + 1
    const newVisibility = overrideVisibility ?? resolveVisibility(cardId, toZoneId)
    const isHidden = newVisibility === 'NOBODY'
    const shouldExhaust = !isHidden && !NO_AUTO_EXHAUST_ZONES.has(toZoneId)

    round.cards[cardId] = {
      ...round.cards[cardId],
      zoneId: toZoneId,
      order: newOrder,
      state: {
        ...round.cards[cardId].state,
        visibleTo: newVisibility,
        ...(shouldExhaust ? { exhausted: true } : {}),
      },
    }

    updateDoc(ref, {
      [`cards.${cardId}.zoneId`]: toZoneId,
      [`cards.${cardId}.order`]: newOrder,
      [`cards.${cardId}.state.visibleTo`]: newVisibility,
      ...(shouldExhaust ? { [`cards.${cardId}.state.exhausted`]: true } : {}),
      _updatedBy: sessionId,
      updatedAt: serverTimestamp(),
    }).catch(console.error)
  }

  function applyAction(action: GameAction) {
    const round = currentRound.value
    if (!round) return
    const ref = roundRef()
    if (!ref) return

    switch (action.type) {
      case 'DRAW_CARD':
        commitMove(action.cardId, 'hand', 'SELF')
        break

      case 'CHANNEL_CARD':
        commitMove(action.cardId, 'runes', 'ALL')
        break

      case 'RECYCLE_RUNE':
        commitMove(action.cardId, 'runes_deck', 'NOBODY')
        break

      case 'PLAY_CARD':
      case 'MOVE_CARD':
        commitMove(action.cardId, action.toZoneId)
        break

      case 'MOVE_TO_HAND':
        commitMove(action.cardId, 'hand')
        break

      case 'DISCARD_CARD':
        commitMove(action.cardId, 'discard')
        break

      case 'BANISH_CARD':
        commitMove(action.cardId, 'banish')
        break

      case 'HIDE_CARD': {
        const card = round.cards[action.cardId]
        if (!card) return
        round.cards[action.cardId] = { ...card, state: { ...card.state, visibleTo: 'NOBODY' } }
        updateDoc(ref, {
          [`cards.${action.cardId}.state.visibleTo`]: 'NOBODY',
          _updatedBy: sessionId,
          updatedAt: serverTimestamp(),
        }).catch(console.error)
        break
      }

      case 'REVEAL_CARD': {
        const card = round.cards[action.cardId]
        if (!card) return
        round.cards[action.cardId] = { ...card, state: { ...card.state, visibleTo: 'ALL' } }
        updateDoc(ref, {
          [`cards.${action.cardId}.state.visibleTo`]: 'ALL',
          _updatedBy: sessionId,
          updatedAt: serverTimestamp(),
        }).catch(console.error)
        break
      }

      case 'REVEAL_CARD_FOR_SELF': {
        const card = round.cards[action.cardId]
        if (!card) return
        round.cards[action.cardId] = { ...card, state: { ...card.state, visibleTo: 'SELF' } }
        updateDoc(ref, {
          [`cards.${action.cardId}.state.visibleTo`]: 'SELF',
          _updatedBy: sessionId,
          updatedAt: serverTimestamp(),
        }).catch(console.error)
        break
      }

      case 'TOGGLE_EXHAUSTED': {
        const card = round.cards[action.cardId]
        if (!card) return
        const newValue = !card.state.exhausted
        round.cards[action.cardId] = { ...card, state: { ...card.state, exhausted: newValue } }
        updateDoc(ref, {
          [`cards.${action.cardId}.state.exhausted`]: newValue,
          _updatedBy: sessionId,
          updatedAt: serverTimestamp(),
        }).catch(console.error)
        break
      }

      case 'GROUP_CARD': {
        const parent = round.cards[action.parentId]
        const child  = round.cards[action.childId]
        if (!parent || !child) return
        // A card that already has children cannot become a child
        if (child.state.groupTo?.length) return

        // Remove child from any existing parent first
        const updates: Record<string, unknown> = {}
        for (const [id, c] of Object.entries(round.cards)) {
          const idx = c.state.groupTo?.indexOf(action.childId) ?? -1
          if (idx === -1) continue
          const ng = c.state.groupTo!.filter(gid => gid !== action.childId)
          round.cards[id] = { ...c, state: { ...c.state, groupTo: ng } }
          updates[`cards.${id}.state.groupTo`] = ng
        }

        const newGroupTo = [...(parent.state.groupTo ?? []), action.childId]
        round.cards[action.parentId] = { ...parent, state: { ...parent.state, groupTo: newGroupTo } }
        updates[`cards.${action.parentId}.state.groupTo`] = newGroupTo

        updateDoc(ref, { ...updates, _updatedBy: sessionId, updatedAt: serverTimestamp() }).catch(console.error)
        break
      }

      case 'UNGROUP_CARD': {
        const updates: Record<string, unknown> = {}
        for (const [id, c] of Object.entries(round.cards)) {
          const idx = c.state.groupTo?.indexOf(action.cardId) ?? -1
          if (idx === -1) continue
          const ng = c.state.groupTo!.filter(gid => gid !== action.cardId)
          round.cards[id] = { ...c, state: { ...c.state, groupTo: ng } }
          updates[`cards.${id}.state.groupTo`] = ng
        }
        // Also clear groupTo if this card itself is a parent
        const self = round.cards[action.cardId]
        if (self?.state.groupTo?.length) {
          round.cards[action.cardId] = { ...self, state: { ...self.state, groupTo: [] } }
          updates[`cards.${action.cardId}.state.groupTo`] = []
        }
        if (Object.keys(updates).length) {
          updateDoc(ref, { ...updates, _updatedBy: sessionId, updatedAt: serverTimestamp() }).catch(console.error)
        }
        break
      }

      case 'SET_COUNTERS':
      case 'SET_DAMAGES':
      case 'SET_BUFF': {
        const field = action.type === 'SET_COUNTERS' ? 'counters' : action.type === 'SET_DAMAGES' ? 'damages' : 'buffs'
        const card = round.cards[action.cardId]
        if (!card) return
        round.cards[action.cardId] = { ...card, state: { ...card.state, [field]: action.value } }
        updateDoc(ref, {
          [`cards.${action.cardId}.state.${field}`]: action.value,
          _updatedBy: sessionId,
          updatedAt: serverTimestamp(),
        }).catch(console.error)
        break
      }
    }
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
    sendToDeck,
    importDeck,
    selectBattlefield,
    rollDice,
    chooseFirstPlayer,
    discardBattlefield,
    confirmDiscard,
    submitMulligan,
    devSkipSetup,
    applyAction,
  }
})
