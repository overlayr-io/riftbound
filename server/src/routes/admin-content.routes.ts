import { Router } from 'express'
import {
  listCards, upsertCard, deleteCard,
  listNotes, createNote, updateNote, deleteNote,
  listAnnouncements, createAnnouncement, deleteAnnouncement,
} from '../controllers/admin-content.controller'
import { requirePermission } from '../middlewares/rbac.middleware'

// Monté sous /api/admin (requireAuth déjà appliqué).
const router = Router()

// Cartes
router.get('/cards', requirePermission('content:cards_manage'), listCards)
router.post('/cards', requirePermission('content:cards_manage'), upsertCard)
router.delete('/cards/:id', requirePermission('content:cards_manage'), deleteCard)

// Patch notes
router.get('/patch-notes', requirePermission('content:patchnotes_manage'), listNotes)
router.post('/patch-notes', requirePermission('content:patchnotes_manage'), createNote)
router.patch('/patch-notes/:id', requirePermission('content:patchnotes_manage'), updateNote)
router.delete('/patch-notes/:id', requirePermission('content:patchnotes_manage'), deleteNote)

// Annonces
router.get('/announcements', requirePermission('content:announce'), listAnnouncements)
router.post('/announcements', requirePermission('content:announce'), createAnnouncement)
router.delete('/announcements/:id', requirePermission('content:announce'), deleteAnnouncement)

export default router
