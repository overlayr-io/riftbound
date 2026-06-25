import { Router } from 'express'
import { syncSession, getMe } from '../controllers/user.controller'
import { requireAuth } from '../middlewares/auth.middleware'

const router = Router()

router.use(requireAuth)

router.post('/me/session', syncSession)
router.get('/me', getMe)

export default router
