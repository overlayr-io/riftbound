import { Router } from 'express'
import { getAccess, redeemCode, joinWaitlist } from '../controllers/beta.controller'
import { requireAuth } from '../middlewares/auth.middleware'

// Côté joueur — /api/beta. Authentifié, sans rôle requis.
const router = Router()

router.use(requireAuth)

router.get('/access', getAccess)
router.post('/redeem', redeemCode)
router.post('/waitlist', joinWaitlist)

export default router
