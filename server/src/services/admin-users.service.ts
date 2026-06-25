import type { User, UserSummary, UserDetail, UsersFilter, ImpersonationToken } from '@riftbound/shared'
import { firebaseAuth } from '../config/firebase'
import { UserRepository } from '../repositories/user.repository'
import { AdminGamesRepository } from '../repositories/admin-games.repository'
import { AuditService, type AuditActor } from './audit.service'

function toSummary(u: User): UserSummary {
  return {
    uid: u.uid, email: u.email, displayName: u.displayName, role: u.role,
    status: u.status, betaAccess: u.betaAccess, isAnonymous: u.isAnonymous,
    suspendedUntil: u.suspendedUntil, lastSeenAt: u.lastSeenAt, createdAt: u.createdAt,
  }
}

export class AdminUsersService {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly gamesRepo: AdminGamesRepository,
    private readonly auditService: AuditService,
  ) {}

  async list(filter: UsersFilter): Promise<UserSummary[]> {
    const all = await this.userRepo.list()
    const search = filter.search?.trim().toLowerCase()
    return all
      .filter((u) => {
        if (filter.status && u.status !== filter.status) return false
        if (filter.role && u.role !== filter.role) return false
        if (filter.betaAccess && u.betaAccess !== filter.betaAccess) return false
        if (search) {
          const hay = [u.uid, u.email ?? '', u.displayName ?? ''].join(' ').toLowerCase()
          if (!hay.includes(search)) return false
        }
        return true
      })
      .slice(0, filter.limit ?? 100)
      .map(toSummary)
  }

  async detail(uid: string): Promise<UserDetail | null> {
    const u = await this.userRepo.findById(uid)
    if (!u) return null
    const games = await this.gamesRepo.listForPlayer(uid)

    let session = { lastSignInAt: null as Date | null, lastRefreshAt: null as Date | null, provider: 'unknown' }
    try {
      const rec = await firebaseAuth.getUser(uid)
      session = {
        lastSignInAt: rec.metadata.lastSignInTime ? new Date(rec.metadata.lastSignInTime) : null,
        lastRefreshAt: rec.metadata.lastRefreshTime ? new Date(rec.metadata.lastRefreshTime) : null,
        provider: rec.providerData[0]?.providerId ?? (u.isAnonymous ? 'anonymous' : 'unknown'),
      }
    } catch { /* user may not exist in auth (seed data) */ }

    return { ...toSummary(u), suspendReason: u.suspendReason, deletedAt: u.deletedAt, games, session }
  }

  async suspend(actor: AuditActor, uid: string, durationMs: number, reason: string): Promise<UserDetail> {
    const before = await this.userRepo.findById(uid)
    const until = new Date(Date.now() + durationMs)
    await this.userRepo.suspend(uid, until, reason)
    await firebaseAuth.revokeRefreshTokens(uid).catch(() => {})
    await this.audit(actor, 'players.suspend', uid, before?.status, { status: 'suspended', until, reason })
    return (await this.detail(uid))!
  }

  async ban(actor: AuditActor, uid: string, reason: string): Promise<UserDetail> {
    const before = await this.userRepo.findById(uid)
    await this.userRepo.ban(uid, reason)
    await firebaseAuth.updateUser(uid, { disabled: true }).catch(() => {})
    await firebaseAuth.revokeRefreshTokens(uid).catch(() => {})
    await this.audit(actor, 'players.ban', uid, before?.status, { status: 'banned', reason })
    return (await this.detail(uid))!
  }

  async reactivate(actor: AuditActor, uid: string): Promise<UserDetail> {
    const before = await this.userRepo.findById(uid)
    await this.userRepo.reactivate(uid)
    await firebaseAuth.updateUser(uid, { disabled: false }).catch(() => {})
    await this.audit(actor, 'players.reactivate', uid, before?.status, { status: 'active' })
    return (await this.detail(uid))!
  }

  async resetDisplayName(actor: AuditActor, uid: string, displayName: string): Promise<UserDetail> {
    const before = await this.userRepo.findById(uid)
    await this.userRepo.setDisplayName(uid, displayName)
    await firebaseAuth.updateUser(uid, { displayName }).catch(() => {})
    await this.audit(actor, 'players.reset_displayname', uid, before?.displayName, { displayName })
    return (await this.detail(uid))!
  }

  async forceLogout(actor: AuditActor, uid: string): Promise<void> {
    await firebaseAuth.revokeRefreshTokens(uid)
    await this.audit(actor, 'players.force_logout', uid, null, null)
  }

  /** Soft-delete : marqué supprimé + auth désactivé. Réversible. */
  async softDelete(actor: AuditActor, uid: string): Promise<void> {
    await this.userRepo.softDelete(uid)
    await firebaseAuth.updateUser(uid, { disabled: true }).catch(() => {})
    await firebaseAuth.revokeRefreshTokens(uid).catch(() => {})
    await this.audit(actor, 'players.soft_delete', uid, null, { deleted: true })
  }

  /** Hard-delete : suppression définitive auth + doc (super_admin only, RGPD). */
  async hardDelete(actor: AuditActor, uid: string): Promise<void> {
    await firebaseAuth.deleteUser(uid).catch(() => {})
    await this.userRepo.hardDelete(uid)
    await this.audit(actor, 'players.hard_delete', uid, null, { hardDeleted: true })
  }

  /** « Voir comme ce joueur » — custom token, fortement audité (players:impersonate). */
  async impersonate(actor: AuditActor, uid: string): Promise<ImpersonationToken> {
    const target = await this.userRepo.findById(uid)
    if (!target) throw new Error('USER_NOT_FOUND')
    const token = await firebaseAuth.createCustomToken(uid, { impersonatedBy: actor.uid })
    await this.audit(actor, 'players.impersonate', uid, null, { impersonatedBy: actor.uid })
    return { token, targetUid: uid, expiresInfo: '1h (custom token Firebase)' }
  }

  private audit(actor: AuditActor, action: string, uid: string, before: unknown, after: unknown) {
    return this.auditService.record({ actor, action, targetType: 'user', targetId: uid, before, after })
  }
}
