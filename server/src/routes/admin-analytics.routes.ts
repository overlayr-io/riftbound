import { Router } from 'express'
import { getDashboard, getHealth, getRevenue, exportMetrics } from '../controllers/analytics.controller'
import { requirePermission } from '../middlewares/rbac.middleware'

// Monté sous /api/admin (requireAuth déjà appliqué).
const router = Router()

router.get('/analytics/dashboard', requirePermission('analytics:read'), getDashboard)
router.get('/analytics/health', requirePermission('analytics:read'), getHealth)
router.get('/analytics/export', requirePermission('analytics:read'), exportMetrics)

// Module revenu — super_admin only (revenue:read), caché aux moderators.
router.get('/analytics/revenue', requirePermission('revenue:read'), getRevenue)

export default router
