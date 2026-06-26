import type { User, Role, UserStatus, BetaAccess } from '@riftbound/shared'
import { db } from '../config/firebase'
import { FieldValue, Timestamp } from 'firebase-admin/firestore'

function docToUser(id: string, data: FirebaseFirestore.DocumentData): User {
  return {
    uid: id,
    email: data.email ?? null,
    displayName: data.displayName ?? null,
    isAnonymous: data.isAnonymous ?? true,
    role: data.role ?? null,
    status: (data.status as UserStatus) ?? 'active',
    betaAccess: (data.betaAccess as BetaAccess) ?? 'none',
    suspendedUntil: data.suspendedUntil?.toDate() ?? null,
    suspendReason: data.suspendReason ?? null,
    muted: data.muted ?? false,
    createdAt: data.createdAt?.toDate() ?? new Date(),
    lastSeenAt: data.lastSeenAt?.toDate() ?? null,
    deletedAt: data.deletedAt?.toDate() ?? null,
  }
}

export interface UpsertUserInput {
  uid: string
  email: string | null
  displayName: string | null
  isAnonymous: boolean
}

export class UserRepository {
  private readonly col = db.collection('users')

  async findById(uid: string): Promise<User | null> {
    const doc = await this.col.doc(uid).get()
    if (!doc.exists) return null
    return docToUser(doc.id, doc.data()!)
  }

  /** Scanne les N derniers utilisateurs vus (tri serveur ; filtre/recherche en service). */
  async list(scanLimit = 300): Promise<User[]> {
    const snap = await this.col.orderBy('lastSeenAt', 'desc').limit(scanLimit).get()
    return snap.docs.map((d) => docToUser(d.id, d.data()))
  }

  /**
   * Provisionne (ou rafraîchit) le doc utilisateur à la connexion.
   * N'écrase JAMAIS role / status / betaAccess / modération (gérés par l'admin).
   */
  async upsertOnAuth(input: UpsertUserInput): Promise<User> {
    const ref = this.col.doc(input.uid)
    const snap = await ref.get()
    const now = FieldValue.serverTimestamp()

    if (!snap.exists) {
      await ref.set({
        email: input.email,
        displayName: input.displayName,
        isAnonymous: input.isAnonymous,
        role: null,
        status: 'active',
        betaAccess: 'none',
        suspendedUntil: null,
        suspendReason: null,
        createdAt: now,
        lastSeenAt: now,
        deletedAt: null,
      })
    } else {
      await ref.update({
        email: input.email,
        displayName: input.displayName,
        isAnonymous: input.isAnonymous,
        lastSeenAt: now,
      })
    }

    const doc = await ref.get()
    return docToUser(ref.id, doc.data()!)
  }

  async setRole(uid: string, role: Role | null): Promise<void> {
    await this.col.doc(uid).set(
      { role, updatedAt: FieldValue.serverTimestamp() },
      { merge: true },
    )
  }

  async setLastSeen(uid: string): Promise<void> {
    await this.col.doc(uid).set(
      { lastSeenAt: FieldValue.serverTimestamp() },
      { merge: true },
    )
  }

  // ── Modération ────────────────────────────────────────────────────────────
  async suspend(uid: string, until: Date, reason: string): Promise<void> {
    await this.col.doc(uid).set({
      status: 'suspended' as UserStatus,
      suspendedUntil: Timestamp.fromDate(until),
      suspendReason: reason,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true })
  }

  async ban(uid: string, reason: string): Promise<void> {
    await this.col.doc(uid).set({
      status: 'banned' as UserStatus,
      suspendedUntil: null,
      suspendReason: reason,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true })
  }

  async reactivate(uid: string): Promise<void> {
    await this.col.doc(uid).set({
      status: 'active' as UserStatus,
      suspendedUntil: null,
      suspendReason: null,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true })
  }

  async setDisplayName(uid: string, displayName: string): Promise<void> {
    await this.col.doc(uid).set(
      { displayName, updatedAt: FieldValue.serverTimestamp() },
      { merge: true },
    )
  }

  async setMuted(uid: string, muted: boolean): Promise<void> {
    await this.col.doc(uid).set(
      { muted, updatedAt: FieldValue.serverTimestamp() },
      { merge: true },
    )
  }

  async isMuted(uid: string): Promise<boolean> {
    const doc = await this.col.doc(uid).get()
    return doc.exists ? (doc.data()!.muted ?? false) : false
  }

  async setBetaAccess(uid: string, betaAccess: BetaAccess): Promise<void> {
    await this.col.doc(uid).set(
      { betaAccess, updatedAt: FieldValue.serverTimestamp() },
      { merge: true },
    )
  }

  async softDelete(uid: string): Promise<void> {
    await this.col.doc(uid).set({
      status: 'banned' as UserStatus,
      deletedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true })
  }

  async hardDelete(uid: string): Promise<void> {
    await this.col.doc(uid).delete()
  }

  /** RGPD — anonymisation : retire les données personnelles, conserve l'uid (intégrité référentielle). */
  async anonymize(uid: string): Promise<void> {
    await this.col.doc(uid).set({
      email: null,
      displayName: '(anonymisé)',
      status: 'banned' as UserStatus,
      anonymizedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true })
  }

  /** RGPD — journal de consentement (stocké sur le profil). */
  async setConsent(uid: string, version: string): Promise<void> {
    await this.col.doc(uid).set({
      consentVersion: version,
      consentAt: FieldValue.serverTimestamp(),
    }, { merge: true })
  }
}
