import { Router } from 'express'
import {
  listFlags, upsertFlag, deleteFlag,
  getMaintenance, setMaintenance,
  getChatConfig, setChatConfig,
  seedData,
  listReports, resolveReport, muteUser,
} from '../controllers/admin-ops.controller'
import { requirePermission, requireRole } from '../middlewares/rbac.middleware'

// Monté sous /api/admin (requireAuth déjà appliqué).
const router = Router()

// Feature flags — ops:feature_flags (super_admin par la matrice).
router.get('/flags', requirePermission('ops:feature_flags'), listFlags)
router.post('/flags', requirePermission('ops:feature_flags'), upsertFlag)
router.delete('/flags/:key', requirePermission('ops:feature_flags'), deleteFlag)

// Maintenance — ops:maintenance_mode (super_admin).
router.get('/maintenance', requirePermission('ops:maintenance_mode'), getMaintenance)
router.post('/maintenance', requirePermission('ops:maintenance_mode'), setMaintenance)

// Modération chat : config filtre + file de signalements + mute.
router.get('/chat-config', requirePermission('players:suspend'), getChatConfig)
router.post('/chat-config', requirePermission('players:suspend'), setChatConfig)
router.get('/reports', requirePermission('players:suspend'), listReports)
router.post('/reports/:id/resolve', requirePermission('players:suspend'), resolveReport)
router.post('/users/:uid/mute', requirePermission('players:suspend'), muteUser)

// Seed — ops:seed_data + garde-fou NON-PROD (vérifié dans le controller).
router.post('/seed', requirePermission('ops:seed_data'), seedData)

export default router
