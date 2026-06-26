import type { Request, Response, NextFunction } from 'express'
import leoProfanity from 'leo-profanity'
import { ChatRepository } from '../repositories/chat.repository'
import { GameRepository } from '../repositories/game.repository'
import { UserRepository } from '../repositories/user.repository'
import { opsSettingsRepository } from '../repositories/ops-settings.repository'

// Load all available language dictionaries for broad multilingual coverage
leoProfanity.loadDictionary() // English (default)
;['fr', 'ru', 'de', 'ar', 'pl', 'cs', 'zh'].forEach(lang => {
  try { leoProfanity.add(leoProfanity.getDictionary(lang)) } catch { /* lang not bundled */ }
})

const chatRepo = new ChatRepository()
const gameRepo = new GameRepository()
const userRepo = new UserRepository()

function param(p: string | string[]): string {
  return Array.isArray(p) ? p[0] : p
}

/** Censure les mots bloqués personnalisés (config admin) en plus de leo-profanity. */
function applyExtraWords(text: string, words: string[]): string {
  let out = text
  for (const w of words) {
    if (!w) continue
    out = out.replace(new RegExp(w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '*'.repeat(w.length))
  }
  return out
}

export async function sendMessage(req: Request, res: Response, next: NextFunction) {
  try {
    const uid = req.user!.uid
    const gameId = param(req.params.gameId)
    const { text } = req.body

    if (!text || typeof text !== 'string') {
      res.status(400).json({ error: 'Missing text' }); return
    }

    const trimmed = text.trim()
    if (trimmed.length === 0 || trimmed.length > 200) {
      res.status(400).json({ error: 'Invalid message length' }); return
    }

    // Verify player is part of this game
    const game = await gameRepo.get(gameId)
    if (!game || !game.playerIds.includes(uid)) {
      res.status(403).json({ error: 'Not a player in this game' }); return
    }

    // Modération : joueur mute → interdit d'envoyer.
    if (await userRepo.isMuted(uid)) {
      res.status(403).json({ error: 'MUTED' }); return
    }

    const playerName = game.playerNames[uid]?.name ?? uid.slice(0, 6)

    // Filter profanity (leo-profanity) + mots bloqués personnalisés (config admin).
    const cfg = await opsSettingsRepository.getChatConfig()
    const clean = applyExtraWords(leoProfanity.clean(trimmed), cfg.extraBlockedWords)

    const msg = await chatRepo.addMessage(gameId, uid, playerName, clean)
    res.status(201).json(msg)
  } catch (err) {
    next(err)
  }
}

export async function getLogs(req: Request, res: Response, next: NextFunction) {
  try {
    const uid = req.user!.uid
    const gameId = param(req.params.gameId)

    const game = await gameRepo.get(gameId)
    if (!game || !game.playerIds.includes(uid)) {
      res.status(403).json({ error: 'Not a player in this game' }); return
    }

    const logs = await chatRepo.getLogs(gameId)
    res.json(logs)
  } catch (err) {
    next(err)
  }
}
