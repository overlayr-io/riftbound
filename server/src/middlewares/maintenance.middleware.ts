import type { Request, Response, NextFunction } from 'express'
import { opsSettingsRepository } from '../repositories/ops-settings.repository'
import { roleOf } from './rbac.middleware'

/**
 * Mode maintenance : renvoie 503 sur l'API joueur quand activé, sauf pour les
 * rôles autorisés (allowRoles). À chaîner APRÈS requireAuth (pour lire le rôle).
 * Lecture cachée (5s) pour ne pas pénaliser chaque requête.
 */
export async function maintenanceGuard(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const state = await opsSettingsRepository.getMaintenanceCached()
    if (!state.enabled) { next(); return }
    const role = roleOf(req)
    if (role && state.allowRoles.includes(role)) { next(); return }
    res.status(503).json({ error: 'MAINTENANCE', message: state.message || 'Maintenance en cours.' })
  } catch {
    // En cas d'erreur de lecture, ne pas bloquer le jeu.
    next()
  }
}
