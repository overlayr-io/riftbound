import type { Invite, InviteStatus } from '@riftbound/shared'
import { db } from '../config/firebase'
import { FieldValue, Timestamp } from 'firebase-admin/firestore'

function docToInvite(code: string, data: FirebaseFirestore.DocumentData): Invite {
  return {
    code,
    createdBy: data.createdBy,
    createdAt: data.createdAt?.toDate() ?? new Date(),
    maxUses: data.maxUses ?? 1,
    uses: data.uses ?? 0,
    usedBy: data.usedBy ?? [],
    expiresAt: data.expiresAt?.toDate() ?? null,
    status: (data.status as InviteStatus) ?? 'active',
  }
}

export type RedeemOutcome =
  | { ok: true }
  | { ok: false; reason: 'NOT_FOUND' | 'REVOKED' | 'EXPIRED' | 'EXHAUSTED' | 'ALREADY_USED' }

export class InviteRepository {
  private readonly col = db.collection('invites')

  async create(input: { code: string; createdBy: string; maxUses: number; expiresAt: Date | null }): Promise<Invite> {
    const ref = this.col.doc(input.code)
    await ref.set({
      createdBy: input.createdBy,
      createdAt: FieldValue.serverTimestamp(),
      maxUses: input.maxUses,
      uses: 0,
      usedBy: [],
      expiresAt: input.expiresAt ? Timestamp.fromDate(input.expiresAt) : null,
      status: 'active' as InviteStatus,
    })
    const doc = await ref.get()
    return docToInvite(input.code, doc.data()!)
  }

  async list(scanLimit = 200): Promise<Invite[]> {
    const snap = await this.col.orderBy('createdAt', 'desc').limit(scanLimit).get()
    return snap.docs.map((d) => docToInvite(d.id, d.data()))
  }

  async findByCode(code: string): Promise<Invite | null> {
    const doc = await this.col.doc(code).get()
    if (!doc.exists) return null
    return docToInvite(doc.id, doc.data()!)
  }

  async revoke(code: string): Promise<boolean> {
    const ref = this.col.doc(code)
    const doc = await ref.get()
    if (!doc.exists) return false
    await ref.update({ status: 'revoked' as InviteStatus })
    return true
  }

  /** Consommation atomique d'un code par un utilisateur. */
  async redeem(code: string, uid: string): Promise<RedeemOutcome> {
    const ref = this.col.doc(code)
    return db.runTransaction(async (tx): Promise<RedeemOutcome> => {
      const doc = await tx.get(ref)
      if (!doc.exists) return { ok: false, reason: 'NOT_FOUND' }
      const inv = docToInvite(code, doc.data()!)
      if (inv.status === 'revoked') return { ok: false, reason: 'REVOKED' }
      if (inv.expiresAt && inv.expiresAt.getTime() < Date.now()) return { ok: false, reason: 'EXPIRED' }
      if (inv.usedBy.includes(uid)) return { ok: false, reason: 'ALREADY_USED' }
      if (inv.uses >= inv.maxUses) return { ok: false, reason: 'EXHAUSTED' }

      const newUses = inv.uses + 1
      tx.update(ref, {
        uses: newUses,
        usedBy: FieldValue.arrayUnion(uid),
        status: newUses >= inv.maxUses ? ('expired' as InviteStatus) : inv.status,
      })
      return { ok: true }
    })
  }
}
