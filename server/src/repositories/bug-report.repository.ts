import type { BugReport, BugReportSeverity, BugReportStatus } from '@riftbound/shared'
import { db } from '../config/firebase'
import { FieldValue } from 'firebase-admin/firestore'

function toReport(id: string, d: FirebaseFirestore.DocumentData): BugReport {
  return {
    id,
    reporterUid: d.reporterUid,
    gameId: d.gameId ?? null,
    message: d.message ?? '',
    screenshotUrl: d.screenshotUrl ?? null,
    clientVersion: d.clientVersion ?? '',
    severity: (d.severity as BugReportSeverity) ?? 'medium',
    status: (d.status as BugReportStatus) ?? 'open',
    assignedTo: d.assignedTo ?? null,
    createdAt: d.createdAt?.toDate() ?? new Date(),
  }
}

export class BugReportRepository {
  private readonly col = db.collection('bugReports')

  async create(input: Omit<BugReport, 'id' | 'status' | 'assignedTo' | 'createdAt'>): Promise<BugReport> {
    const ref = await this.col.add({
      reporterUid: input.reporterUid, gameId: input.gameId ?? null, message: input.message,
      screenshotUrl: input.screenshotUrl ?? null, clientVersion: input.clientVersion,
      severity: input.severity, status: 'open' as BugReportStatus, assignedTo: null,
      createdAt: FieldValue.serverTimestamp(),
    })
    return toReport(ref.id, (await ref.get()).data()!)
  }

  async list(status?: BugReportStatus): Promise<BugReport[]> {
    const snap = await this.col.orderBy('createdAt', 'desc').limit(300).get()
    const all = snap.docs.map((d) => toReport(d.id, d.data()))
    return status ? all.filter((r) => r.status === status) : all
  }

  async listForUser(uid: string): Promise<BugReport[]> {
    const snap = await this.col.where('reporterUid', '==', uid).limit(100).get()
    return snap.docs.map((d) => toReport(d.id, d.data()))
  }

  async update(id: string, patch: { status?: BugReportStatus; assignedTo?: string | null }): Promise<BugReport | null> {
    const ref = this.col.doc(id)
    if (!(await ref.get()).exists) return null
    await ref.update({ ...patch })
    return toReport(id, (await ref.get()).data()!)
  }
}
