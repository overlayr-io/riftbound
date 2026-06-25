import type { Role } from './rbac'

/**
 * Audit log — écrit pour CHAQUE action admin mutante.
 * `before` / `after` sont des snapshots libres (JSON) de la cible.
 */
export interface AuditLogEntry {
  id: string
  actorUid: string
  actorRole: Role | null
  action: string
  targetType: string
  targetId: string | null
  before: unknown | null
  after: unknown | null
  ip: string | null
  at: Date
}

// ── Accès beta ────────────────────────────────────────────────────────────────

export type InviteStatus = 'active' | 'revoked' | 'expired'

export interface Invite {
  code: string
  createdBy: string
  createdAt: Date
  maxUses: number
  uses: number
  usedBy: string[]
  expiresAt: Date | null
  status: InviteStatus
}

export type WaitlistStatus = 'pending' | 'approved' | 'rejected'

export interface WaitlistEntry {
  id: string
  email: string
  requestedAt: Date
  source: string
  status: WaitlistStatus
  decidedBy: string | null
  decidedAt: Date | null
  note: string | null
}

/**
 * Phase d'accès globale au jeu — contrôle si l'inscription exige une invite,
 * passe par la waitlist, ou est libre.
 */
export type BetaPhase = 'beta_closed' | 'beta_open' | 'public'

// ── Ops & contenu ─────────────────────────────────────────────────────────────

export interface FeatureFlag {
  key: string
  enabled: boolean
  rolloutPercent: number
  description: string
}

export interface MaintenanceState {
  enabled: boolean
  message: string
  allowRoles: Role[]
}

export type AnnouncementLevel = 'info' | 'warning' | 'critical'

export interface Announcement {
  id: string
  message: string
  level: AnnouncementLevel
  startsAt: Date | null
  endsAt: Date | null
  targetRoles: Role[] | null
}

// ── Bug reports / feedback ────────────────────────────────────────────────────

export type BugReportSeverity = 'low' | 'medium' | 'high' | 'critical'
export type BugReportStatus = 'open' | 'triaged' | 'in_progress' | 'resolved' | 'closed'

export interface BugReport {
  id: string
  reporterUid: string
  gameId: string | null
  message: string
  screenshotUrl: string | null
  clientVersion: string
  severity: BugReportSeverity
  status: BugReportStatus
  assignedTo: string | null
  createdAt: Date
}

// ── DTO d'API pour la gestion des rôles ──────────────────────────────────────

export interface AssignRolePayload {
  uid: string
  role: Role | null
}

export interface AuditLogFilter {
  actorUid?: string
  action?: string
  targetType?: string
  targetId?: string
  limit?: number
}
