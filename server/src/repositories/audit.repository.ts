import type { AuditLogEntry, AuditLogFilter, Role } from '@riftbound/shared'
import { db } from '../config/firebase'
import { FieldValue } from 'firebase-admin/firestore'

function docToEntry(id: string, data: FirebaseFirestore.DocumentData): AuditLogEntry {
  return {
    id,
    actorUid: data.actorUid,
    actorRole: (data.actorRole as Role) ?? null,
    action: data.action,
    targetType: data.targetType,
    targetId: data.targetId ?? null,
    before: data.before ?? null,
    after: data.after ?? null,
    ip: data.ip ?? null,
    at: data.at?.toDate() ?? new Date(),
  }
}

export interface AuditWriteInput {
  actorUid: string
  actorRole: Role | null
  action: string
  targetType: string
  targetId: string | null
  before: unknown | null
  after: unknown | null
  ip: string | null
}

const DEFAULT_LIMIT = 100
const MAX_LIMIT = 500

export class AuditRepository {
  private readonly col = db.collection('auditLogs')

  async add(input: AuditWriteInput): Promise<void> {
    await this.col.add({
      actorUid: input.actorUid,
      actorRole: input.actorRole,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId,
      before: input.before ?? null,
      after: input.after ?? null,
      ip: input.ip,
      at: FieldValue.serverTimestamp(),
    })
  }

  async list(filter: AuditLogFilter): Promise<AuditLogEntry[]> {
    let query: FirebaseFirestore.Query = this.col

    if (filter.actorUid) query = query.where('actorUid', '==', filter.actorUid)
    if (filter.action) query = query.where('action', '==', filter.action)
    if (filter.targetType) query = query.where('targetType', '==', filter.targetType)
    if (filter.targetId) query = query.where('targetId', '==', filter.targetId)

    const limit = Math.min(filter.limit ?? DEFAULT_LIMIT, MAX_LIMIT)
    const snap = await query.orderBy('at', 'desc').limit(limit).get()
    return snap.docs.map(doc => docToEntry(doc.id, doc.data()))
  }
}
