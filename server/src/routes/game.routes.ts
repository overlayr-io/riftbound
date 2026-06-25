import { Router } from 'express'
import {
  startGame,
  submitDeck,
  selectBattlefield,
  rollDice,
  chooseFirstPlayer,
  discardBattlefield,
  confirmDiscard,
  submitMulligan,
  submitSideboard,
  nextRound,
  devSkipSetup,
} from '../controllers/game.controller'
import { sendMessage, getLogs } from '../controllers/chat.controller'
import { requireAuth } from '../middlewares/auth.middleware'
import { env } from '../config/env'

const router = Router()

router.use(requireAuth)

router.post('/', startGame)
router.patch('/:gameId/rounds/:roundId/deck', submitDeck)
router.patch('/:gameId/rounds/:roundId/battlefield', selectBattlefield)
router.post('/:gameId/rounds/:roundId/dice', rollDice)
router.post('/:gameId/rounds/:roundId/first-player', chooseFirstPlayer)
router.post('/:gameId/rounds/:roundId/discard-battlefield', discardBattlefield)
router.post('/:gameId/rounds/:roundId/discard-battlefield/confirm', confirmDiscard)
router.post('/:gameId/rounds/:roundId/mulligan', submitMulligan)
router.post('/:gameId/rounds/:roundId/sideboard', submitSideboard)
router.post('/:gameId/rounds/:roundId/next-round', nextRound)
router.post('/:gameId/messages', sendMessage)
router.get('/:gameId/logs', getLogs)

if (env.NODE_ENV !== 'production') {
  router.post('/:gameId/rounds/:roundId/dev-skip', devSkipSetup)
}

export default router
