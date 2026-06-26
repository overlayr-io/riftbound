import { Router } from 'express'
import {
  getLobby,
  startMatchmaking,
  createLobby,
  joinByCode,
  leaveLobby,
  evictPlayer,
  cancelMatchmaking,
  toggleReady,
  setTeam,
  randomizeTeams,
  sendMessage,
} from '../controllers/lobby.controller'
import { requireAuth } from '../middlewares/auth.middleware'
import { maintenanceGuard } from '../middlewares/maintenance.middleware'
import { limiters } from '../middlewares/rate-limit.middleware'

const router = Router()

router.use(requireAuth)
router.use(maintenanceGuard)

router.get('/:id', getLobby)
router.post('/matchmaking', limiters.lobby, startMatchmaking)
router.post('/', limiters.lobby, createLobby)
router.post('/join/:code', joinByCode)
router.delete('/:id', leaveLobby)
router.delete('/:id/players/:playerId', evictPlayer)
router.delete('/:id/matchmaking', cancelMatchmaking)
router.patch('/:id/ready', toggleReady)
router.patch('/:id/players/:playerId/team', setTeam)
router.post('/:id/teams/randomize', randomizeTeams)
router.post('/:id/messages', limiters.chat, sendMessage)

export default router
