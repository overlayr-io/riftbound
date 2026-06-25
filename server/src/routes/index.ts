import { Router } from 'express'
import lobbyRoutes from './lobby.routes'
import gameRoutes from './game.routes'
import adminRoutes from './admin.routes'
import userRoutes from './user.routes'

const router = Router()

router.get('/health', (_req, res) => res.json({ status: 'ok' }))
router.use('/lobbies', lobbyRoutes)
router.use('/games', gameRoutes)
router.use('/users', userRoutes)
router.use('/admin', adminRoutes)

export default router
