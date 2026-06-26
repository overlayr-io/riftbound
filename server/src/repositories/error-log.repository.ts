import type { ErrorLogEntry, ErrorSource } from '@riftbound/shared'
import { db } from '../config/firebase'
import { FieldValue } from 'firebase-admin/firestore'

const RETENTION_DAYS = 30

export interface ErrorWriteInput {
  source: ErrorSource
  message: string
  stack: string | null
  path: string | null
  method: string | null
  statusCode: number | null
  uid: string | null
  clientVersion: string | null
}

export class ErrorLogRepository {
  private readonly col = db.collection('errorLogs')

  async add(input: ErrorWriteInput): Promise<void> {
    await this.col.add({ ...input, count: 1, at: FieldValue.serverTimestamp() })
  }

  async list(limit = 200): Promise<ErrorLogEntry[]> {
    const snap = await this.col.orderBy('at', 'desc').limit(limit).get()
    return snap.docs.map((d) => {
      const x = d.data()
      return {
        id: d.id,
        source: (x.source as ErrorSource) ?? 'server',
        message: x.message ?? '',
        stack: x.stack ?? null,
        path: x.path ?? null,
        method: x.method ?? null,
        statusCode: x.statusCode ?? null,
        uid: x.uid ?? null,
        clientVersion: x.clientVersion ?? null,
        count: x.count ?? 1,
        at: x.at?.toDate() ?? new Date(),
      }
    })
  }

  /** Purge au-delà de la rétention (appelé occasionnellement). */
  async purgeOld(): Promise<void> {
    const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000)
    const snap = await this.col.where('at', '<', cutoff).limit(300).get()
    const batch = db.batch()
    snap.docs.forEach((d) => batch.delete(d.ref))
    if (!snap.empty) await batch.commit()
  }
}
