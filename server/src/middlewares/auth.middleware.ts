import type { Request, Response, NextFunction } from 'express'
import type { DecodedIdToken } from 'firebase-admin/auth'
import { firebaseAuth } from '../config/firebase'

declare global {
  namespace Express {
    interface Request {
      user?: DecodedIdToken
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authorization = req.headers.authorization
  console.log('authorization', authorization)
  if (!authorization?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  const token = authorization.slice(7)
  try {
    req.user = await firebaseAuth.verifyIdToken(token)
    console.log('req.user', req.user)
    next()
  } catch (error) {
    console.error("error : ", error)
    res.status(401).json({ error: 'Invalid token' })
  }
}
