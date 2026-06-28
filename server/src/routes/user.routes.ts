import { Router } from 'express'
import { syncSession, getMe, updateMe } from '../controllers/user.controller'
import {
  listMyPlaymats, addMyPlaymat, deleteMyPlaymat, getMySettings, putMySettings,
} from '../controllers/playmat.controller'
import { requireAuth } from '../middlewares/auth.middleware'

const router = Router()

router.use(requireAuth)

router.post('/me/session', syncSession)
router.get('/me', getMe)
router.patch('/me', updateMe)

// Playmats du joueur
router.get('/me/playmats', listMyPlaymats)
router.post('/me/playmats', addMyPlaymat)
router.delete('/me/playmats/:id', deleteMyPlaymat)
router.get('/me/playmat-settings', getMySettings)
router.put('/me/playmat-settings', putMySettings)

export default router
