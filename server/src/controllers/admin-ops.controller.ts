import type { Request, Response, NextFunction } from 'express'
import { OpsService } from '../services/ops.service'
import { ModerationService } from '../services/moderation.service'
import { FeatureFlagRepository } from '../repositories/feature-flag.repository'
import { MessageReportRepository } from '../repositories/message-report.repository'
import { UserRepository } from '../repositories/user.repository'
import { opsSettingsRepository } from '../repositories/ops-settings.repository'
import { AuditService } from '../services/audit.service'
import { AuditRepository } from '../repositories/audit.repository'
import { actorOf } from '../middlewares/rbac.middleware'
import { env } from '../config/env'
import type { ReportStatus } from '@riftbound/shared'

const audit = new AuditService(new AuditRepository())
const ops = new OpsService(new FeatureFlagRepository(), opsSettingsRepository, audit)
const moderation = new ModerationService(new MessageReportRepository(), new UserRepository(), audit)
const param = (p: string | string[]): string => (Array.isArray(p) ? p[0] : p)

// ── Feature flags ──
export async function listFlags(_req: Request, res: Response, next: NextFunction) {
  try { res.json(await ops.listFlags()) } catch (e) { next(e) }
}
export async function upsertFlag(req: Request, res: Response, next: NextFunction) {
  try {
    const { key, enabled, rolloutPercent, description } = req.body
    if (!key) { res.status(400).json({ error: 'Missing key' }); return }
    res.json(await ops.upsertFlag(actorOf(req), { key, enabled: !!enabled, rolloutPercent: Number(rolloutPercent) || 0, description: description ?? '' }))
  } catch (e) { next(e) }
}
export async function deleteFlag(req: Request, res: Response, next: NextFunction) {
  try { await ops.removeFlag(actorOf(req), param(req.params.key)); res.status(204).send() } catch (e) { next(e) }
}

// ── Maintenance ──
export async function getMaintenance(_req: Request, res: Response, next: NextFunction) {
  try { res.json(await ops.getMaintenance()) } catch (e) { next(e) }
}
export async function setMaintenance(req: Request, res: Response, next: NextFunction) {
  try {
    const { enabled, message, allowRoles } = req.body
    res.json(await ops.setMaintenance(actorOf(req), { enabled: !!enabled, message: message ?? '', allowRoles: allowRoles ?? ['super_admin'] }))
  } catch (e) { next(e) }
}

// ── Config modération chat ──
export async function getChatConfig(_req: Request, res: Response, next: NextFunction) {
  try { res.json(await ops.getChatConfig()) } catch (e) { next(e) }
}
export async function setChatConfig(req: Request, res: Response, next: NextFunction) {
  try {
    const words = Array.isArray(req.body?.extraBlockedWords) ? req.body.extraBlockedWords.map(String) : []
    res.json(await ops.setChatConfig(actorOf(req), words))
  } catch (e) { next(e) }
}

// ── Seed (NON-PROD) ──
export async function seedData(req: Request, res: Response, next: NextFunction) {
  try {
    if (env.NODE_ENV === 'production') { res.status(403).json({ error: 'Seed interdit en production' }); return }
    res.json(await ops.seed(actorOf(req)))
  } catch (e) { next(e) }
}

// ── Modération chat (signalements + mute) ──
export async function listReports(req: Request, res: Response, next: NextFunction) {
  try { res.json(await moderation.list(typeof req.query.status === 'string' ? req.query.status as ReportStatus : undefined)) } catch (e) { next(e) }
}
export async function resolveReport(req: Request, res: Response, next: NextFunction) {
  try {
    await moderation.resolve(actorOf(req), param(req.params.id), req.body?.deleteMessage === true)
    res.status(204).send()
  } catch (e: unknown) { if (e instanceof Error && e.message === 'NOT_FOUND') { res.status(404).json({ error: 'Not found' }); return } next(e) }
}
export async function muteUser(req: Request, res: Response, next: NextFunction) {
  try { await moderation.setMuted(actorOf(req), param(req.params.uid), req.body?.muted !== false); res.status(204).send() } catch (e) { next(e) }
}
