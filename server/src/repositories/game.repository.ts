import {
  Card, CardId, CardState, DeckList, GameMode, GameMatchFormat, GameDeckFormat, GameRound, GameSetupStep,
  CardVisibleTo
} from '@riftbound/shared'
import type { PlayerId, PlayerState } from '@riftbound/shared'
import { db } from '../config/firebase'
import { FieldValue } from 'firebase-admin/firestore'

function makeInitialPlayerState(playerId: PlayerId, deckList: DeckList | null = null): PlayerState {
  return {
    playerId,
    score: 0,
    hasSubmittedDeck: deckList !== null,
    deckList,
    legendCard: deckList?.legend ?? null,
    submittedBattlefield: null,
    battlefieldCard: null,
    diceRoll: null,
    mulliganCount: null,
    mulliganDone: false,
    sideboardDone: false,
  }
}

function docToRound(id: string, data: FirebaseFirestore.DocumentData): GameRound {
  return {
    roundId: id,
    gameId: data.gameId,
    round: data.round,
    previousRound: data.previousRound ?? null,
    usedBattlefields: data.usedBattlefields ?? null,
    setup: data.setup,
    diceWinnerId: data.diceWinnerId ?? null,
    tiedPlayerIds: data.tiedPlayerIds ?? null,
    firstPlayerId: data.firstPlayerId ?? null,
    discardedBattlefieldId: data.discardedBattlefieldId ?? null,
    bfDisplayOrder: data.bfDisplayOrder ?? null,
    winnerId: data.winnerId ?? null,
    currentTurn: data.currentTurn ?? null,
    players: data.players ?? {},
    cards: data.cards ?? {},
    updatedAt: data.updatedAt?.toDate() ?? new Date(),
    endedAt: data.endedAt?.toDate() ?? null,
  }
}

export class GameRepository {
  private readonly col = db.collection('games')

  async create(params: {
    lobbyId: string
    host: PlayerId
    mode: GameMode
    matchFormat: GameMatchFormat
    deckFormat: GameDeckFormat
    playerNames: Record<PlayerId, { name: string; teamId: '1' | '2' | null }>
  }): Promise<{ gameId: string; roundId: string }> {
    const now = FieldValue.serverTimestamp()
    const playerIds = Object.keys(params.playerNames)

    const gameRef = this.col.doc()
    const roundRef = gameRef.collection('rounds').doc()

    const playerStates: Record<PlayerId, PlayerState> = {}
    for (const uid of playerIds) {
      playerStates[uid] = makeInitialPlayerState(uid)
    }

    const batch = db.batch()
    batch.set(gameRef, {
      lobbyId: params.lobbyId,
      host: params.host,
      mode: params.mode,
      matchFormat: params.matchFormat,
      deckFormat: params.deckFormat,
      playerIds,
      playerNames: params.playerNames,
      currentRoundId: roundRef.id,
      createdAt: now,
      updatedAt: now,
      endedAt: null,
      deletedAt: null,
    })
    batch.set(roundRef, {
      gameId: gameRef.id,
      round: 1,
      previousRound: null,
      setup: 'deck_selection' as GameSetupStep,
      diceWinnerId: null,
      tiedPlayerIds: null,
      firstPlayerId: null,
      discardedBattlefieldId: null,
      bfDisplayOrder: null,
      winnerId: null,
      currentTurn: null,
      players: playerStates,
      cards: {},
      updatedAt: now,
      endedAt: null,
    })
    await batch.commit()

    return { gameId: gameRef.id, roundId: roundRef.id }
  }

  async getRound(gameId: string, roundId: string): Promise<GameRound | null> {
    const snap = await this.col.doc(gameId).collection('rounds').doc(roundId).get()
    if (!snap.exists) return null
    return docToRound(snap.id, snap.data()!)
  }

