import type { UserDataExport } from '@riftbound/shared'
import { firebaseAuth } from '../config/firebase'
import { UserRepository } from '../repositories/user.repository'
import { AdminGamesRepository } from '../repositories/admin-games.repository'
import { BugReportRepository } from '../repositories/bug-report.repository'
import { MessageReportRepository } from '../repositories/message-report.repository'
import { AuditService, type AuditActor } from './audit.service'

export class GdprService {
  constructor(
    private readonly users: UserRepository,
    private readonly games: AdminGamesRepository,
    private readonly bugs: BugReportRepository,
    private readonly reports: MessageReportRepository,
    private readonly audit: AuditService,
  ) {}

  /** Export complet des données d'un utilisateur (JSON). */
  async export(actor: AuditActor, uid: string): Promise<UserDataExport> {
    const [user, games, bugReports, allReports] = await Promise.all([
      this.users.findById(uid),
      this.games.listForPlayer(uid),
      this.bugs.listForUser(uid),
      this.reports.list(),
    ])
    await this.audit.record({ actor, action: 'gdpr.export', targetType: 'user', targetId: uid, before: null, after: null })
    return {
      generatedAt: new Date().toISOString(),
      user,
      games,
      bugReports,
      messageReports: allReports.filter((r) => r.reporterUid === uid || r.targetUid === uid),
    }
  }

  /** Droit à l'effacement par anonymisation (réversible côté auth = désactivation). */
  async anonymize(actor: AuditActor, uid: string): Promise<void> {
    await this.users.anonymize(uid)
    await firebaseAuth.updateUser(uid, { disabled: true, displayName: '(anonymisé)' }).catch(() => {})
    await firebaseAuth.revokeRefreshTokens(uid).catch(() => {})
    await this.audit.record({ actor, action: 'gdpr.anonymize', targetType: 'user', targetId: uid, before: null, after: { anonymized: true } })
  }
}
