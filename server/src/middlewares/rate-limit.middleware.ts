import type { Request, Response, NextFunction } from 'express'

/**
 * Rate limiting fenêtre-fixe en mémoire — 0 dépendance, 0 infra (adapté au
 * free tier mono-instance Render/Railway). Clé = uid si authentifié, sinon IP.
 * Les seuils sont calés TRÈS au-dessus du rythme humain : seuls spam/scripts
 * les atteignent. Les actions haute-fréquence du plateau vont direct à
 * Firestore/RTDB et ne passent jamais ici.
 */
interface Bucket { count: number; resetAt: number }
const store = new Map<string, Bucket>()

// Purge périodique des buckets expirés (évite la fuite mémoire).
const timer = setInterval(() => {
  const now = Date.now()
  for (const [k, b] of store) if (b.resetAt <= now) store.delete(k)
}, 60_000)
timer.unref?.()

export interface RateLimitOptions {
  windowMs: number
  max: number
  name: string
}

export function rateLimit(opts: RateLimitOptions) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const id = req.user?.uid ?? req.ip ?? 'anon'
    const key = `${opts.name}:${id}`
    const now = Date.now()

    let bucket = store.get(key)
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + opts.windowMs }
      store.set(key, bucket)
    }
    bucket.count++

    res.setHeader('X-RateLimit-Limit', String(opts.max))
    res.setHeader('X-RateLimit-Remaining', String(Math.max(0, opts.max - bucket.count)))

    if (bucket.count > opts.max) {
      res.setHeader('Retry-After', String(Math.ceil((bucket.resetAt - now) / 1000)))
      res.status(429).json({ error: 'RATE_LIMITED', message: 'Trop de requêtes, réessaie dans un instant.' })
      return
    }
    next()
  }
}

// Seuils partagés (cf. tableau validé). 1 min sauf mention contraire.
export const limiters = {
  global: rateLimit({ windowMs: 60_000, max: 120, name: 'global' }),
  chat: rateLimit({ windowMs: 60_000, max: 30, name: 'chat' }),
  lobby: rateLimit({ windowMs: 60_000, max: 20, name: 'lobby' }),
  beta: rateLimit({ windowMs: 5 * 60_000, max: 10, name: 'beta' }),
  report: rateLimit({ windowMs: 60_000, max: 20, name: 'report' }),
  bugReport: rateLimit({ windowMs: 60_000, max: 20, name: 'bugReport' }),
  clientError: rateLimit({ windowMs: 60_000, max: 30, name: 'clientError' }),
  adminMutation: rateLimit({ windowMs: 60_000, max: 60, name: 'adminMut' }),
}
