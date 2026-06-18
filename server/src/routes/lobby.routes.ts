import { Router } from 'express'
import { getLobby } from '../controllers/lobby.controller'
import { requireAuth } from '../middlewares/auth.middleware'

const router = Router()

router.get('/:id', requireAuth, getLobby)

export default router
