import { Router } from 'express'
import {
  getFlags, getAnnouncements, getPublishedNotes, getMaintenanceStatus,
  reportMessage, submitBugReport, reportClientError, recordConsent,
} from '../controllers/public.controller'
import { getCatalog } from '../controllers/playmat.controller'
import { requireAuth } from '../middlewares/auth.middleware'
import { limiters } from '../middlewares/rate-limit.middleware'

// Côté joueur — /api/public. Authentifié, sans rôle.
const router = Router()

router.use(requireAuth)

router.get('/flags', getFlags)
router.get('/announcements', getAnnouncements)
router.get('/patch-notes', getPublishedNotes)
router.get('/maintenance', getMaintenanceStatus)
router.get('/playmats', getCatalog)

router.post('/report', limiters.report, reportMessage)
router.post('/bug-report', limiters.bugReport, submitBugReport)
router.post('/error', limiters.clientError, reportClientError)
router.post('/consent', recordConsent)

export default router
