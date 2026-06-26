import type { Announcement, AnnouncementLevel, Role } from '@riftbound/shared'
import { db } from '../config/firebase'
import { FieldValue, Timestamp } from 'firebase-admin/firestore'

function toAnn(id: string, d: FirebaseFirestore.DocumentData): Announcement {
  return {
    id,
    message: d.message,
    level: (d.level as AnnouncementLevel) ?? 'info',
    startsAt: d.startsAt?.toDate() ?? null,
    endsAt: d.endsAt?.toDate() ?? null,
    targetRoles: (d.targetRoles as Role[] | null) ?? null,
  }
}

export class AnnouncementRepository {
  private readonly col = db.collection('announcements')

  async list(): Promise<Announcement[]> {
    const snap = await this.col.orderBy('createdAt', 'desc').limit(100).get()
    return snap.docs.map((d) => toAnn(d.id, d.data()))
  }

  /** Annonces actives maintenant (fenêtre startsAt/endsAt). */
  async active(): Promise<Announcement[]> {
    const all = await this.list()
    const now = Date.now()
    return all.filter((a) =>
      (!a.startsAt || a.startsAt.getTime() <= now) &&
      (!a.endsAt || a.endsAt.getTime() >= now))
  }

  async create(input: Omit<Announcement, 'id'>): Promise<Announcement> {
    const ref = await this.col.add({
      message: input.message,
      level: input.level,
      startsAt: input.startsAt ? Timestamp.fromDate(input.startsAt) : null,
      endsAt: input.endsAt ? Timestamp.fromDate(input.endsAt) : null,
      targetRoles: input.targetRoles,
      createdAt: FieldValue.serverTimestamp(),
    })
    const doc = await ref.get()
    return toAnn(ref.id, doc.data()!)
  }

  async remove(id: string): Promise<void> {
    await this.col.doc(id).delete()
  }
}
