import type { Request, Response, NextFunction } from 'express'
import type { Lobby } from '@riftbound/shared'
import { LobbyService } from '../services/lobby.service'
import { LobbyRepository } from '../repositories/lobby.repository'
import { MessageRepository } from '../repositories/message.repository'

const lobbyService = new LobbyService(new LobbyRepository(), new MessageRepository())

function serializeLobby(lobby: Lobby) {
  return { ...lobby, players: Object.fromEntries(lobby.players) }
}

function param(p: string | string[]): string {
  return Array.isArray(p) ? p[0] : p
}

export async function getLobby(req: Request, res: Response, next: NextFunction) {
  try {
    const lobby = await lobbyService.getLobbyById(param(req.params.id))
    if (!lobby) { res.status(404).json({ error: 'Lobby not found' }); return }
    res.json(serializeLobby(lobby))
  } catch (err) { next(err) }
}

export async function startMatchmaking(req: Request, res: Response, next: NextFunction) {
  try {
    const uid = req.user!.uid
    const { playerName, mode, deckFormat } = req.body
    if (!playerName || !mode) { res.status(400).json({ error: 'Missing fields' }); return }
    const result = await lobbyService.matchmaking(uid, playerName, mode, deckFormat ?? 'ANY')
    res.status(200).json({ joined: result.joined, lobby: serializeLobby(result.lobby) })
  } catch (err) { next(err) }
}

export async function createLobby(req: Request, res: Response, next: NextFunction) {
  try {
    const uid = req.user!.uid
    const { playerName, mode, matchFormat, deckFormat } = req.body
    if (!playerName || !mode || !matchFormat || !deckFormat) {
      res.status(400).json({ error: 'Missing fields' }); return
    }
    const lobby = await lobbyService.createPrivate(uid, playerName, mode, matchFormat, deckFormat)
    res.status(201).json(serializeLobby(lobby))
  } catch (err) { next(err) }
}

export async function joinByCode(req: Request, res: Response, next: NextFunction) {
  try {
    const uid = req.user!.uid
    const { playerName } = req.body
    const code = param(req.params.code)
    if (!playerName) { res.status(400).json({ error: 'Missing playerName' }); return }
    const lobby = await lobbyService.joinByCode(uid, playerName, code)
    res.status(200).json(serializeLobby(lobby))
  } catch (err: unknown) {
    if (err instanceof Error) {
      if (err.message === 'LOBBY_NOT_FOUND') { res.status(404).json({ error: 'Lobby not found' }); return }
      if (err.message === 'LOBBY_FULL') { res.status(409).json({ error: 'Lobby is full' }); return }
    }
    next(err)
  }
}

export async function leaveLobby(req: Request, res: Response, next: NextFunction) {
  try {
    await lobbyService.leave(req.user!.uid, param(req.params.id))
    res.status(204).send()
  } catch (err) { next(err) }
}

export async function cancelMatchmaking(req: Request, res: Response, next: NextFunction) {
  try {
    await lobbyService.cancelMatchmaking(req.user!.uid, param(req.params.id))
    res.status(204).send()
  } catch (err) { next(err) }
}

export async function toggleReady(req: Request, res: Response, next: NextFunction) {
  try {
    await lobbyService.toggleReady(req.user!.uid, param(req.params.id))
    res.status(204).send()
  } catch (err) { next(err) }
}

export async function sendMessage(req: Request, res: Response, next: NextFunction) {
  try {
    const { text } = req.body
    if (!text) { res.status(400).json({ error: 'Missing text' }); return }
    await lobbyService.sendMessage(req.user!.uid, param(req.params.id), text)
    res.status(204).send()
  } catch (err: unknown) {
    if (err instanceof Error) {
      if (err.message === 'LOBBY_NOT_FOUND') { res.status(404).json({ error: 'Lobby not found' }); return }
      if (err.message === 'PLAYER_NOT_IN_LOBBY') { res.status(403).json({ error: 'Not in lobby' }); return }
      if (err.message === 'EMPTY_MESSAGE') { res.status(400).json({ error: 'Empty message' }); return }
    }
    next(err)
  }
}
