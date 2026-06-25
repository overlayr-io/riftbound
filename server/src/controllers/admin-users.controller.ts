import type { Request, Response, NextFunction } from 'express'
import type { UsersFilter, Role, UserStatus, BetaAccess } from '@riftbound/shared'
import { AdminUsersService } from '../services/admin-users.service'
import { UserRepository } from '../repositories/user.repository'
import { AdminGamesRepository } from '../repositories/admin-games.repository'
import { AuditService } from '../services/audit.service'
import { AuditRepository } from '../repositories/audit.repository'
import { actorOf } from '../middlewares/rbac.middleware'

const service = new AdminUsersService(
  new UserRepository(),
  new AdminGamesRepository(),
  new AuditService(new AuditRepository()),
)

const param = (p: string | string[]): string => (Array.isArray(p) ? p[0] : p)
const str = (v: unknown): string | undefined => (typeof v === 'string' && v ? v : undefined)

export async function listUsers(req: Request, res: Response, next: NextFunction) {
  try {
    const q = req.query
    const filter: UsersFilter = {
      search: str(q.search),
      status: str(q.status) as UserStatus | undefined,
      role: str(q.role) as Role | undefined,
      betaAccess: str(q.betaAccess) as BetaAccess | undefined,
      limit: str(q.limit) ? parseInt(str(q.limit)!, 10) : undefined,
    }
    res.json(await service.list(filter))
  } catch (err) { next(err) }
}

export async function getUser(req: Request, res: Response, next: NextFunction) {
  try {
    const detail = await service.detail(param(req.params.uid))
    if (!detail) { res.status(404).json({ error: 'User not found' }); return }
    res.json(detail)
  } catch (err) { next(err) }
}

export async function suspendUser(req: Request, res: Response, next: NextFunction) {
  try {
    const { durationMs, reason } = req.body
    if (!durationMs || typeof durationMs !== 'number') { res.status(400).json({ error: 'Missing durationMs' }); return }
    res.json(await service.suspend(actorOf(req), param(req.params.uid), durationMs, reason ?? ''))
  } catch (err) { next(err) }
}

export async function banUser(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await service.ban(actorOf(req), param(req.params.uid), req.body?.reason ?? ''))
  } catch (err) { next(err) }
}

export async function reactivateUser(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await service.reactivate(actorOf(req), param(req.params.uid)))
  } catch (err) { next(err) }
}

export async function resetDisplayName(req: Request, res: Response, next: NextFunction) {
  try {
    const { displayName } = req.body
    if (!displayName) { res.status(400).json({ error: 'Missing displayName' }); return }
    res.json(await service.resetDisplayName(actorOf(req), param(req.params.uid), displayName))
  } catch (err) { next(err) }
}

export async function forceLogout(req: Request, res: Response, next: NextFunction) {
  try {
    await service.forceLogout(actorOf(req), param(req.params.uid))
    res.status(204).send()
  } catch (err) { next(err) }
}

export async function softDeleteUser(req: Request, res: Response, next: NextFunction) {
  try {
    await service.softDelete(actorOf(req), param(req.params.uid))
    res.status(204).send()
  } catch (err) { next(err) }
}

export async function hardDeleteUser(req: Request, res: Response, next: NextFunction) {
  try {
    await service.hardDelete(actorOf(req), param(req.params.uid))
    res.status(204).send()
  } catch (err) { next(err) }
}

export async function impersonate(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await service.impersonate(actorOf(req), param(req.params.uid))
    res.json(result)
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'USER_NOT_FOUND') {
      res.status(404).json({ error: 'User not found' }); return
    }
    next(err)
  }
}
