import { Router } from 'express'
import {
  listGames, getGame, forceEndGame, kickFromLobby, resetLobby,
} from '../controllers/admin-games.controller'
import { requirePermission } from '../middlewares/rbac.middleware'

// Monté sous /api/admin (requireAuth déjà appliqué par admin.routes).
const router = Router()

router.get('/games', requirePermission('games:read'), listGames)
router.get('/games/:gameId', requirePermission('games:read'), getGame)

// Ops (auditées) sur parties / lobbies coincés.
router.post('/games/:gameId/force-end', requirePermission('games:force_end'), forceEndGame)
router.post('/lobbies/:lobbyId/kick/:uid', requirePermission('games:force_end'), kickFromLobby)
router.post('/lobbies/:lobbyId/reset', requirePermission('games:force_end'), resetLobby)

export default router
