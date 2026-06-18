import { Router } from 'express'
import lobbyRoutes from './lobby.routes'

const router = Router()

router.get('/health', (_req, res) => res.json({ status: 'ok' }))
router.use('/lobbies', lobbyRoutes)

export default router
