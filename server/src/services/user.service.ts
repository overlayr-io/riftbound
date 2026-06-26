import type { User } from '@riftbound/shared'
import { UserRepository, type UpsertUserInput } from '../repositories/user.repository'

export class UserService {
  constructor(private readonly userRepo: UserRepository) {}

  /** Provisionne / rafraîchit le profil à la connexion (joueurs anonymes inclus). */
  async syncSession(input: UpsertUserInput): Promise<User> {
    return this.userRepo.upsertOnAuth(input)
  }

  async getById(uid: string): Promise<User | null> {
    return this.userRepo.findById(uid)
  }

  async updateDisplayName(uid: string, displayName: string): Promise<User> {
    await this.userRepo.setDisplayName(uid, displayName)
    const user = await this.userRepo.findById(uid)
    return user!
  }
}
