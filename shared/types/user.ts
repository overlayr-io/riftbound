import type { Role } from './rbac'

export type UserStatus = 'active' | 'suspended' | 'banned'

export type BetaAccess = 'none' | 'invited' | 'waitlisted' | 'granted'

export interface User {
  uid: string
  email: string | null
  displayName: string | null
  /** Vrai pour les comptes joueurs créés via signInAnonymously. */
  isAnonymous: boolean
  /** Rôle admin (custom claim). Absent/null = joueur normal. */
  role: Role | null
  status: UserStatus
  betaAccess: BetaAccess
  /** Modération : fin de suspension temporaire (null = pas suspendu temporairement). */
  suspendedUntil: Date | null
  suspendReason: string | null
  createdAt: Date
  lastSeenAt: Date | null
  deletedAt: Date | null
}
