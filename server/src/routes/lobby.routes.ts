import { Router } from 'express'
import {
  getLobby,
  startMatchmaking,
  createLobby,
  joinByCode,
  leaveLobby,
  cancelMatchmaking,
  toggleReady,
  sendMessage,
} from '../controllers/lobby.controller'
import { requireAuth } from '../middlewares/auth.middleware'

const router = Router()

router.use(requireAuth)

router.get('/:id', getLobby)
router.post('/matchmaking', startMatchmaking)
router.post('/', createLobby)
router.post('/join/:code', joinByCode)
router.delete('/:id', leaveLobby)
router.delete('/:id/matchmaking', cancelMatchmaking)
router.patch('/:id/ready', toggleReady)
router.post('/:id/messages', sendMessage)

export default router
