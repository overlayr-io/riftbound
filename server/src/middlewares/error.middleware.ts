import type { Request, Response, NextFunction } from 'express'
import { errorCaptureService } from '../services/error-capture.service'

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction) {
  console.error(err.stack)
  // Capture bridée en Firestore (5xx serveur).
  void errorCaptureService.capture({
    source: 'server',
    message: err.message || 'Internal server error',
    stack: err.stack?.slice(0, 2000) ?? null,
    path: req.originalUrl ?? null,
    method: req.method ?? null,
    statusCode: 500,
    uid: req.user?.uid ?? null,
    clientVersion: null,
  })
  res.status(500).json({ error: 'Internal server error' })
}
