import type { Request, Response, NextFunction } from 'express'
import { AdminService } from '../services/admin.service'
import { AuditService } from '../services/audit.service'
import { UserRepository } from '../repositories/user.repository'
import { AuditRepository } from '../repositories/audit.repository'
import { actorOf } from '../middlewares/rbac.middleware'

const auditService = new AuditService(new AuditRepository())
const adminService = new AdminService(new UserRepository(), auditService)

function param(p: string | string[]): string {
  return Array.isArray(p) ? p[0] : p
}

export async function assignRole(req: Request, res: Response, next: NextFunction) {
  try {
    const { uid, role } = req.body
    if (!uid || typeof uid !== 'string') {
      res.status(400).json({ error: 'Missing uid' }); return
    }
    if (uid === req.user!.uid) {
      res.status(400).json({ error: 'Cannot change your own role' }); return
    }
    const user = await adminService.assignRole(actorOf(req), uid, role ?? null)
    res.status(200).json(user)
  } catch (err: unknown) {
    if (err instanceof Error) {
      if (err.message === 'INVALID_ROLE') { res.status(400).json({ error: 'Invalid role' }); return }
      if (err.message === 'USER_NOT_FOUND') { res.status(404).json({ error: 'User not found' }); return }
    }
    next(err)
  }
}

export async function revokeRole(req: Request, res: Response, next: NextFunction) {
  try {
    const uid = param(req.params.uid)
    if (uid === req.user!.uid) {
      res.status(400).json({ error: 'Cannot change your own role' }); return
    }
    const user = await adminService.assignRole(actorOf(req), uid, null)
    res.status(200).json(user)
  } catch (err) { next(err) }
}

export async function listAudit(req: Request, res: Response, next: NextFunction) {
  try {
    const { actorUid, action, targetType, targetId, limit } = req.query
    const entries = await auditService.list({
      actorUid: typeof actorUid === 'string' ? actorUid : undefined,
      action: typeof action === 'string' ? action : undefined,
      targetType: typeof targetType === 'string' ? targetType : undefined,
      targetId: typeof targetId === 'string' ? targetId : undefined,
      limit: typeof limit === 'string' ? parseInt(limit, 10) : undefined,
    })
    res.status(200).json(entries)
  } catch (err) { next(err) }
}
