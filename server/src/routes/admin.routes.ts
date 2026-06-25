import { Router } from 'express'
import { assignRole, revokeRole, listAudit } from '../controllers/admin.controller'
import { requireAuth } from '../middlewares/auth.middleware'
import { requirePermission } from '../middlewares/rbac.middleware'
import adminGamesRoutes from './admin-games.routes'

const router = Router()

// Toutes les routes admin exigent un token vérifié.
router.use(requireAuth)

// Gestion des rôles — super_admin uniquement (admin:manage_roles).
router.post('/roles', requirePermission('admin:manage_roles'), assignRole)
router.delete('/roles/:uid', requirePermission('admin:manage_roles'), revokeRole)

// Consultation de l'audit log.
router.get('/audit', requirePermission('audit:read'), listAudit)

// Domaine A — jeux live & spectate + ops.
router.use('/', adminGamesRoutes)

export default router
