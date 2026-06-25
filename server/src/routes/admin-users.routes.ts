import { Router } from 'express'
import {
  listUsers, getUser, suspendUser, banUser, reactivateUser, resetDisplayName,
  forceLogout, softDeleteUser, hardDeleteUser, impersonate,
} from '../controllers/admin-users.controller'
import { requirePermission } from '../middlewares/rbac.middleware'

// Monté sous /api/admin (requireAuth déjà appliqué).
const router = Router()

router.get('/users', requirePermission('players:read'), listUsers)
router.get('/users/:uid', requirePermission('players:read'), getUser)

router.post('/users/:uid/suspend', requirePermission('players:suspend'), suspendUser)
router.post('/users/:uid/ban', requirePermission('players:ban'), banUser)
router.post('/users/:uid/reactivate', requirePermission('players:suspend'), reactivateUser)
router.post('/users/:uid/displayname', requirePermission('players:suspend'), resetDisplayName)
router.post('/users/:uid/force-logout', requirePermission('players:suspend'), forceLogout)

// Soft-delete (réversible) vs hard-delete (super_admin only, RGPD).
router.post('/users/:uid/soft-delete', requirePermission('players:ban'), softDeleteUser)
router.delete('/users/:uid', requirePermission('players:delete'), hardDeleteUser)

// « Voir comme ce joueur » — fortement gated + audité.
router.post('/users/:uid/impersonate', requirePermission('players:impersonate'), impersonate)

export default router
