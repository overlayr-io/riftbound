import type { Request, Response, NextFunction } from 'express'
import type { ReportScope } from '@riftbound/shared'
import { ContentService } from '../services/content.service'
import { ModerationService } from '../services/moderation.service'
import { CardRepository } from '../repositories/card.repository'
import { PatchNoteRepository } from '../repositories/patch-note.repository'
import { AnnouncementRepository } from '../repositories/announcement.repository'
import { MessageReportRepository } from '../repositories/message-report.repository'
import { FeatureFlagRepository } from '../repositories/feature-flag.repository'
import { UserRepository } from '../repositories/user.repository'
import { BugReportRepository } from '../repositories/bug-report.repository'
import { opsSettingsRepository } from '../repositories/ops-settings.repository'
import { errorCaptureService } from '../services/error-capture.service'
import { AuditService } from '../services/audit.service'
import { AuditRepository } from '../repositories/audit.repository'

const audit = new AuditService(new AuditRepository())
const content = new ContentService(new CardRepository(), new PatchNoteRepository(), new AnnouncementRepository(), audit)
const userRepo = new UserRepository()
const moderation = new ModerationService(new MessageReportRepository(), userRepo, audit)
const flags = new FeatureFlagRepository()
const bugs = new BugReportRepository()

export async function getFlags(_req: Request, res: Response, next: NextFunction) {
  try { res.json(await flags.list()) } catch (e) { next(e) }
}

export async function getAnnouncements(_req: Request, res: Response, next: NextFunction) {
  try { res.json(await content.activeAnnouncements()) } catch (e) { next(e) }
}

export async function getPublishedNotes(_req: Request, res: Response, next: NextFunction) {
  try { res.json(await content.publishedNotes()) } catch (e) { next(e) }
}

export async function getMaintenanceStatus(_req: Request, res: Response, next: NextFunction) {
  try {
    const m = await opsSettingsRepository.getMaintenance()
    res.json({ enabled: m.enabled, message: m.message })
  } catch (e) { next(e) }
}

export async function reportMessage(req: Request, res: Response, next: NextFunction) {
  try {
    const { scope, containerId, messageId, messageText, targetUid, reason } = req.body
    if (!scope || !containerId || !messageId) { res.status(400).json({ error: 'Missing fields' }); return }
    const report = await moderation.report({
      scope: scope as ReportScope, containerId, messageId,
      messageText: messageText ?? '', targetUid: targetUid ?? '',
      reporterUid: req.user!.uid, reason: reason ?? '',
    })
    res.status(201).json(report)
  } catch (e) { next(e) }
}

// ── Bug report (widget joueur) ──
export async function submitBugReport(req: Request, res: Response, next: NextFunction) {
  try {
    const { message, severity, gameId, screenshotUrl, clientVersion } = req.body
    if (!message || typeof message !== 'string') { res.status(400).json({ error: 'Missing message' }); return }
    const report = await bugs.create({
      reporterUid: req.user!.uid, message: message.slice(0, 2000),
      severity: severity ?? 'medium', gameId: gameId ?? null,
      screenshotUrl: screenshotUrl ?? null, clientVersion: clientVersion ?? 'unknown',
    })
    res.status(201).json(report)
  } catch (e) { next(e) }
}

// ── Erreur client (loggée, bridée serveur) ──
export async function reportClientError(req: Request, res: Response, next: NextFunction) {
  try {
    const { message, stack, path, clientVersion } = req.body
    if (!message) { res.status(400).json({ error: 'Missing message' }); return }
    await errorCaptureService.capture({
      source: 'client', message: String(message).slice(0, 300),
      stack: stack ? String(stack).slice(0, 2000) : null,
      path: path ?? null, method: null, statusCode: null,
      uid: req.user!.uid, clientVersion: clientVersion ?? null,
    })
    res.status(204).send()
  } catch (e) { next(e) }
}

// ── Consentement RGPD ──
export async function recordConsent(req: Request, res: Response, next: NextFunction) {
  try {
    await userRepo.setConsent(req.user!.uid, req.body?.version ?? '1')
    res.status(204).send()
  } catch (e) { next(e) }
}
