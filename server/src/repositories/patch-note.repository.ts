import type { PatchNote, PatchNoteStatus } from '@riftbound/shared'
import { db } from '../config/firebase'
import { FieldValue } from 'firebase-admin/firestore'

function toNote(id: string, d: FirebaseFirestore.DocumentData): PatchNote {
  return {
    id,
    title: d.title ?? '',
    version: d.version ?? '',
    body: d.body ?? '',
    status: (d.status as PatchNoteStatus) ?? 'draft',
    publishedAt: d.publishedAt?.toDate() ?? null,
    createdAt: d.createdAt?.toDate() ?? new Date(),
    updatedAt: d.updatedAt?.toDate() ?? new Date(),
  }
}

export class PatchNoteRepository {
  private readonly col = db.collection('patchNotes')

  async list(): Promise<PatchNote[]> {
    const snap = await this.col.orderBy('createdAt', 'desc').limit(200).get()
    return snap.docs.map((d) => toNote(d.id, d.data()))
  }

  async published(): Promise<PatchNote[]> {
    const all = await this.list()
    return all
      .filter((n) => n.status === 'published')
      .sort((a, b) => (b.publishedAt?.getTime() ?? 0) - (a.publishedAt?.getTime() ?? 0))
  }

  async create(input: Pick<PatchNote, 'title' | 'version' | 'body' | 'status'>): Promise<PatchNote> {
    const now = FieldValue.serverTimestamp()
    const ref = await this.col.add({
      title: input.title, version: input.version, body: input.body, status: input.status,
      publishedAt: input.status === 'published' ? now : null,
      createdAt: now, updatedAt: now,
    })
    return toNote(ref.id, (await ref.get()).data()!)
  }

  async update(id: string, patch: Partial<Pick<PatchNote, 'title' | 'version' | 'body' | 'status'>>): Promise<PatchNote | null> {
    const ref = this.col.doc(id)
    const snap = await ref.get()
    if (!snap.exists) return null
    const wasPublished = snap.data()!.status === 'published'
    const update: Record<string, unknown> = { ...patch, updatedAt: FieldValue.serverTimestamp() }
    if (patch.status === 'published' && !wasPublished) update.publishedAt = FieldValue.serverTimestamp()
    if (patch.status === 'draft') update.publishedAt = null
    await ref.update(update)
    return toNote(id, (await ref.get()).data()!)
  }

  async remove(id: string): Promise<void> {
    await this.col.doc(id).delete()
  }
}
