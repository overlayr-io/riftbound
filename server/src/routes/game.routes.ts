import { Router } from 'express'
import { startGame, submitDeck, selectBattlefield, rollDice } from '../controllers/game.controller'
import { requireAuth } from '../middlewares/auth.middleware'

const router = Router()

router.use(requireAuth)

router.post('/', startGame)
router.patch('/:gameId/rounds/:roundId/deck', submitDeck)
router.patch('/:gameId/rounds/:roundId/battlefield', selectBattlefield)
router.post('/:gameId/rounds/:roundId/dice', rollDice)

export default router
