import { Router } from 'express'
import {
  getSettings, setPhase, listInvites, createInvite, revokeInvite, listWaitlist, decideWaitlist,
} from '../controllers/beta.controller'
import { requirePermission, requireRole } from '../middlewares/rbac.middleware'

// Monté sous /api/admin (requireAuth déjà appliqué).
const router = Router()

// Phase globale : lecture par tout décideur beta, bascule réservée au super_admin.
router.get('/beta/settings', requirePermission('beta:waitlist_decide'), getSettings)
router.post('/beta/phase', requireRole(['super_admin']), setPhase)

// Invitations (codes & liens).
router.get('/invites', requirePermission('beta:invite_manage'), listInvites)
router.post('/invites', requirePermission('beta:invite_manage'), createInvite)
router.delete('/invites/:code', requirePermission('beta:invite_manage'), revokeInvite)

// Waitlist (triage en lot).
router.get('/waitlist', requirePermission('beta:waitlist_decide'), listWaitlist)
router.post('/waitlist/decide', requirePermission('beta:waitlist_decide'), decideWaitlist)

export default router
