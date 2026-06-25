import type { GameSummary, GameDetail, GamesFilter, GameStatus } from '@riftbound/shared'
import { AdminGamesRepository } from '../repositories/admin-games.repository'
import { LobbyRepository } from '../repositories/lobby.repository'
import { LobbyService } from './lobby.service'
import { AuditService, type AuditActor } from './audit.service'

const DEFAULT_LIMIT = 50

export class AdminGamesService {
  constructor(
    private readonly gamesRepo: AdminGamesRepository,
    private readonly lobbyRepo: LobbyRepository,
    private readonly lobbyService: LobbyService,
    private readonly auditService: AuditService,
  ) {}

  async list(filter: GamesFilter): Promise<GameSummary[]> {
    const all = await this.gamesRepo.list()
    const search = filter.search?.trim().toLowerCase()

    const filtered = all.filter((g) => {
      if (filter.mode && g.mode !== filter.mode) return false
      if (filter.matchFormat && g.matchFormat !== filter.matchFormat) return false
      if (filter.deckFormat && g.deckFormat !== filter.deckFormat) return false
      if (filter.status && g.status !== filter.status) return false
      if (search) {
        const haystack = [
          g.gameId,
          g.lobbyId,
          ...g.players.flatMap((p) => [p.uid, p.name]),
        ].join(' ').toLowerCase()
        if (!haystack.includes(search)) return false
      }
      return true
    })

    return filtered.slice(0, filter.limit ?? DEFAULT_LIMIT)
  }

  async detail(gameId: string): Promise<GameDetail | null> {
    return this.gamesRepo.getDetail(gameId)
  }

  async forceEnd(actor: AuditActor, gameId: string): Promise<GameSummary> {
    const result = await this.gamesRepo.forceEnd(gameId)
    if (!result) throw new Error('GAME_NOT_FOUND')

    await this.auditService.record({
      actor,
      action: 'games.force_end',
      targetType: 'game',
      targetId: gameId,
      before: { status: result.before.status },
      after: { status: 'ended' as GameStatus, forced: true },
    })

    const updated = await this.gamesRepo.getDetail(gameId)
    return updated!
  }

  async kickFromLobby(actor: AuditActor, lobbyId: string, targetUid: string): Promise<void> {
    const lobby = await this.lobbyRepo.findById(lobbyId)
    if (!lobby) throw new Error('LOBBY_NOT_FOUND')
    if (!lobby.players.has(targetUid)) throw new Error('PLAYER_NOT_IN_LOBBY')

    await this.lobbyService.leave(targetUid, lobbyId)

    await this.auditService.record({
      actor,
      action: 'lobby.kick_player',
      targetType: 'lobby',
      targetId: lobbyId,
      before: { uid: targetUid },
      after: null,
    })
  }

  async resetLobby(actor: AuditActor, lobbyId: string): Promise<void> {
    const lobby = await this.lobbyRepo.findById(lobbyId)
    if (!lobby) throw new Error('LOBBY_NOT_FOUND')

    await this.lobbyRepo.softDelete(lobbyId)

    await this.auditService.record({
      actor,
      action: 'lobby.reset',
      targetType: 'lobby',
      targetId: lobbyId,
      before: { players: Array.from(lobby.players.keys()) },
      after: null,
    })
  }
}
