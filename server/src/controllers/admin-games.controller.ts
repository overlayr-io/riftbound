import type { Request, Response, NextFunction } from 'express'
import type { GamesFilter, GameMode, GameMatchFormat, GameDeckFormat, GameStatus } from '@riftbound/shared'
import { AdminGamesService } from '../services/admin-games.service'
import { AdminGamesRepository } from '../repositories/admin-games.repository'
import { LobbyRepository } from '../repositories/lobby.repository'
import { MessageRepository } from '../repositories/message.repository'
import { LobbyService } from '../services/lobby.service'
import { AuditService } from '../services/audit.service'
import { AuditRepository } from '../repositories/audit.repository'
import { actorOf } from '../middlewares/rbac.middleware'

const lobbyRepo = new LobbyRepository()
const service = new AdminGamesService(
  new AdminGamesRepository(),
  lobbyRepo,
  new LobbyService(lobbyRepo, new MessageRepository()),
  new AuditService(new AuditRepository()),
)

function param(p: string | string[]): string {
  return Array.isArray(p) ? p[0] : p
}

function str(v: unknown): string | undefined {
  return typeof v === 'string' && v.length > 0 ? v : undefined
}

export async function listGames(req: Request, res: Response, next: NextFunction) {
  try {
    const q = req.query
    const filter: GamesFilter = {
      mode: str(q.mode) as GameMode | undefined,
      matchFormat: str(q.matchFormat) as GameMatchFormat | undefined,
      deckFormat: str(q.deckFormat) as GameDeckFormat | undefined,
      status: str(q.status) as GameStatus | undefined,
      search: str(q.search),
      limit: str(q.limit) ? parseInt(str(q.limit)!, 10) : undefined,
    }
    res.status(200).json(await service.list(filter))
  } catch (err) { next(err) }
}

export async function getGame(req: Request, res: Response, next: NextFunction) {
  try {
    const detail = await service.detail(param(req.params.gameId))
    if (!detail) { res.status(404).json({ error: 'Game not found' }); return }
    res.status(200).json(detail)
  } catch (err) { next(err) }
}

export async function forceEndGame(req: Request, res: Response, next: NextFunction) {
  try {
    const game = await service.forceEnd(actorOf(req), param(req.params.gameId))
    res.status(200).json(game)
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'GAME_NOT_FOUND') {
      res.status(404).json({ error: 'Game not found' }); return
    }
    next(err)
  }
}

export async function kickFromLobby(req: Request, res: Response, next: NextFunction) {
  try {
    await service.kickFromLobby(actorOf(req), param(req.params.lobbyId), param(req.params.uid))
    res.status(204).send()
  } catch (err: unknown) {
    if (err instanceof Error) {
      if (err.message === 'LOBBY_NOT_FOUND') { res.status(404).json({ error: 'Lobby not found' }); return }
      if (err.message === 'PLAYER_NOT_IN_LOBBY') { res.status(404).json({ error: 'Player not in lobby' }); return }
    }
    next(err)
  }
}

export async function resetLobby(req: Request, res: Response, next: NextFunction) {
  try {
    await service.resetLobby(actorOf(req), param(req.params.lobbyId))
    res.status(204).send()
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'LOBBY_NOT_FOUND') {
      res.status(404).json({ error: 'Lobby not found' }); return
    }
    next(err)
  }
}
