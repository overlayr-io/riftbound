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

const router = Router()

router.use(requireAuth)

router.get('/:id', getLobby)
router.post('/matchmaking', startMatchmaking)
router.post('/', createLobby)
router.post('/join/:code', joinByCode)
router.delete('/:id', leaveLobby)
router.delete('/:id/players/:playerId', evictPlayer)
router.delete('/:id/matchmaking', cancelMatchmaking)
router.patch('/:id/ready', toggleReady)
router.patch('/:id/players/:playerId/team', setTeam)
router.post('/:id/teams/randomize', randomizeTeams)
router.post('/:id/messages', sendMessage)

export default router
