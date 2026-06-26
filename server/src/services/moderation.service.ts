import type { MessageReport, ReportStatus, ReportScope } from '@riftbound/shared'
import { MessageReportRepository } from '../repositories/message-report.repository'
import { UserRepository } from '../repositories/user.repository'
import { AuditService, type AuditActor } from './audit.service'

export class ModerationService {
  constructor(
    private readonly reports: MessageReportRepository,
    private readonly users: UserRepository,
    private readonly audit: AuditService,
  ) {}

  // Player report (pas d'audit admin — flux joueur).
  report(input: { scope: ReportScope; containerId: string; messageId: string; messageText: string; targetUid: string; reporterUid: string; reason: string }) {
    return this.reports.create(input)
  }

  list(status?: ReportStatus) { return this.reports.list(status) }

  async resolve(actor: AuditActor, id: string, deleteMessage: boolean): Promise<void> {
    const all = await this.reports.list()
    const report = all.find((r) => r.id === id)
    if (!report) throw new Error('NOT_FOUND')
    if (deleteMessage) await this.reports.deleteMessage(report)
    await this.reports.setStatus(id, deleteMessage ? 'resolved' : 'dismissed')
    await this.audit.record({
      actor, action: deleteMessage ? 'mod.message_delete' : 'mod.report_dismiss',
      targetType: 'messageReport', targetId: id, before: null, after: { deleteMessage },
    })
  }

  async setMuted(actor: AuditActor, uid: string, muted: boolean): Promise<void> {
    await this.users.setMuted(uid, muted)
    await this.audit.record({ actor, action: muted ? 'mod.mute' : 'mod.unmute', targetType: 'user', targetId: uid, before: null, after: { muted } })
  }
}
