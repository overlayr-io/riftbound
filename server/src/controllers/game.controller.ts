import type { Request, Response, NextFunction } from 'express'
import { GameService } from '../services/game.service'
import { GameRepository } from '../repositories/game.repository'
import { LobbyRepository } from '../repositories/lobby.repository'

const gameService = new GameService(new GameRepository(), new LobbyRepository())

function param(p: string | string[]): string {
  return Array.isArray(p) ? p[0] : p
}

export async function startGame(req: Request, res: Response, next: NextFunction) {
  try {
    const uid = req.user!.uid
    const { lobbyId } = req.body
    if (!lobbyId) { res.status(400).json({ error: 'Missing lobbyId' }); return }
    const result = await gameService.startGame(lobbyId, uid)
    res.status(201).json(result)
  } catch (err: any) {
    if (err.status) { res.status(err.status).json({ error: err.message }); return }
    next(err)
  }
}

export async function submitDeck(req: Request, res: Response, next: NextFunction) {
  try {
    const uid = req.user!.uid
    const gameId = param(req.params.gameId)
    const roundId = param(req.params.roundId)
    const { legendCard, deckList } = req.body
    if (!legendCard) { res.status(400).json({ error: 'Missing legendCard' }); return }
    if (!deckList) { res.status(400).json({ error: 'Missing deckList' }); return }
    await gameService.submitDeck(gameId, roundId, uid, legendCard, deckList)
    res.status(204).send()
  } catch (err) { next(err) }
}

export async function selectBattlefield(req: Request, res: Response, next: NextFunction) {
  try {
    const uid = req.user!.uid
    const gameId = param(req.params.gameId)
    const roundId = param(req.params.roundId)
    const { battlefieldCardId, battlefieldCard } = req.body
    if (!battlefieldCardId) { res.status(400).json({ error: 'Missing battlefieldCardId' }); return }
    if (!battlefieldCard) { res.status(400).json({ error: 'Missing battlefieldCard' }); return }
    await gameService.selectBattlefield(gameId, roundId, uid, battlefieldCardId, battlefieldCard)
    res.status(204).send()
  } catch (err) { next(err) }
}

export async function rollDice(req: Request, res: Response, next: NextFunction) {
  try {
    const uid = req.user!.uid
    const gameId = param(req.params.gameId)
    const roundId = param(req.params.roundId)
    const { result } = await gameService.rollDice(gameId, roundId, uid)
    res.json({ result })
  } catch (err) { next(err) }
}

export async function chooseFirstPlayer(req: Request, res: Response, next: NextFunction) {
  try {
    const uid = req.user!.uid
    const gameId = param(req.params.gameId)
    const roundId = param(req.params.roundId)
    const { chosenPlayerId } = req.body
    if (!chosenPlayerId) { res.status(400).json({ error: 'Missing chosenPlayerId' }); return }
    await gameService.chooseFirstPlayer(gameId, roundId, uid, chosenPlayerId)
    res.status(204).send()
  } catch (err: any) {
    if (err.status) { res.status(err.status).json({ error: err.message }); return }
    next(err)
  }
}

export async function discardBattlefield(req: Request, res: Response, next: NextFunction) {
  try {
    const uid = req.user!.uid
    const gameId = param(req.params.gameId)
    const roundId = param(req.params.roundId)
    const { cardId } = req.body
    if (!cardId) { res.status(400).json({ error: 'Missing cardId' }); return }
    await gameService.discardBattlefield(gameId, roundId, uid, cardId)
    res.status(204).send()
  } catch (err: any) {
    if (err.status) { res.status(err.status).json({ error: err.message }); return }
    next(err)
  }
}

export async function submitMulligan(req: Request, res: Response, next: NextFunction) {
  try {
    const uid = req.user!.uid
    const gameId = param(req.params.gameId)
    const roundId = param(req.params.roundId)
    const { count } = req.body
    if (count === undefined || count === null) { res.status(400).json({ error: 'Missing count' }); return }
    await gameService.submitMulligan(gameId, roundId, uid, Number(count))
    res.status(204).send()
  } catch (err: any) {
    if (err.status) { res.status(err.status).json({ error: err.message }); return }
    next(err)
  }
}

export async function confirmDiscard(req: Request, res: Response, next: NextFunction) {
  try {
    const uid = req.user!.uid
    const gameId = param(req.params.gameId)
    const roundId = param(req.params.roundId)
    await gameService.confirmDiscard(gameId, roundId, uid)
    res.status(204).send()
  } catch (err: any) {
    if (err.status) { res.status(err.status).json({ error: err.message }); return }
    next(err)
  }
}

export async function devSkipSetup(req: Request, res: Response, next: NextFunction) {
  try {
    const gameId = param(req.params.gameId)
    const roundId = param(req.params.roundId)
    const { playersDecks } = req.body
    if (!playersDecks || typeof playersDecks !== 'object') {
      res.status(400).json({ error: 'Missing playersDecks' }); return
    }
    await gameService.devSkipSetup(gameId, roundId, playersDecks)
    res.status(204).send()
  } catch (err: any) {
    if (err.status) { res.status(err.status).json({ error: err.message }); return }
    next(err)
  }
}
