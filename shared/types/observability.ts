// ── Capture d'erreurs (collection Firestore bridée) ──────────────────────────
export type ErrorSource = 'server' | 'client'

export interface ErrorLogEntry {
  id: string
  source: ErrorSource
  message: string
  stack: string | null
  path: string | null
  method: string | null
  statusCode: number | null
  uid: string | null
  clientVersion: string | null
  count: number       // occurrences regroupées sous cette signature
  at: Date
}

// ── Bug reports / feedback ────────────────────────────────────────────────────
import type { BugReportSeverity, BugReportStatus } from './admin'

export interface BugReportInput {
  message: string
  severity: BugReportSeverity
  gameId?: string | null
  screenshotUrl?: string | null
  clientVersion: string
}

export interface BugReportUpdate {
  status?: BugReportStatus
  assignedTo?: string | null
}

// ── RGPD ──────────────────────────────────────────────────────────────────────
export interface ConsentRecord {
  uid: string
  version: string
  acceptedAt: Date
}

/** Export RGPD des données d'un utilisateur (téléchargé en JSON). */
export interface UserDataExport {
  generatedAt: string
  user: unknown
  games: unknown[]
  bugReports: unknown[]
  messageReports: unknown[]
}
