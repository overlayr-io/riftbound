import type { Card, CardId, GameMode, GameMatchFormat, GameDeckFormat, GameRound, GameSetupStep } from '@riftbound/shared'
import type { PlayerId, PlayerState } from '@riftbound/shared'
import { db } from '../config/firebase'
import { FieldValue } from 'firebase-admin/firestore'

function makeInitialPlayerState(playerId: PlayerId): PlayerState {
  return {
    playerId,
    score: 0,
    hasSubmittedDeck: false,
    legendCard: null,
    submittedBattlefield: null,
    battlefieldCard: null,
    diceRoll: null,
    mulliganCount: null,
    mulliganDone: false,
  }
}

function docToRound(id: string, data: FirebaseFirestore.DocumentData): GameRound {
  return {
    roundId: id,
    gameId: data.gameId,
    round: data.round,
    previousRound: data.previousRound ?? null,
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
}
