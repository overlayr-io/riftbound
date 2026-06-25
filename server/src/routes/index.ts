import { Router } from 'express'
import lobbyRoutes from './lobby.routes'
import gameRoutes from './game.routes'
import adminRoutes from './admin.routes'
import userRoutes from './user.routes'
import betaRoutes from './beta.routes'

const router = Router()

router.get('/health', (_req, res) => res.json({ status: 'ok' }))
router.use('/lobbies', lobbyRoutes)
router.use('/games', gameRoutes)
router.use('/users', userRoutes)
router.use('/beta', betaRoutes)
router.use('/admin', adminRoutes)

export default router
