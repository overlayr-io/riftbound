import type { Request, Response, NextFunction } from 'express'
import type { BugReportStatus } from '@riftbound/shared'
import { BugReportRepository } from '../repositories/bug-report.repository'
import { GdprService } from '../services/gdpr.service'
import { UserRepository } from '../repositories/user.repository'
import { AdminGamesRepository } from '../repositories/admin-games.repository'
import { MessageReportRepository } from '../repositories/message-report.repository'
import { errorCaptureService } from '../services/error-capture.service'
import { AuditService } from '../services/audit.service'
import { AuditRepository } from '../repositories/audit.repository'
import { actorOf } from '../middlewares/rbac.middleware'

const bugs = new BugReportRepository()
const audit = new AuditService(new AuditRepository())
const gdpr = new GdprService(new UserRepository(), new AdminGamesRepository(), bugs, new MessageReportRepository(), audit)
const param = (p: string | string[]): string => (Array.isArray(p) ? p[0] : p)

// ── Bug reports ──
export async function listBugReports(req: Request, res: Response, next: NextFunction) {
  try { res.json(await bugs.list(typeof req.query.status === 'string' ? req.query.status as BugReportStatus : undefined)) } catch (e) { next(e) }
}
export async function updateBugReport(req: Request, res: Response, next: NextFunction) {
  try {
    const updated = await bugs.update(param(req.params.id), { status: req.body?.status, assignedTo: req.body?.assignedTo })
    if (!updated) { res.status(404).json({ error: 'Not found' }); return }
    res.json(updated)
  } catch (e) { next(e) }
}

// ── Capture d'erreurs ──
export async function listErrors(_req: Request, res: Response, next: NextFunction) {
  try { res.json(await errorCaptureService.list()) } catch (e) { next(e) }
}

// ── RGPD ──
export async function exportUserData(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await gdpr.export(actorOf(req), param(req.params.uid))
    res.setHeader('Content-Disposition', `attachment; filename="export-${param(req.params.uid).slice(0, 8)}.json"`)
    res.json(data)
  } catch (e) { next(e) }
}
export async function anonymizeUser(req: Request, res: Response, next: NextFunction) {
  try { await gdpr.anonymize(actorOf(req), param(req.params.uid)); res.status(204).send() } catch (e) { next(e) }
}
