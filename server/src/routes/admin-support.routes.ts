import { Router } from 'express'
import {
  listBugReports, updateBugReport, listErrors, exportUserData, anonymizeUser,
} from '../controllers/admin-support.controller'
import { requirePermission } from '../middlewares/rbac.middleware'

// Monté sous /api/admin (requireAuth déjà appliqué).
const router = Router()

// Bug reports — triage (lecture + statut/assignation).
router.get('/bug-reports', requirePermission('players:read'), listBugReports)
router.patch('/bug-reports/:id', requirePermission('players:read'), updateBugReport)

// Capture d'erreurs (consultation).
router.get('/errors', requirePermission('analytics:read'), listErrors)

// RGPD — export (players:read) + droit à l'effacement (players:delete, super_admin).
router.get('/users/:uid/export', requirePermission('players:read'), exportUserData)
router.post('/users/:uid/anonymize', requirePermission('players:delete'), anonymizeUser)

export default router
