import type { Role, User } from '@riftbound/shared'
import { isAdminRole } from '@riftbound/shared'
import { firebaseAuth } from '../config/firebase'
import { UserRepository } from '../repositories/user.repository'
import { AuditService, type AuditActor } from './audit.service'

export class AdminService {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Assigne ou retire un rôle admin. La source de vérité d'autorisation est le
   * custom claim Firebase (re-vérifié par le middleware côté serveur ET par les
   * security rules). Le doc Firestore `users.role` est tenu en miroir pour l'UI.
   */
  async assignRole(actor: AuditActor, targetUid: string, role: Role | null): Promise<User> {
    if (role !== null && !isAdminRole(role)) {
      throw new Error('INVALID_ROLE')
    }

    const before = await this.userRepo.findById(targetUid)

    // Custom claim = source de vérité (révoqué si role === null).
    await firebaseAuth.setCustomUserClaims(targetUid, role ? { role } : { role: null })
    // Force le rafraîchissement du token côté client (révocation immédiate).
    await firebaseAuth.revokeRefreshTokens(targetUid)

    await this.userRepo.setRole(targetUid, role)
    const after = await this.userRepo.findById(targetUid)

    await this.auditService.record({
      actor,
      action: role ? 'admin.role.assign' : 'admin.role.revoke',
      targetType: 'user',
      targetId: targetUid,
      before: before ? { role: before.role } : null,
      after: { role },
    })

    if (!after) throw new Error('USER_NOT_FOUND')
    return after
  }
}
