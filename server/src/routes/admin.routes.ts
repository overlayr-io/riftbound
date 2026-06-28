import { Router } from 'express'
import { assignRole, revokeRole, listAudit } from '../controllers/admin.controller'
import { requireAuth } from '../middlewares/auth.middleware'
import { requirePermission } from '../middlewares/rbac.middleware'
import { limiters } from '../middlewares/rate-limit.middleware'
import adminGamesRoutes from './admin-games.routes'
import adminUsersRoutes from './admin-users.routes'
import adminBetaRoutes from './admin-beta.routes'
import adminAnalyticsRoutes from './admin-analytics.routes'
import adminContentRoutes from './admin-content.routes'
import adminPlaymatRoutes from './admin-playmat.routes'
import adminOpsRoutes from './admin-ops.routes'
import adminSupportRoutes from './admin-support.routes'

const router = Router()

// Toutes les routes admin exigent un token vérifié.
router.use(requireAuth)
// Rate limit sur les mutations admin (lectures non bridées).
router.use((req, res, next) => {
  if (req.method === 'GET') { next(); return }
  limiters.adminMutation(req, res, next)
})

// Gestion des rôles — super_admin uniquement (admin:manage_roles).
router.post('/roles', requirePermission('admin:manage_roles'), assignRole)
router.delete('/roles/:uid', requirePermission('admin:manage_roles'), revokeRole)

// Consultation de l'audit log.
router.get('/audit', requirePermission('audit:read'), listAudit)

// Domaine A — jeux live & spectate + ops.
router.use('/', adminGamesRoutes)
// Domaine B — joueurs/comptes + accès beta.
router.use('/', adminUsersRoutes)
router.use('/', adminBetaRoutes)
// Domaine C — analytics & santé.
router.use('/', adminAnalyticsRoutes)
// Domaine D — contenu & ops.
router.use('/', adminContentRoutes)
router.use('/', adminPlaymatRoutes)
router.use('/', adminOpsRoutes)
// Transversal — bug reports, erreurs, RGPD.
router.use('/', adminSupportRoutes)

export default router
