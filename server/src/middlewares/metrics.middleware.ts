import type { Request, Response, NextFunction } from 'express'
import { metrics } from '../metrics'

/** Enregistre latence + statut de chaque requête /api pour la santé système. */
export function metricsMiddleware(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now()
  res.on('finish', () => {
    metrics.record(Date.now() - start, res.statusCode >= 500)
  })
  next()
}
