import type { MessageReport, ReportScope, ReportStatus } from '@riftbound/shared'
import { db } from '../config/firebase'
import { FieldValue } from 'firebase-admin/firestore'

function toReport(id: string, d: FirebaseFirestore.DocumentData): MessageReport {
  return {
    id,
    scope: (d.scope as ReportScope) ?? 'game',
    containerId: d.containerId,
    messageId: d.messageId,
    messageText: d.messageText ?? '',
    targetUid: d.targetUid ?? '',
    reporterUid: d.reporterUid,
    reason: d.reason ?? '',
    status: (d.status as ReportStatus) ?? 'open',
    createdAt: d.createdAt?.toDate() ?? new Date(),
  }
}

export class MessageReportRepository {
  private readonly col = db.collection('messageReports')

  async create(input: Omit<MessageReport, 'id' | 'status' | 'createdAt'>): Promise<MessageReport> {
    const ref = await this.col.add({ ...input, status: 'open' as ReportStatus, createdAt: FieldValue.serverTimestamp() })
    return toReport(ref.id, (await ref.get()).data()!)
  }

  async list(status?: ReportStatus): Promise<MessageReport[]> {
    const snap = await this.col.orderBy('createdAt', 'desc').limit(300).get()
    const all = snap.docs.map((d) => toReport(d.id, d.data()))
    return status ? all.filter((r) => r.status === status) : all
  }

  async setStatus(id: string, status: ReportStatus): Promise<void> {
    await this.col.doc(id).update({ status })
  }

  /** Supprime le message signalé dans sa sous-collection (game/lobby). */
  async deleteMessage(report: MessageReport): Promise<void> {
    const parent = report.scope === 'game' ? 'games' : 'lobbies'
    await db.collection(parent).doc(report.containerId).collection('messages').doc(report.messageId).delete().catch(() => {})
  }
}
