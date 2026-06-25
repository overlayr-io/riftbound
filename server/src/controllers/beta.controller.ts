import type { Request, Response, NextFunction } from 'express'
import type { BetaPhase, WaitlistStatus } from '@riftbound/shared'
import { BetaService } from '../services/beta.service'
import { InviteRepository } from '../repositories/invite.repository'
import { WaitlistRepository } from '../repositories/waitlist.repository'
import { BetaSettingsRepository } from '../repositories/beta-settings.repository'
import { UserRepository } from '../repositories/user.repository'
import { AuditService } from '../services/audit.service'
import { AuditRepository } from '../repositories/audit.repository'
import { actorOf } from '../middlewares/rbac.middleware'

const service = new BetaService(
  new InviteRepository(),
  new WaitlistRepository(),
  new BetaSettingsRepository(),
  new UserRepository(),
  new AuditService(new AuditRepository()),
)

const param = (p: string | string[]): string => (Array.isArray(p) ? p[0] : p)
const VALID_PHASES: BetaPhase[] = ['beta_closed', 'beta_open', 'public']

// ── Admin ─────────────────────────────────────────────────────────────────────
export async function getSettings(_req: Request, res: Response, next: NextFunction) {
  try { res.json(await service.getSettings()) } catch (err) { next(err) }
}

export async function setPhase(req: Request, res: Response, next: NextFunction) {
  try {
    const { phase } = req.body
    if (!VALID_PHASES.includes(phase)) { res.status(400).json({ error: 'Invalid phase' }); return }
    res.json(await service.setPhase(actorOf(req), phase))
  } catch (err) { next(err) }
}

export async function listInvites(_req: Request, res: Response, next: NextFunction) {
  try { res.json(await service.listInvites()) } catch (err) { next(err) }
}

export async function createInvite(req: Request, res: Response, next: NextFunction) {
  try {
    const maxUses = Number(req.body?.maxUses) || 1
    const expiresAt = req.body?.expiresAt ? new Date(req.body.expiresAt) : null
    res.status(201).json(await service.createInvite(actorOf(req), maxUses, expiresAt))
  } catch (err) { next(err) }
}

export async function revokeInvite(req: Request, res: Response, next: NextFunction) {
  try {
    await service.revokeInvite(actorOf(req), param(req.params.code))
    res.status(204).send()
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'INVITE_NOT_FOUND') {
      res.status(404).json({ error: 'Invite not found' }); return
    }
    next(err)
  }
}

export async function listWaitlist(_req: Request, res: Response, next: NextFunction) {
  try { res.json(await service.listWaitlist()) } catch (err) { next(err) }
}

export async function decideWaitlist(req: Request, res: Response, next: NextFunction) {
  try {
    const { ids, status, note } = req.body as { ids: string[]; status: WaitlistStatus; note?: string }
    if (!Array.isArray(ids) || ids.length === 0) { res.status(400).json({ error: 'Missing ids' }); return }
    if (status !== 'approved' && status !== 'rejected') { res.status(400).json({ error: 'Invalid status' }); return }
    res.json(await service.decideWaitlist(actorOf(req), ids, status, note ?? null))
  } catch (err) { next(err) }
}

// ── Joueur (requireAuth seulement) ─────────────────────────────────────────────
export async function getAccess(req: Request, res: Response, next: NextFunction) {
  try { res.json(await service.accessState(req.user!.uid)) } catch (err) { next(err) }
}

export async function redeemCode(req: Request, res: Response, next: NextFunction) {
  try {
    const { code } = req.body
    if (!code) { res.status(400).json({ error: 'Missing code' }); return }
    res.json(await service.redeem(req.user!.uid, code))
  } catch (err: unknown) {
    if (err instanceof Error && err.message.startsWith('REDEEM_')) {
      res.status(400).json({ error: err.message }); return
    }
    next(err)
  }
}

export async function joinWaitlist(req: Request, res: Response, next: NextFunction) {
  try {
    const email = req.body?.email ?? req.user!.email
    if (!email) { res.status(400).json({ error: 'Missing email' }); return }
    res.json(await service.joinWaitlist(req.user!.uid, email))
  } catch (err) { next(err) }
}
