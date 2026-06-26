import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { doc, addDoc, collection, onSnapshot, updateDoc, serverTimestamp, deleteField, type Unsubscribe } from 'firebase/firestore'
import type { Card, CardState, CardType, CardVisibleTo, DeckList, GameAction, GameMode, GameMatchFormat, GameDeckFormat, GameRound, ShowdownData, ZoneId } from '@riftbound/shared'
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
  const roundResults = ref<{ round: number; winnerId: PlayerId }[]>([])
  const leftPlayers = ref<PlayerId[]>([])
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

  const allSideboardDone = computed(() =>
    currentRound.value
      ? Object.values(currentRound.value.players).every((p) => p.sideboardDone)
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
          usedBattlefields: d.usedBattlefields ?? null,
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
          showdowns: d.showdowns ?? {},
          updatedAt: d.updatedAt?.toDate() ?? new Date(),
          endedAt: d.endedAt?.toDate() ?? null,
        }
        // On sideboard step, deck was carried over from previous round — load it locally
        const uid = myUid.value
        if (d.setup === 'sideboard' && uid && !myDeck.value) {
          myDeck.value = d.players?.[uid]?.deckList ?? null
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
        roundResults.value = d.roundResults ?? []
        leftPlayers.value = d.leftPlayers ?? []

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
    roundResults.value = []
    leftPlayers.value = []
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

  function resolveStack() {
    const round = currentRound.value
    if (!round) return
    const ref = roundRef()
    if (!ref) return

    const stackCards = Object.values(round.cards).filter(c => c.zoneId === 'stack')
    if (!stackCards.length) return

    // Pick the top card (highest order = last played)
    const card = stackCards.reduce((a, b) => a.order > b.order ? a : b)
    const uid = myUid.value
    if (uid) writeLog(`${actorName(uid)} a résolu ${card.description?.name ?? 'une carte'} depuis le stack`, uid)

    // Stack copies are destroyed on resolve rather than moved to discard
    if (card.isStackCopy) {
      destroyToken(card.cardId)
      return
    }

    const discardCards = Object.values(round.cards).filter(c => c.zoneId === 'discard')
    const newOrder = Math.max(-1, ...discardCards.map(c => c.order)) + 1

    const updated: CardState = {
      ...card,
      zoneId: 'discard',
      order: newOrder,
      state: { ...card.state, visibleTo: 'ALL', exhausted: false, groupTo: [] },
    }
    round.cards[card.cardId] = updated

    updateDoc(ref, {
      [`cards.${card.cardId}.zoneId`]:          'discard',
      [`cards.${card.cardId}.order`]:           newOrder,
      [`cards.${card.cardId}.state.visibleTo`]: 'ALL',
      [`cards.${card.cardId}.state.exhausted`]: false,
      [`cards.${card.cardId}.state.groupTo`]:   [],
      _updatedBy: sessionId,
      updatedAt: serverTimestamp(),
    }).catch(console.error)
  }

  function sendToDeck(cardId: string, deckZone: ZoneId, position: 'top' | 'bottom', silent = false) {
    const round = currentRound.value
    if (!round?.cards[cardId]) return
    const ref = roundRef()
    if (!ref) return
    const uid = myUid.value
    if (uid && !silent) writeLog(`${actorName(uid)} a placé ${cardName(cardId)} ${position === 'top' ? 'au-dessus' : 'en-dessous'} de ${zoneFr(deckZone)}`, uid)

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

  // Move a card to the owner's hand without writing a log entry (used by Vision
  // so the card name is not leaked to opponents via the game log).
  function moveToHandSilent(cardId: string) {
    commitMove(cardId, 'hand', 'SELF')
  }

  function shuffleDeck(deckZone: ZoneId) {
    const round = currentRound.value
    const ref = roundRef()
    if (!round || !ref) return
    const deckCards = Object.values(round.cards).filter(c => c.zoneId === deckZone)
    if (deckCards.length < 2) return
    const orders = deckCards.map(c => c.order).sort((a, b) => a - b)
    const shuffledOrders = [...orders].sort(() => Math.random() - 0.5)
    const updates: Record<string, unknown> = {}
    deckCards.forEach((card, i) => {
      round.cards[card.cardId] = { ...card, order: shuffledOrders[i] }
      updates[`cards.${card.cardId}.order`] = shuffledOrders[i]
    })
    updateDoc(ref, { ...updates, _updatedBy: sessionId, updatedAt: serverTimestamp() }).catch(console.error)
  }

  function shuffleHand(ownerId: string) {
    const round = currentRound.value
    const ref = roundRef()
    if (!round || !ref) return
    const handCards = Object.values(round.cards).filter(c => c.zoneId === 'hand' && c.ownerId === ownerId)
    if (handCards.length < 2) return
    const orders = handCards.map(c => c.order).sort((a, b) => a - b)
    let shuffled = [...orders].sort(() => Math.random() - 0.5)
    shuffled = shuffled.sort(() => Math.random() - 0.5)
    const updates: Record<string, unknown> = {}
    handCards.forEach((card, i) => {
      round.cards[card.cardId] = { ...card, order: shuffled[i] }
      updates[`cards.${card.cardId}.order`] = shuffled[i]
    })
    updateDoc(ref, { ...updates, _updatedBy: sessionId, updatedAt: serverTimestamp() }).catch(console.error)
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

  // Zones where tokens are destroyed instead of moved
  const TOKEN_DESTROY_ZONES = new Set<ZoneId>(['banish', 'discard', 'main_deck', 'runes_deck', 'hand'])

  // Core primitive — all game actions funnel through this
  function commitMove(cardId: string, toZoneId: ZoneId, overrideVisibility?: CardVisibleTo) {
    const round = currentRound.value
    if (!round?.cards[cardId]) return
    const ref = roundRef()
    if (!ref) return

    // Stack copies are destroyed on any move out of the stack
    if (round.cards[cardId].isStackCopy && round.cards[cardId].zoneId === 'stack') {
      destroyToken(cardId)
      return
    }

    // Tokens are destroyed when leaving the board
    if (round.cards[cardId].isToken && TOKEN_DESTROY_ZONES.has(toZoneId)) {
      destroyToken(cardId)
      return
    }

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

  const ZONE_FR: Record<string, string> = {
    hand: 'la main',
    main_deck: 'le deck',
    discard: 'la défausse',
    banish: 'le bannissement',
    runes_deck: 'le deck de runes',
    runes: 'les runes actives',
    legend: 'la zone légende',
    champion: 'la zone champion',
    base: 'la base',
    battlefield: 'le champ de bataille',
    battlefield_owner: 'le champ de bataille',
    battlefield_opponent: 'le champ de bataille adverse',
    stack: 'le stack',
  }

  function zoneFr(z: string) { return ZONE_FR[z] ?? z }

  function cardName(cardId: string): string {
    return currentRound.value?.cards[cardId]?.description?.name ?? 'une carte'
  }

  function actorName(actorId: string): string {
    return playerNames.value[actorId]?.name ?? actorId.slice(0, 6)
  }

  function buildLogDescription(action: GameAction, actorId: string): string | null {
    const who = actorName(actorId)
    switch (action.type) {
      case 'DRAW_CARD':
        return `${who} a pioché une carte`
      case 'CHANNEL_CARD':
        return `${who} a canalisé ${cardName(action.cardId)} depuis le deck de runes`
      case 'RECYCLE_RUNE':
        return `${who} a recyclé ${cardName(action.cardId)} dans le deck de runes`
      case 'PLAY_CARD':
        return `${who} a joué ${cardName(action.cardId)} vers ${zoneFr(action.toZoneId)}`
      case 'MOVE_CARD':
        return `${who} a déplacé ${cardName(action.cardId)} de ${zoneFr(action.fromZoneId)} vers ${zoneFr(action.toZoneId)}`
      case 'MOVE_TO_HAND':
        return `${who} a renvoyé ${cardName(action.cardId)} en main`
      case 'DISCARD_CARD':
        return `${who} a défaussé ${cardName(action.cardId)}`
      case 'BANISH_CARD':
        return `${who} a banni ${cardName(action.cardId)}`
      case 'HIDE_CARD':
        return `${who} a retourné ${cardName(action.cardId)} face cachée`
      case 'REVEAL_CARD':
        return `${who} a révélé ${cardName(action.cardId)} à tous`
      case 'REVEAL_CARD_FOR_SELF':
        return `${who} a regardé ${cardName(action.cardId)}`
      case 'TOGGLE_EXHAUSTED': {
        const exhausted = currentRound.value?.cards[action.cardId]?.state.exhausted
        return `${who} a ${exhausted ? 'réactivé' : 'épuisé'} ${cardName(action.cardId)}`
      }
      case 'GROUP_CARD':
        return `${who} a attaché ${cardName(action.childId)} à ${cardName(action.parentId)}`
      case 'UNGROUP_CARD':
        return `${who} a détaché ${cardName(action.cardId)}`
      case 'CREATE_TOKEN':
        return `${who} a créé le token "${action.name}"`
      case 'DESTROY_TOKEN':
        return `${who} a détruit le token ${cardName(action.cardId)}`
      case 'COPY_CARD':
        return `${who} a copié ${cardName(action.sourceCardId)}`
      case 'TAKE_CONTROL':
        return `${who} a pris le contrôle de ${cardName(action.cardId)}${action.temporary ? ' (jusqu\'à la fin du tour)' : ''}`
      case 'RETURN_CONTROL':
        return `${who} a rendu ${cardName(action.cardId)} à son propriétaire`
      case 'SET_COUNTERS':
        return action.value !== null
          ? `${who} a mis ${action.value} compteur(s) sur ${cardName(action.cardId)}`
          : `${who} a retiré les compteurs de ${cardName(action.cardId)}`
      case 'SET_DAMAGES':
        return action.value !== null
          ? `${who} a infligé ${action.value} dégât(s) à ${cardName(action.cardId)}`
          : `${who} a soigné ${cardName(action.cardId)}`
      case 'SET_BUFF':
        return action.value !== null
          ? `${who} a appliqué un buff de ${action.value} à ${cardName(action.cardId)}`
          : `${who} a retiré le buff de ${cardName(action.cardId)}`
      default:
        return null
    }
  }

  function writeLog(description: string, actorId: string | null = null) {
    const gId = gameId.value
    if (!gId) return
    addDoc(collection(firestore, 'games', gId, 'logs'), {
      playerId: actorId,
      description,
      createdAt: serverTimestamp(),
    }).catch(() => {})
  }

  function destroyToken(cardId: string) {
    const round = currentRound.value
    const ref = roundRef()
    if (!round?.cards[cardId] || !ref) return
    const uid = myUid.value
    if (uid) writeLog(`${actorName(uid)} a détruit le token ${cardName(cardId)}`, uid)
    dissolveGroup(cardId, ref)
    delete round.cards[cardId]
    updateDoc(ref, {
      [`cards.${cardId}`]: deleteField(),
      _updatedBy: sessionId,
      updatedAt: serverTimestamp(),
    }).catch(console.error)
  }

  function createToken(name: string, cardType: CardType, imageUrl: string, zoneId: ZoneId, exhausted = true, overrideOwnerId?: string) {
    const round = currentRound.value
    const ref = roundRef()
    const uid = myUid.value
    if (!round || !ref || !uid) return

    const effectiveOwner = overrideOwnerId ?? uid
    const cardId = `token_${uid}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
    const zoneCards = Object.values(round.cards).filter(c => c.zoneId === zoneId)
    const order = Math.max(-1, ...zoneCards.map(c => c.order)) + 1

    const newCard: CardState = {
      cardId,
      baseCardId: 'token',
      description: { name, type: cardType, imageUrl },
      ownerId: effectiveOwner,
      controllerId: effectiveOwner,
      zoneId,
      order,
      state: {
        exhausted,
        counters: null,
        damages: null,
        buffs: null,
        visibleTo: 'ALL',
        groupTo: [],
      },
      isToken: true,
    }

    round.cards[cardId] = newCard
    writeLog(`${actorName(uid)} a créé le token "${name}"`, uid)

    updateDoc(ref, {
      [`cards.${cardId}`]: newCard,
      _updatedBy: sessionId,
      updatedAt: serverTimestamp(),
    }).catch(console.error)
  }

  function addToStack(sourceCardId: string) {
    const round = currentRound.value
    const ref = roundRef()
    const uid = myUid.value
    if (!round || !ref || !uid) return

    const source = round.cards[sourceCardId]
    if (!source) return

    const stackCardId = `stack_${uid}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
    const stackCards = Object.values(round.cards).filter(c => c.zoneId === 'stack')
    const order = Math.max(-1, ...stackCards.map(c => c.order)) + 1

    const copy: CardState = {
      ...source,
      cardId: stackCardId,
      ownerId: uid,
      controllerId: uid,
      zoneId: 'stack',
      order,
      isToken: true,
      isStackCopy: true,
      state: {
        exhausted: false,
        counters: null,
        damages: null,
        buffs: null,
        visibleTo: 'ALL',
        groupTo: [],
      },
    }

    round.cards[stackCardId] = copy
    writeLog(`${actorName(uid)} a mis ${cardName(sourceCardId)} sur le stack`, uid)

    updateDoc(ref, {
      [`cards.${stackCardId}`]: copy,
      _updatedBy: sessionId,
      updatedAt: serverTimestamp(),
    }).catch(console.error)
  }

  function applyAction(action: GameAction) {
    const round = currentRound.value
    if (!round) return
    const ref = roundRef()
    if (!ref) return

    const actorId = myUid.value ?? action.playerId ?? ''
    const desc = buildLogDescription(action, actorId)
    if (desc) writeLog(desc, actorId)

    switch (action.type) {
      case 'DRAW_CARD':
        commitMove(action.cardId, 'hand', 'SELF')
        break

      case 'CHANNEL_CARD':
        commitMove(action.cardId, 'runes', 'ALL')
        break

      case 'RECYCLE_RUNE': {
        const round2 = currentRound.value
        const ref2 = roundRef()
        if (round2?.cards[action.cardId] && ref2) {
          const deckCards = Object.values(round2.cards).filter(c => c.zoneId === 'runes_deck')
          const bottomOrder = Math.min(0, ...deckCards.map(c => c.order)) - 1
          if (DISSOLVE_GROUP_ZONES.has('runes_deck')) dissolveGroup(action.cardId, ref2)
          round2.cards[action.cardId] = {
            ...round2.cards[action.cardId],
            zoneId: 'runes_deck',
            order: bottomOrder,
            state: { ...round2.cards[action.cardId].state, visibleTo: 'NOBODY', exhausted: false },
          }
          updateDoc(ref2, {
            [`cards.${action.cardId}.zoneId`]: 'runes_deck',
            [`cards.${action.cardId}.order`]: bottomOrder,
            [`cards.${action.cardId}.state.visibleTo`]: 'NOBODY',
            [`cards.${action.cardId}.state.exhausted`]: false,
            _updatedBy: sessionId,
            updatedAt: serverTimestamp(),
          }).catch(console.error)
        }
        break
      }

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

      case 'CREATE_TOKEN':
        createToken(action.name, action.cardType, action.imageUrl, action.zoneId, action.exhausted ?? true)
        break

      case 'DESTROY_TOKEN':
        destroyToken(action.cardId)
        break

      case 'COPY_CARD': {
        const src = round.cards[action.sourceCardId]
        if (!src) return
        const zoneCards = Object.values(round.cards).filter(c => c.zoneId === src.zoneId)
        const copyOrder = Math.max(-1, ...zoneCards.map(c => c.order)) + 1
        const copy: CardState = {
          cardId: action.newCardId,
          baseCardId: src.baseCardId,
          description: { ...src.description },
          ownerId: action.playerId,
          controllerId: action.playerId,
          zoneId: src.zoneId,
          order: copyOrder,
          state: { exhausted: false, counters: null, damages: null, buffs: null, visibleTo: 'ALL', groupTo: [] },
          isToken: true,
        }
        round.cards[action.newCardId] = copy
        updateDoc(ref, {
          [`cards.${action.newCardId}`]: copy,
          _updatedBy: sessionId,
          updatedAt: serverTimestamp(),
        }).catch(console.error)
        break
      }

      case 'TAKE_CONTROL': {
        const card = round.cards[action.cardId]
        if (!card) return
        const originalOwnerId = card.ownerId
        const baseCards = Object.values(round.cards).filter(c => c.ownerId === action.playerId && c.zoneId === 'base')
        const baseOrder = Math.max(-1, ...baseCards.map(c => c.order)) + 1
        const updated: CardState = {
          ...card,
          ownerId: action.playerId,
          controllerId: action.playerId,
          zoneId: 'base',
          order: baseOrder,
          loanedFromId: originalOwnerId,
          loanedUntilEndOfTurn: action.temporary || undefined,
          state: { ...card.state, exhausted: false },
        }
        round.cards[action.cardId] = updated
        updateDoc(ref, {
          [`cards.${action.cardId}.ownerId`]:               action.playerId,
          [`cards.${action.cardId}.controllerId`]:          action.playerId,
          [`cards.${action.cardId}.zoneId`]:                'base',
          [`cards.${action.cardId}.order`]:                 baseOrder,
          [`cards.${action.cardId}.loanedFromId`]:          originalOwnerId,
          [`cards.${action.cardId}.loanedUntilEndOfTurn`]:  action.temporary ? true : deleteField(),
          [`cards.${action.cardId}.state.exhausted`]:       false,
          _updatedBy: sessionId,
          updatedAt: serverTimestamp(),
        }).catch(console.error)
        break
      }

      case 'RETURN_CONTROL': {
        const card = round.cards[action.cardId]
        if (!card?.loanedFromId) return
        const returnTo = card.loanedFromId
        const returnBase = Object.values(round.cards).filter(c => c.ownerId === returnTo && c.zoneId === 'base')
        const returnOrder = Math.max(-1, ...returnBase.map(c => c.order)) + 1
        const updated: CardState = { ...card, ownerId: returnTo, controllerId: returnTo, zoneId: 'base', order: returnOrder, loanedFromId: undefined, loanedUntilEndOfTurn: undefined }
        round.cards[action.cardId] = updated
        updateDoc(ref, {
          [`cards.${action.cardId}.ownerId`]:              returnTo,
          [`cards.${action.cardId}.controllerId`]:         returnTo,
          [`cards.${action.cardId}.zoneId`]:               'base',
          [`cards.${action.cardId}.order`]:                returnOrder,
          [`cards.${action.cardId}.loanedFromId`]:         deleteField(),
          [`cards.${action.cardId}.loanedUntilEndOfTurn`]: deleteField(),
          _updatedBy: sessionId,
          updatedAt: serverTimestamp(),
        }).catch(console.error)
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

  function setShowdown(bfOwnerId: string, data: ShowdownData) {
    const round = currentRound.value
    const ref = roundRef()
    if (!round || !ref) return
    round.showdowns = { ...(round.showdowns ?? {}), [bfOwnerId]: data }
    updateDoc(ref, {
      [`showdowns.${bfOwnerId}`]: data,
      _updatedBy: sessionId,
      updatedAt: serverTimestamp(),
    }).catch(console.error)
  }

  function clearShowdown(bfOwnerId: string) {
    const round = currentRound.value
    const ref = roundRef()
    if (!round || !ref) return
    const next = { ...(round.showdowns ?? {}) }
    delete next[bfOwnerId]
    round.showdowns = next
    updateDoc(ref, {
      [`showdowns.${bfOwnerId}`]: deleteField(),
      _updatedBy: sessionId,
      updatedAt: serverTimestamp(),
    }).catch(console.error)
  }

  // ── Turn number of the last ABCD we ran (per session, resets on page reload) ─
  const _lastAutoTurn = ref(-1)

  function _doABCD(uid: string) {
    const round = currentRound.value
    const ref   = roundRef()
    if (!round || !ref) return

    const updates: Record<string, unknown> = {}

    // A. Awaken: unexhaust all my cards
    for (const [id, card] of Object.entries(round.cards)) {
      if (card.ownerId !== uid || !card.state.exhausted) continue
      round.cards[id] = { ...card, state: { ...card.state, exhausted: false } }
      updates[`cards.${id}.state.exhausted`] = false
    }

    // C. Channel: top 2 cards from runes_deck → runes
    const runesDeck = Object.values(round.cards)
      .filter(c => c.ownerId === uid && c.zoneId === 'runes_deck')
      .sort((a, b) => b.order - a.order)
    const toChannel = runesDeck.slice(0, 2)
    const nextRuneOrder = Math.max(-1, ...Object.values(round.cards)
      .filter(c => c.ownerId === uid && c.zoneId === 'runes')
      .map(c => c.order)) + 1
    toChannel.forEach((card, i) => {
      const newOrder = nextRuneOrder + i
      round.cards[card.cardId] = { ...card, zoneId: 'runes', order: newOrder, state: { ...card.state, visibleTo: 'ALL' } }
      updates[`cards.${card.cardId}.zoneId`]          = 'runes'
      updates[`cards.${card.cardId}.order`]           = newOrder
      updates[`cards.${card.cardId}.state.visibleTo`] = 'ALL'
    })

    // D. Draw: top card from main_deck → hand
    const topDeck = Object.values(round.cards)
      .filter(c => c.ownerId === uid && c.zoneId === 'main_deck')
      .sort((a, b) => b.order - a.order)[0]
    if (topDeck) {
      const drawOrder = Math.max(-1, ...Object.values(round.cards)
        .filter(c => c.ownerId === uid && c.zoneId === 'hand')
        .map(c => c.order)) + 1
      round.cards[topDeck.cardId] = { ...topDeck, zoneId: 'hand', order: drawOrder, state: { ...topDeck.state, visibleTo: 'SELF' } }
      updates[`cards.${topDeck.cardId}.zoneId`]          = 'hand'
      updates[`cards.${topDeck.cardId}.order`]           = drawOrder
      updates[`cards.${topDeck.cardId}.state.visibleTo`] = 'SELF'
    }

    if (Object.keys(updates).length) {
      updates['_updatedBy'] = sessionId
      updates['updatedAt']  = serverTimestamp()
      updateDoc(ref, updates).catch(console.error)
    }
  }

  function _doInitialDraw(uid: string) {
    const round = currentRound.value
    const ref   = roundRef()
    if (!round || !ref) return

    // Guard: skip if already have cards in hand (reconnect)
    const alreadyInHand = Object.values(round.cards).filter(c => c.ownerId === uid && c.zoneId === 'hand').length
    if (alreadyInHand > 0) return

    const top4 = Object.values(round.cards)
      .filter(c => c.ownerId === uid && c.zoneId === 'main_deck')
      .sort((a, b) => b.order - a.order)
      .slice(0, 4)

    const updates: Record<string, unknown> = {}
    top4.forEach((card, i) => {
      round.cards[card.cardId] = { ...card, zoneId: 'hand', order: i, state: { ...card.state, visibleTo: 'SELF' } }
      updates[`cards.${card.cardId}.zoneId`]          = 'hand'
      updates[`cards.${card.cardId}.order`]           = i
      updates[`cards.${card.cardId}.state.visibleTo`] = 'SELF'
    })

    // First player initialises currentTurn so the ABCD watch fires for them
    if (round.firstPlayerId === uid && !round.currentTurn) {
      const ct = { playerId: uid, turn: 1 }
      round.currentTurn = ct
      updates['currentTurn'] = ct
    }

    updates['_updatedBy'] = sessionId
    updates['updatedAt']  = serverTimestamp()
    updateDoc(ref, updates).catch(console.error)
    writeLog(`${actorName(uid)} pioche sa main initiale`, uid)
  }

  const isMyTurn = computed(() =>
    currentRound.value?.setup === 'completed' &&
    currentRound.value?.currentTurn?.playerId === myUid.value,
  )

  // Auto: initial 4-card draw when setup completes
  watch(
    () => currentRound.value?.setup,
    (setup) => {
      const uid = myUid.value
      if (setup === 'completed' && uid) _doInitialDraw(uid)
    },
  )

  // Auto: ABCD when my turn starts
  watch(
    () => currentRound.value?.currentTurn,
    (turn) => {
      const uid = myUid.value
      if (!turn || !uid) return
      if (turn.playerId !== uid) return
      if (turn.turn <= _lastAutoTurn.value) return   // already processed (reconnect guard)
      _lastAutoTurn.value = turn.turn
      _doABCD(uid)
      writeLog(`${actorName(uid)} commence son tour`, uid)
    },
  )

  function endTurn() {
    const round = currentRound.value
    const ref   = roundRef()
    const uid   = myUid.value
    if (!round || !ref || !uid) return
    if (round.currentTurn?.playerId !== uid) return   // not your turn

    const allIds  = Object.keys(round.players)
    const idx     = allIds.indexOf(uid)
    const nextId  = allIds[(idx + 1) % allIds.length]
    const nextNum = (round.currentTurn?.turn ?? 0) + 1

    const updates: Record<string, unknown> = {
      currentTurn: { playerId: nextId, turn: nextNum },
    }

    // Return temporarily controlled (loaned) cards to their original owner
    for (const [id, card] of Object.entries(round.cards)) {
      if (card.controllerId === uid && card.loanedFromId && card.loanedUntilEndOfTurn) {
        const returnTo = card.loanedFromId
        const returnBase = Object.values(round.cards).filter(c => c.ownerId === returnTo && c.zoneId === 'base')
        const returnOrder = Math.max(-1, ...returnBase.map(c => c.order)) + 1
        round.cards[id] = { ...card, ownerId: returnTo, controllerId: returnTo, zoneId: 'base', order: returnOrder, loanedFromId: undefined, loanedUntilEndOfTurn: undefined }
        updates[`cards.${id}.ownerId`]              = returnTo
        updates[`cards.${id}.controllerId`]         = returnTo
        updates[`cards.${id}.zoneId`]               = 'base'
        updates[`cards.${id}.order`]                = returnOrder
        updates[`cards.${id}.loanedFromId`]         = deleteField()
        updates[`cards.${id}.loanedUntilEndOfTurn`] = deleteField()
      }
    }

    round.currentTurn = { playerId: nextId, turn: nextNum }
    updateDoc(ref, { ...updates, _updatedBy: sessionId, updatedAt: serverTimestamp() }).catch(console.error)

    writeLog(`${actorName(uid)} passe le tour`, uid)
  }

  async function leaveVoluntarily() {
    const uid = myUid.value
    const gId = gameId.value
    if (!uid || !gId) return
    const gameRef = doc(firestore, 'games', gId)
    await updateDoc(gameRef, {
      leftPlayers: [...(leftPlayers.value), uid],
      endedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }).catch(console.error)
  }

  async function submitSideboard(newDeckList: DeckList) {
    if (!gameId.value || !currentRoundId.value) return
    await gameApi.submitSideboard(gameId.value, currentRoundId.value, newDeckList)
    myDeck.value = newDeckList
  }

  async function startNextRound(winnerId: PlayerId) {
    if (!gameId.value || !currentRoundId.value) return
    await gameApi.nextRound(gameId.value, currentRoundId.value, winnerId)
  }

  function setScore(playerId: PlayerId, score: number) {
    const round = currentRound.value
    const ref = roundRef()
    if (!round || !ref || !round.players[playerId]) return

    round.players[playerId] = { ...round.players[playerId], score }

    updateDoc(ref, {
      [`players.${playerId}.score`]: score,
      _updatedBy: sessionId,
      updatedAt: serverTimestamp(),
    }).catch(console.error)
  }

  return {
    gameId,
    mode,
    matchFormat,
    deckFormat,
    roundResults,
    leftPlayers,
    leaveVoluntarily,
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
    allSideboardDone,
    tiedPlayerIds,
    bfDisplayOrder,
    attachGame,
    detach,
    sendToDeck,
    moveToHandSilent,
    resolveStack,
    writeLog,
    actorName,
    importDeck,
    selectBattlefield,
    rollDice,
    chooseFirstPlayer,
    discardBattlefield,
    confirmDiscard,
    submitMulligan,
    devSkipSetup,
    applyAction,
    createToken,
    addToStack,
    destroyToken,
    submitSideboard,
    startNextRound,
    setScore,
    setShowdown,
    clearShowdown,
    shuffleDeck,
    shuffleHand,
    endTurn,
    isMyTurn,
  }
})
