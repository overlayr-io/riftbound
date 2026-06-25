import type { Request, Response, NextFunction } from 'express'
import type { Role, Permission } from '@riftbound/shared'
import { hasPermission, isAdminRole } from '@riftbound/shared'
import type { AuditActor } from '../services/audit.service'

/** Rôle admin courant, lu depuis le custom claim du token (re-vérifié serveur). */
export function roleOf(req: Request): Role | null {
  const claim = req.user?.role
  return isAdminRole(claim as Role) ? (claim as Role) : null
}

/** Acteur normalisé pour l'audit (uid + rôle + ip). */
export function actorOf(req: Request): AuditActor {
  return {
    uid: req.user!.uid,
    role: roleOf(req),
    ip: req.ip ?? req.socket.remoteAddress ?? null,
  }
}

/**
 * Exige que l'appelant possède l'un des rôles donnés.
 * À chaîner APRÈS requireAuth (qui pose req.user depuis un token vérifié).
 */
export function requireRole(roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) { res.status(401).json({ error: 'Unauthorized' }); return }
    const role = roleOf(req)
    if (!role || !roles.includes(role)) {
      res.status(403).json({ error: 'Forbidden' }); return
    }
    next()
  }
}

/**
 * Exige une permission précise, résolue depuis le rôle via la matrice partagée.
 * Même matrice que le guard front et les security rules.
 */
export function requirePermission(permission: Permission) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) { res.status(401).json({ error: 'Unauthorized' }); return }
    const role = roleOf(req)
    if (!hasPermission(role, permission)) {
      res.status(403).json({ error: 'Forbidden' }); return
    }
    next()
  }
}
