import type { User, Role, UserStatus, BetaAccess } from '@riftbound/shared'
import { db } from '../config/firebase'
import { FieldValue } from 'firebase-admin/firestore'

function docToUser(id: string, data: FirebaseFirestore.DocumentData): User {
  return {
    uid: id,
    email: data.email ?? null,
    displayName: data.displayName ?? null,
    isAnonymous: data.isAnonymous ?? true,
    role: data.role ?? null,
    status: (data.status as UserStatus) ?? 'active',
    betaAccess: (data.betaAccess as BetaAccess) ?? 'none',
    createdAt: data.createdAt?.toDate() ?? new Date(),
    lastSeenAt: data.lastSeenAt?.toDate() ?? null,
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

  /**
   * Provisionne (ou rafraîchit) le doc utilisateur à la connexion.
   * N'écrase JAMAIS role / status / betaAccess (gérés par l'admin) :
   * ces champs ne sont posés qu'à la création.
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
        createdAt: now,
        lastSeenAt: now,
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
}
