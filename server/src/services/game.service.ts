import type { Card, GameMatchFormat, GameDeckFormat } from '@riftbound/shared'
import type { PlayerId } from '@riftbound/shared'
import { GameRepository } from '../repositories/game.repository'
import { LobbyRepository } from '../repositories/lobby.repository'

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
  ): Promise<void> {
    await this.gameRepo.updatePlayerState(gameId, roundId, uid, {
      hasSubmittedDeck: true,
      legendCard,
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
      await this.gameRepo.advanceSetup(gameId, roundId, 'dice_roll')
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
        const nextSetup = mode === 'dual' ? 'choose_first_player' : 'select_battlefield_discard'
        await this.gameRepo.resolveDice(gameId, roundId, winners[0][0], nextSetup)
      } else {
        // Still tied — reset their dice and mark them for another roll
        await this.gameRepo.resetTiedPlayers(gameId, roundId, winners.map(([id]) => id))
      }
    }

    return { result }
  }
}
