import type { Request, Response, NextFunction } from 'express'
import { UserService } from '../services/user.service'
import { UserRepository } from '../repositories/user.repository'

const userService = new UserService(new UserRepository())

/**
 * Provisionne / rafraîchit le profil de l'appelant à la connexion.
 * Source des champs : le token vérifié (req.user), jamais le body — on ne fait
 * pas confiance au client pour son email/uid.
 */
export async function syncSession(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.user!
    const user = await userService.syncSession({
      uid: token.uid,
      email: token.email ?? null,
      displayName: token.name ?? null,
      isAnonymous: token.firebase?.sign_in_provider === 'anonymous',
    })
    res.status(200).json(user)
  } catch (err) { next(err) }
}

export async function getMe(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await userService.getById(req.user!.uid)
    if (!user) { res.status(404).json({ error: 'User not found' }); return }
    res.status(200).json(user)
  } catch (err) { next(err) }
}
