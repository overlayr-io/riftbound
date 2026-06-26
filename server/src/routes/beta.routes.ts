import { Router } from 'express'
import { getAccess, redeemCode, joinWaitlist } from '../controllers/beta.controller'
import { requireAuth } from '../middlewares/auth.middleware'
import { limiters } from '../middlewares/rate-limit.middleware'

// Côté joueur — /api/beta. Authentifié, sans rôle requis.
const router = Router()

router.use(requireAuth)

router.get('/access', getAccess)
router.post('/redeem', limiters.beta, redeemCode)
router.post('/waitlist', limiters.beta, joinWaitlist)

export default router
