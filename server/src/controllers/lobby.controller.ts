import type { Request, Response, NextFunction } from 'express'
import { LobbyService } from '../services/lobby.service'
import { LobbyRepository } from '../repositories/lobby.repository'

const lobbyService = new LobbyService(new LobbyRepository())

export async function getLobby(req: Request, res: Response, next: NextFunction) {
  try {
    const lobby = await lobbyService.getLobbyById(req.params.id)
    if (!lobby) {
      res.status(404).json({ error: 'Lobby not found' })
      return
    }
    res.json(lobby)
  } catch (err) {
    next(err)
  }
}
