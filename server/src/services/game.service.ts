import type { Card, DeckList, GameMatchFormat, GameDeckFormat, GameRound } from '@riftbound/shared'
import type { PlayerId } from '@riftbound/shared'
import { GameRepository } from '../repositories/game.repository'
import { LobbyRepository } from '../repositories/lobby.repository'

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export class GameService {
  constructor(
    private readonly gameRepo: GameRepository,
    private readonly lobbyRepo: LobbyRepository,
  ) {}

  async startGame(lobbyId: string, hostUid: string): Promise<{ gameId: string }> {
    const lobby = await this.lobbyRepo.findById(lobbyId)
    if (!lobby) throw Object.assign(new Error('LOBBY_NOT_FOUND'), { status: 404 })
    if (lobby.host !== hostUid) throw Object.assign(new Error('NOT_HOST'), { status: 403 })
    if (lobby.gameId) throw Object.assign(new Error('ALREADY_STARTED'), { status: 409 })

    const matchFormat: GameMatchFormat =
      (lobby.matchFormat as string) === 'ANY' ? 'BO1' : (lobby.matchFormat as GameMatchFormat)
    const deckFormat: GameDeckFormat =
      (lobby.deckFormat as string) === 'ANY' ? 'constructed' : (lobby.deckFormat as GameDeckFormat)

    const playerNames: Record<PlayerId, { name: string; teamId: '1' | '2' | null }> = {}
    for (const [uid, state] of lobby.players) {
      playerNames[uid] = { name: state.playerName, teamId: state.teamId }
    }

    const { gameId } = await this.gameRepo.create({
      lobbyId,
      host: hostUid,
      mode: lobby.mode,
      matchFormat,
      deckFormat,
      playerNames,
    })

    await this.lobbyRepo.setGameId(lobbyId, gameId)

    return { gameId }
  }

  async submitDeck(
    gameId: string,
    roundId: string,
    uid: PlayerId,
    legendCard: Card,
    deckList: DeckList,
  ): Promise<void> {
    await this.gameRepo.updatePlayerState(gameId, roundId, uid, {
      hasSubmittedDeck: true,
      legendCard,
      deckList,
    })

    const round = await this.gameRepo.getRound(gameId, roundId)
    if (!round || round.setup !== 'deck_selection') return

    const allDone = Object.values(round.players).every((p) => p.hasSubmittedDeck)
    if (allDone) {
      await this.gameRepo.advanceSetup(gameId, roundId, 'select_battlefield')
    }
  }

  async selectBattlefield(
    gameId: string,
    roundId: string,
    uid: PlayerId,
    battlefieldCardId: string,
    battlefieldCard: Card,
  ): Promise<void> {
    await this.gameRepo.updatePlayerState(gameId, roundId, uid, {
      submittedBattlefield: battlefieldCardId,
      battlefieldCard,
    })

    const round = await this.gameRepo.getRound(gameId, roundId)
    if (!round || round.setup !== 'select_battlefield') return

    const allDone = Object.values(round.players).every((p) => p.submittedBattlefield !== null)
    if (allDone) {
      // If diceWinnerId is already set (next round in BO3), skip dice_roll
      const nextStep = round.diceWinnerId ? 'choose_first_player' : 'dice_roll'
      await this.gameRepo.advanceSetup(gameId, roundId, nextStep)
    }
  }

  async rollDice(
    gameId: string,
    roundId: string,
    uid: PlayerId,
  ): Promise<{ result: number }> {
    const result = Math.floor(Math.random() * 20) + 1
    await this.gameRepo.updatePlayerState(gameId, roundId, uid, { diceRoll: result })

    const round = await this.gameRepo.getRound(gameId, roundId)
    if (!round || round.setup !== 'dice_roll') return { result }

    // During tie-breaking only the tied players need to re-roll
    const contested = round.tiedPlayerIds
      ? Object.entries(round.players).filter(([id]) => round.tiedPlayerIds!.includes(id))
      : Object.entries(round.players)

    const allRolled = contested.every(([, p]) => p.diceRoll !== null)
    if (allRolled) {
      const maxRoll = Math.max(...contested.map(([, s]) => s.diceRoll!))
      const winners = contested.filter(([, s]) => s.diceRoll === maxRoll)

      if (winners.length === 1) {
        const mode = await this.gameRepo.getMode(gameId)
        const playerCount = Object.keys(round.players).length
        const needsDiscard = playerCount >= 4
        const nextSetup = needsDiscard ? 'select_battlefield_discard' : 'choose_first_player'
        let bfDisplayOrder: string[] | undefined
        if (needsDiscard) {
          bfDisplayOrder = shuffle(Object.keys(round.players))
        }
        await this.gameRepo.resolveDice(gameId, roundId, winners[0][0], nextSetup, bfDisplayOrder)
      } else {
        // Still tied — reset their dice and mark them for another roll
        await this.gameRepo.resetTiedPlayers(gameId, roundId, winners.map(([id]) => id))
      }
    }

    return { result }
  }

  async chooseFirstPlayer(
    gameId: string,
    roundId: string,
    uid: PlayerId,
    chosenPlayerId: PlayerId,
  ): Promise<void> {
    const round = await this.gameRepo.getRound(gameId, roundId)
    if (!round || round.setup !== 'choose_first_player') return
    if (round.diceWinnerId !== uid) throw Object.assign(new Error('NOT_DICE_WINNER'), { status: 403 })
    if (!round.players[chosenPlayerId]) throw Object.assign(new Error('INVALID_PLAYER'), { status: 400 })
    await this.gameRepo.initializeCards(gameId, roundId)
    await this.gameRepo.shuffleDecks(gameId, roundId)
    await this.gameRepo.chooseFirstPlayer(gameId, roundId, chosenPlayerId)
  }

  async discardBattlefield(
    gameId: string,
    roundId: string,
    uid: PlayerId,
    cardId: string,
  ): Promise<void> {
    const round = await this.gameRepo.getRound(gameId, roundId)
    if (!round || round.setup !== 'select_battlefield_discard') return
    if (round.diceWinnerId !== uid) throw Object.assign(new Error('NOT_DICE_WINNER'), { status: 403 })
    const ownerEntry = Object.entries(round.players).find(([, p]) => p.submittedBattlefield === cardId)
    if (!ownerEntry) throw Object.assign(new Error('INVALID_CARD'), { status: 400 })
    await this.gameRepo.pendingDiscard(gameId, roundId, cardId, uid)
  }

  async confirmDiscard(
    gameId: string,
    roundId: string,
    uid: PlayerId,
  ): Promise<void> {
    const round = await this.gameRepo.getRound(gameId, roundId)
    if (!round || round.setup !== 'select_battlefield_discard') return
    if (!round.discardedBattlefieldId) throw Object.assign(new Error('NO_DISCARD_PENDING'), { status: 400 })
    await this.gameRepo.initializeCards(gameId, roundId)
    await this.gameRepo.shuffleDecks(gameId, roundId)
    await this.gameRepo.confirmDiscard(gameId, roundId)
  }

  async submitSideboard(
    gameId: string,
    roundId: string,
    uid: PlayerId,
    newDeckList: DeckList,
  ): Promise<void> {
    const round = await this.gameRepo.getRound(gameId, roundId)
    if (!round || round.setup !== 'sideboard') return
    if (!round.players[uid]) throw Object.assign(new Error('PLAYER_NOT_IN_ROUND'), { status: 403 })
    await this.gameRepo.submitSideboard(gameId, roundId, uid, newDeckList)
  }

  async nextRound(
    gameId: string,
    roundId: string,
    uid: PlayerId,
    winnerId: PlayerId,
  ): Promise<void> {
    const game = await this.gameRepo.get(gameId)
    if (!game) throw Object.assign(new Error('GAME_NOT_FOUND'), { status: 404 })
    if (!game.playerIds.includes(winnerId)) throw Object.assign(new Error('INVALID_WINNER'), { status: 400 })

    const round = await this.gameRepo.getRound(gameId, roundId)
    if (!round) throw Object.assign(new Error('ROUND_NOT_FOUND'), { status: 404 })

    // The loser of the previous game wins the dice roll in the next
    const loserId = game.playerIds.find((id) => id !== winnerId)
    if (!loserId) throw Object.assign(new Error('CANNOT_DETERMINE_LOSER'), { status: 400 })

    const gameSnap = await this.gameRepo.getGameData(gameId)

    // Check if this win ends the match (before appending the new result)
    const existingResults = gameSnap?.roundResults ?? []
    const allResults = [...existingResults, { round: round.round, winnerId }]
    const winsNeeded = gameSnap?.matchFormat === 'BO5' ? 3 : gameSnap?.matchFormat === 'BO3' ? 2 : null
    if (winsNeeded !== null) {
      const winsByPlayer: Record<string, number> = {}
      for (const r of allResults) {
        winsByPlayer[r.winnerId] = (winsByPlayer[r.winnerId] ?? 0) + 1
      }
      const matchWinner = Object.entries(winsByPlayer).find(([, w]) => w >= winsNeeded)?.[0]
      if (matchWinner) {
        await this.gameRepo.endGame(gameId, roundId, matchWinner)
        return
      }
    }

    // BO1 → upgrade to BO3 for the series
    const upgradeMatchFormat: GameMatchFormat | undefined =
      gameSnap?.matchFormat === 'BO1' ? 'BO3' : undefined

    await this.gameRepo.createNextRound({
      gameId,
      previousRoundId: roundId,
      previousRoundWinnerId: winnerId,
      roundNumber: round.round + 1,
      playerIds: game.playerIds,
      diceWinnerId: loserId,
      upgradeMatchFormat,
    })
  }

  async devSkipSetup(gameId: string, roundId: string, playersDecks: Record<string, DeckList>): Promise<void> {
    await this.gameRepo.devSkipSetup(gameId, roundId, playersDecks)
  }

  async submitMulligan(
    gameId: string,
    roundId: string,
    uid: PlayerId,
    count: number,
  ): Promise<void> {
    if (count < 0 || count > 2) throw Object.assign(new Error('INVALID_MULLIGAN_COUNT'), { status: 400 })
    await this.gameRepo.updatePlayerState(gameId, roundId, uid, {
      mulliganCount: count,
      mulliganDone: true,
    })

    const round = await this.gameRepo.getRound(gameId, roundId)
    if (!round || round.setup !== 'mulligan') return

    const allDone = Object.values(round.players).every((p) => p.mulliganDone)
    if (allDone) {
      await this.gameRepo.advanceSetup(gameId, roundId, 'completed')
    }
  }
}
