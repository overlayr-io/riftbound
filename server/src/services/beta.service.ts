import type {
  Invite, WaitlistEntry, BetaSettings, BetaPhase, BetaAccessState, WaitlistStatus,
} from '@riftbound/shared'
import { firebaseAuth } from '../config/firebase'
import { InviteRepository } from '../repositories/invite.repository'
import { WaitlistRepository } from '../repositories/waitlist.repository'
import { BetaSettingsRepository } from '../repositories/beta-settings.repository'
import { UserRepository } from '../repositories/user.repository'
import { AuditService, type AuditActor } from './audit.service'

function genCode(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase()
}

export class BetaService {
  constructor(
    private readonly inviteRepo: InviteRepository,
    private readonly waitlistRepo: WaitlistRepository,
    private readonly settingsRepo: BetaSettingsRepository,
    private readonly userRepo: UserRepository,
    private readonly auditService: AuditService,
  ) {}

  // ── Phase ─────────────────────────────────────────────────────────────────
  getSettings(): Promise<BetaSettings> {
    return this.settingsRepo.get()
  }

  async setPhase(actor: AuditActor, phase: BetaPhase): Promise<BetaSettings> {
    const before = await this.settingsRepo.get()
    const result = await this.settingsRepo.setPhase(phase, actor.uid)
    await this.auditService.record({
      actor, action: 'beta.set_phase', targetType: 'betaSettings', targetId: 'current',
      before: { phase: before.phase }, after: { phase },
    })
    return result
  }

  // ── Invitations ─────────────────────────────────────────────────────────────
  async createInvite(actor: AuditActor, maxUses: number, expiresAt: Date | null): Promise<Invite> {
    let code = genCode()
    for (let i = 0; i < 5 && (await this.inviteRepo.findByCode(code)); i++) code = genCode()
    const invite = await this.inviteRepo.create({ code, createdBy: actor.uid, maxUses, expiresAt })
    await this.auditService.record({
      actor, action: 'beta.invite_create', targetType: 'invite', targetId: code,
      before: null, after: { maxUses, expiresAt },
    })
    return invite
  }

  listInvites(): Promise<Invite[]> {
    return this.inviteRepo.list()
  }

  async revokeInvite(actor: AuditActor, code: string): Promise<void> {
    const ok = await this.inviteRepo.revoke(code)
    if (!ok) throw new Error('INVITE_NOT_FOUND')
    await this.auditService.record({
      actor, action: 'beta.invite_revoke', targetType: 'invite', targetId: code, before: null, after: { status: 'revoked' },
    })
  }

  // ── Waitlist ──────────────────────────────────────────────────────────────
  listWaitlist(): Promise<WaitlistEntry[]> {
    return this.waitlistRepo.list()
  }

  async decideWaitlist(
    actor: AuditActor,
    ids: string[],
    status: Extract<WaitlistStatus, 'approved' | 'rejected'>,
    note: string | null,
  ): Promise<WaitlistEntry[]> {
    const decided = await this.waitlistRepo.decide(ids, status, actor.uid, note)

    // Approbation → grant l'accès beta au compte correspondant (par email).
    if (status === 'approved') {
      for (const entry of decided) {
        try {
          const rec = await firebaseAuth.getUserByEmail(entry.email)
          await this.userRepo.setBetaAccess(rec.uid, 'granted')
        } catch { /* pas encore de compte pour cet email */ }
      }
    }

    await this.auditService.record({
      actor, action: `beta.waitlist_${status}`, targetType: 'waitlist', targetId: ids.join(','),
      before: null, after: { count: ids.length, status },
    })
    return decided
  }

  // ── Gate joueur ─────────────────────────────────────────────────────────────
  async accessState(uid: string): Promise<BetaAccessState> {
    const settings = await this.settingsRepo.get()
    const user = await this.userRepo.findById(uid)
    const betaAccess = user?.betaAccess ?? 'none'
    const allowed = settings.phase === 'public' || betaAccess === 'granted'
    return { phase: settings.phase, betaAccess, allowed }
  }

  async redeem(uid: string, code: string): Promise<BetaAccessState> {
    const outcome = await this.inviteRepo.redeem(code.toUpperCase(), uid)
    if (!outcome.ok) throw new Error(`REDEEM_${outcome.reason}`)
    await this.userRepo.setBetaAccess(uid, 'granted')
    return this.accessState(uid)
  }

  async joinWaitlist(uid: string, email: string): Promise<BetaAccessState> {
    await this.waitlistRepo.add(email, 'player_signup')
    await this.userRepo.setBetaAccess(uid, 'waitlisted')
    return this.accessState(uid)
  }
}
