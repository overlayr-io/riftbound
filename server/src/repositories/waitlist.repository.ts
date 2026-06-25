import type { WaitlistEntry, WaitlistStatus } from '@riftbound/shared'
import { db } from '../config/firebase'
import { FieldValue, Timestamp } from 'firebase-admin/firestore'

function docToEntry(id: string, data: FirebaseFirestore.DocumentData): WaitlistEntry {
  return {
    id,
    email: data.email,
    requestedAt: data.requestedAt?.toDate() ?? new Date(),
    source: data.source ?? 'unknown',
    status: (data.status as WaitlistStatus) ?? 'pending',
    decidedBy: data.decidedBy ?? null,
    decidedAt: data.decidedAt?.toDate() ?? null,
    note: data.note ?? null,
  }
}

export class WaitlistRepository {
  private readonly col = db.collection('waitlist')

  async add(email: string, source: string): Promise<WaitlistEntry> {
    // Évite les doublons d'email en attente.
    const existing = await this.col.where('email', '==', email).limit(1).get()
    if (!existing.empty) return docToEntry(existing.docs[0].id, existing.docs[0].data())

    const ref = await this.col.add({
      email,
      requestedAt: FieldValue.serverTimestamp(),
      source,
      status: 'pending' as WaitlistStatus,
      decidedBy: null,
      decidedAt: null,
      note: null,
    })
    const doc = await ref.get()
    return docToEntry(ref.id, doc.data()!)
  }

  async list(scanLimit = 300): Promise<WaitlistEntry[]> {
    const snap = await this.col.orderBy('requestedAt', 'desc').limit(scanLimit).get()
    return snap.docs.map((d) => docToEntry(d.id, d.data()))
  }

  async decide(
    ids: string[],
    status: Extract<WaitlistStatus, 'approved' | 'rejected'>,
    decidedBy: string,
    note: string | null,
  ): Promise<WaitlistEntry[]> {
    const batch = db.batch()
    const now = FieldValue.serverTimestamp()
    for (const id of ids) {
      batch.update(this.col.doc(id), { status, decidedBy, decidedAt: now, note })
    }
    await batch.commit()

    const out: WaitlistEntry[] = []
    for (const id of ids) {
      const doc = await this.col.doc(id).get()
      if (doc.exists) out.push(docToEntry(doc.id, doc.data()!))
    }
    return out
  }

  async getEmails(ids: string[]): Promise<Record<string, string>> {
    const map: Record<string, string> = {}
    for (const id of ids) {
      const doc = await this.col.doc(id).get()
      if (doc.exists) map[id] = doc.data()!.email
    }
    return map
  }
}
