import { Router } from 'express'
import {
  listOfficial, createOfficial, updateOfficial, deleteOfficial, setOfficialDefault,
  listUnicolors, createUnicolor, updateUnicolor, deleteUnicolor, setUnicolorDefault,
} from '../controllers/admin-playmat.controller'
import { requirePermission } from '../middlewares/rbac.middleware'
import { uploadSingle } from '../middlewares/upload.middleware'

// Monté sous /api/admin (requireAuth déjà appliqué).
const router = Router()
const guard = requirePermission('content:playmats_manage')

// Fonds officiels
router.get('/playmats', guard, listOfficial)
router.post('/playmats', guard, uploadSingle, createOfficial)
router.patch('/playmats/:id', guard, updateOfficial)
router.delete('/playmats/:id', guard, deleteOfficial)
router.post('/playmats/:id/default', guard, setOfficialDefault)

// Thèmes unis
router.get('/unicolors', guard, listUnicolors)
router.post('/unicolors', guard, createUnicolor)
router.patch('/unicolors/:id', guard, updateUnicolor)
router.delete('/unicolors/:id', guard, deleteUnicolor)
router.post('/unicolors/:id/default', guard, setUnicolorDefault)

export default router
