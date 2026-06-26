import type { Role } from './rbac'
import type { UserStatus, BetaAccess } from './user'
import type { GameSummary } from './admin-games'

export interface UserSummary {
  uid: string
  email: string | null
  displayName: string | null
  role: Role | null
  status: UserStatus
  betaAccess: BetaAccess
  isAnonymous: boolean
  suspendedUntil: Date | null
  lastSeenAt: Date | null
  createdAt: Date
}

export interface UserSession {
  /** Placeholder sessions/appareils — alimenté plus tard (Firebase ne les expose pas tous). */
  lastSignInAt: Date | null
  lastRefreshAt: Date | null
  provider: string
}

export interface UserDetail extends UserSummary {
  suspendReason: string | null
  muted: boolean
  deletedAt: Date | null
  games: GameSummary[]
  session: UserSession
}

export interface UsersFilter {
  search?: string
  status?: UserStatus
  role?: Role
  betaAccess?: BetaAccess
  limit?: number
}

// Modération
export interface SuspendPayload {
  durationMs: number
  reason: string
}

export interface SuspensionPreset {
  label: string
  ms: number
}

export const SUSPENSION_PRESETS: SuspensionPreset[] = [
  { label: '1 heure', ms: 60 * 60 * 1000 },
  { label: '24 heures', ms: 24 * 60 * 60 * 1000 },
  { label: '7 jours', ms: 7 * 24 * 60 * 60 * 1000 },
  { label: '30 jours', ms: 30 * 24 * 60 * 60 * 1000 },
]

export interface ImpersonationToken {
  /** Custom token Firebase pour « voir comme ce joueur » (super_admin / players:impersonate). */
  token: string
  targetUid: string
  expiresInfo: string
}
