import { Router } from 'express'
import lobbyRoutes from './lobby.routes'
import gameRoutes from './game.routes'

const router = Router()

router.get('/health', (_req, res) => res.json({ status: 'ok' }))
router.use('/lobbies', lobbyRoutes)
router.use('/games', gameRoutes)

export default router