  async updatePlayerState(
    gameId: string,
    roundId: string,
    uid: PlayerId,
    patch: Partial<PlayerState>,
  ): Promise<void> {
    const update: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() }
    for (const [k, v] of Object.entries(patch)) {
      update[`players.${uid}.${k}`] = v
    }
    await this.col.doc(gameId).collection('rounds').doc(roundId).update(update)
  }

  async advanceSetup(gameId: string, roundId: string, setup: GameSetupStep): Promise<void> {
    await this.col.doc(gameId).collection('rounds').doc(roundId).update({
      setup,
      updatedAt: FieldValue.serverTimestamp(),
    })
  }

  async resolveDice(
    gameId: string,
    roundId: string,
    diceWinnerId: PlayerId,
    nextSetup: GameSetupStep,
    bfDisplayOrder?: PlayerId[],
  ): Promise<void> {
    const update: Record<string, unknown> = {
      diceWinnerId,
      // firstPlayerId is set later: by chooseFirstPlayer (choose_first_player step)
      // or by pendingDiscard (select_battlefield_discard step)
      firstPlayerId: null,
      setup: nextSetup,
      updatedAt: FieldValue.serverTimestamp(),
    }
    if (bfDisplayOrder) update.bfDisplayOrder = bfDisplayOrder
    await this.col.doc(gameId).collection('rounds').doc(roundId).update(update)
  }

  async chooseFirstPlayer(
    gameId: string,
    roundId: string,
    firstPlayerId: PlayerId,
  ): Promise<void> {
    await this.col.doc(gameId).collection('rounds').doc(roundId).update({
      firstPlayerId,
      setup: 'mulligan' as GameSetupStep,
      updatedAt: FieldValue.serverTimestamp(),
    })
  }

  async pendingDiscard(
    gameId: string,
    roundId: string,
    discardedBattlefieldId: CardId,
    firstPlayerId: PlayerId,
  ): Promise<void> {
    await this.col.doc(gameId).collection('rounds').doc(roundId).update({
      discardedBattlefieldId,
      firstPlayerId,
      updatedAt: FieldValue.serverTimestamp(),
    })
  }

  async confirmDiscard(
    gameId: string,
    roundId: string,
  ): Promise<void> {
    await this.col.doc(gameId).collection('rounds').doc(roundId).update({
      setup: 'mulligan' as GameSetupStep,
      updatedAt: FieldValue.serverTimestamp(),
    })
  }

  async initializeCards(gameId: string, roundId: string): Promise<void> {
    const roundRef = this.col.doc(gameId).collection('rounds').doc(roundId)
    const snap = await roundRef.get()
    if (!snap.exists) throw Object.assign(new Error('ROUND_NOT_FOUND'), { status: 404 })
    const data = snap.data()!
    const players = data.players as Record<PlayerId, { deckList: DeckList; legendCard: Card | null; battlefieldCard: Card | null }>

    const cards: Record<CardId, CardState> = {}
    let order = 0

    function addCard(card: Card, ownerId: PlayerId, zoneId: CardState['zoneId'], visibility: CardVisibleTo = 'NOBODY'): void {
      cards[card.id] = {
        cardId: card.id,
        baseCardId: card.baseCardId,
        description: { name: card.name, type: card.type, imageUrl: card.imageUrl },
        ownerId,
        controllerId: ownerId,
        zoneId,
        order: order++,
        state: { exhausted: false, counters: null, damages: null, buffs: null, visibleTo: visibility, groupTo: [] },
        isToken: false,
      }
    }

    for (const [uid, player] of Object.entries(players)) {
      const deck = player.deckList
      if (!deck) throw Object.assign(new Error(`MISSING_DECK_FOR_${uid}`), { status: 400 })

      if (player.legendCard) addCard(player.legendCard, uid, 'legend', 'ALL')
      if (deck.champion) addCard(deck.champion, uid, 'champion', 'ALL')
      if (player.battlefieldCard) addCard(player.battlefieldCard, uid, 'battlefield', 'ALL')
      for (const c of deck.mainDeck) addCard(c, uid, 'main_deck')
      for (const c of deck.runes) addCard(c, uid, 'runes_deck')
    }

    await roundRef.update({ cards, updatedAt: FieldValue.serverTimestamp() })
  }

  async shuffleDecks(gameId: string, roundId: string): Promise<void> {
    const roundRef = this.col.doc(gameId).collection('rounds').doc(roundId)
    const snap = await roundRef.get()
    if (!snap.exists) return

    const cards = snap.data()!.cards as Record<CardId, CardState>
    const deckZones = new Set(['main_deck', 'runes_deck'])

    // Group deck cards by owner × zone
    const groups = new Map<string, CardId[]>()
    for (const [cardId, card] of Object.entries(cards)) {
      if (!deckZones.has(card.zoneId)) continue
      const key = `${card.ownerId}::${card.zoneId}`
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)!.push(cardId)
    }

    const update: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() }

    for (const ids of groups.values()) {
      // Fisher-Yates × 3
      for (let pass = 0; pass < 3; pass++) {
        for (let i = ids.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1))
          ;[ids[i], ids[j]] = [ids[j], ids[i]]
        }
      }
      ids.forEach((cardId, idx) => {
        update[`cards.${cardId}.order`] = idx
        update[`cards.${cardId}.state.visibleTo`] = 'NOBODY'
      })
    }

    await roundRef.update(update)
  }

  async resetTiedPlayers(
    gameId: string,
    roundId: string,
    tiedPlayerIds: PlayerId[],
  ): Promise<void> {
    const update: Record<string, unknown> = {
      tiedPlayerIds,
      updatedAt: FieldValue.serverTimestamp(),
    }
    for (const uid of tiedPlayerIds) {
      update[`players.${uid}.diceRoll`] = null
    }
    await this.col.doc(gameId).collection('rounds').doc(roundId).update(update)
  }

  async getMode(gameId: string): Promise<GameMode> {
    const snap = await this.col.doc(gameId).get()
    return (snap.data()?.mode as GameMode) ?? 'dual'
  }

  async createNextRound(params: {
    gameId: string
    previousRoundId: string
    previousRoundWinnerId: PlayerId
    roundNumber: number
    playerIds: PlayerId[]
    diceWinnerId: PlayerId
    upgradeMatchFormat?: GameMatchFormat
  }): Promise<{ roundId: string }> {
    const now = FieldValue.serverTimestamp()
    const gameRef = this.col.doc(params.gameId)
    const newRoundRef = gameRef.collection('rounds').doc()

    // Fetch previous round to carry over deck lists and used battlefields
    const prevSnap = await gameRef.collection('rounds').doc(params.previousRoundId).get()
    const prevData = prevSnap.data() ?? {}
    const prevPlayers = prevData.players as Record<PlayerId, PlayerState> | undefined
    const prevUsedBattlefields = (prevData.usedBattlefields ?? {}) as Record<PlayerId, { cardId: CardId; round: number }[]>

    // Accumulate used battlefields: prev entries + each player's BF from previous round
    const usedBattlefields: Record<PlayerId, { cardId: CardId; round: number }[]> = {}
    for (const uid of params.playerIds) {
      const prev = prevUsedBattlefields[uid] ?? []
      const prevBfId = prevPlayers?.[uid]?.battlefieldCard?.id
      usedBattlefields[uid] = prevBfId
        ? [...prev, { cardId: prevBfId, round: params.roundNumber - 1 }]
        : prev
    }

    const playerStates: Record<PlayerId, PlayerState> = {}
    for (const uid of params.playerIds) {
      // Carry over previous deck list so players start sideboard with their last deck
      playerStates[uid] = makeInitialPlayerState(uid, prevPlayers?.[uid]?.deckList ?? null)
    }

    const batch = db.batch()

    // Mark previous round as ended with its winner
    batch.update(gameRef.collection('rounds').doc(params.previousRoundId), {
      winnerId: params.previousRoundWinnerId,
      endedAt: now,
      updatedAt: now,
    })

    // Create new round — dice winner pre-set so dice_roll step is skipped
    batch.set(newRoundRef, {
      gameId: params.gameId,
      round: params.roundNumber,
      previousRound: params.previousRoundId,
      usedBattlefields,
      setup: 'sideboard' as GameSetupStep,
      diceWinnerId: params.diceWinnerId,
      tiedPlayerIds: null,
      firstPlayerId: null,
      discardedBattlefieldId: null,
      bfDisplayOrder: null,
      winnerId: null,
      currentTurn: null,
      players: playerStates,
      cards: {},
      updatedAt: now,
      endedAt: null,
    })

    // Update game's current round (and optionally upgrade match format)
    const gameUpdate: Record<string, unknown> = {
      currentRoundId: newRoundRef.id,
      updatedAt: now,
      // Append round result for the score display (squares win/loss in sidebar)
      roundResults: FieldValue.arrayUnion({
        round: params.roundNumber - 1,
        winnerId: params.previousRoundWinnerId,
      }),
    }
    if (params.upgradeMatchFormat) {
      gameUpdate.matchFormat = params.upgradeMatchFormat
    }
    batch.update(gameRef, gameUpdate)

    await batch.commit()
    return { roundId: newRoundRef.id }
  }

  async endGame(gameId: string, roundId: string, winnerId: string): Promise<void> {
    const now = FieldValue.serverTimestamp()
    const batch = db.batch()
    batch.update(this.col.doc(gameId).collection('rounds').doc(roundId), {
      winnerId,
      endedAt: now,
      updatedAt: now,
    })
    batch.update(this.col.doc(gameId), {
      roundResults: FieldValue.arrayUnion({ round: 0, winnerId }),
      endedAt: now,
      updatedAt: now,
    })
    await batch.commit()
  }

  async get(gameId: string): Promise<{ playerIds: PlayerId[]; playerNames: Record<PlayerId, { name: string; teamId: '1' | '2' | null }> } | null> {
    const snap = await this.col.doc(gameId).get()
    if (!snap.exists) return null
    const d = snap.data()!
    return { playerIds: d.playerIds ?? [], playerNames: d.playerNames ?? {} }
  }

  async submitSideboard(
    gameId: string,
    roundId: string,
    uid: PlayerId,
    newDeckList: DeckList,
  ): Promise<void> {
    const roundRef = this.col.doc(gameId).collection('rounds').doc(roundId)
    await roundRef.update({
      [`players.${uid}.deckList`]: newDeckList,
      [`players.${uid}.legendCard`]: newDeckList.legend,
      [`players.${uid}.sideboardDone`]: true,
      updatedAt: FieldValue.serverTimestamp(),
    })

    const snap = await roundRef.get()
    if (!snap.exists) return
    const players = snap.data()!.players as Record<PlayerId, PlayerState>
    const allDone = Object.values(players).every((p) => p.sideboardDone)
    if (allDone) {
      await roundRef.update({ setup: 'select_battlefield' as GameSetupStep, updatedAt: FieldValue.serverTimestamp() })
    }
  }

  async getGameData(gameId: string): Promise<{ matchFormat: GameMatchFormat; roundResults: { round: number; winnerId: string }[] } | null> {
    const snap = await this.col.doc(gameId).get()
    if (!snap.exists) return null
    const d = snap.data()!
    return {
      matchFormat: d.matchFormat ?? 'BO1',
      roundResults: d.roundResults ?? [],
    }
  }

  async devSkipSetup(
    gameId: string,
    roundId: string,
    playersDecks: Record<PlayerId, DeckList>,
  ): Promise<void> {
    const roundRef = this.col.doc(gameId).collection('rounds').doc(roundId)
    const snap = await roundRef.get()
    if (!snap.exists) throw Object.assign(new Error('ROUND_NOT_FOUND'), { status: 404 })
    const data = snap.data()!
    const playerIds = Object.keys(data.players ?? {}) as PlayerId[]
    const diceWinnerId = playerIds[Math.floor(Math.random() * playerIds.length)]

    const cards: Record<CardId, CardState> = {}
    let order = 0

    function addCard(card: Card, ownerId: PlayerId, zoneId: CardState['zoneId'], visibility: CardVisibleTo = 'NOBODY'): void {
      cards[card.id] = {
        cardId: card.id,
        baseCardId: card.baseCardId,
        description: { name: card.name, type: card.type, imageUrl: card.imageUrl },
        ownerId,
        controllerId: ownerId,
        zoneId,
        order: order++,
        state: {
          exhausted: false,
          counters: null,
          damages: null,
          buffs: null,
          visibleTo: visibility,
          groupTo: []
        },
        isToken: false,
      }
    }

    const update: Record<string, unknown> = {
      setup: 'completed' as GameSetupStep,
      diceWinnerId,
      firstPlayerId: diceWinnerId,
      tiedPlayerIds: null,
      updatedAt: FieldValue.serverTimestamp(),
    }

    for (const uid of playerIds) {
      const deck = playersDecks[uid]
      if (!deck) throw Object.assign(new Error(`MISSING_DECK_FOR_${uid}`), {status: 400})

      const bf = deck.battlefields[Math.floor(Math.random() * deck.battlefields.length)] ?? null
      const legendCard = deck.legend

      update[`players.${uid}.hasSubmittedDeck`] = true
      update[`players.${uid}.legendCard`] = legendCard ?? null
      update[`players.${uid}.submittedBattlefield`] = bf?.id ?? null
      update[`players.${uid}.battlefieldCard`] = bf ?? null
      update[`players.${uid}.diceRoll`] = Math.floor(Math.random() * 20) + 1
      update[`players.${uid}.mulliganCount`] = 0
      update[`players.${uid}.mulliganDone`] = true

      if (legendCard) addCard(legendCard, uid, 'legend', "ALL")
      if (deck.champion) addCard(deck.champion, uid, 'champion', 'ALL')
      for (const c of deck.mainDeck) addCard(c, uid, 'main_deck')
      for (const c of deck.runes) addCard(c, uid, 'runes_deck')
      if (bf) addCard(bf, uid, 'battlefield', 'ALL')
    }

    update['cards'] = cards

    await roundRef.update(update)
  }
}
