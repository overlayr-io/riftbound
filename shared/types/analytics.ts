import type { GameMode } from './game'

/** Point d'une série temporelle journalière. date = 'YYYY-MM-DD'. */
export interface MetricPoint {
  date: string
  value: number
}

export interface ModeBreakdown {
  mode: GameMode
  count: number
}

/** Funnel signup → 1ère partie → partie terminée (comptes d'utilisateurs distincts). */
export interface FunnelData {
  signedUp: number
  playedFirstGame: number
  completedGame: number
}

/**
 * Rétention par cohorte d'inscription. Approximée via lastSeenAt
 * (un seul timestamp d'activité disponible aujourd'hui) : retainedJN =
 * utilisateurs de la cohorte encore actifs au moins N jours après l'inscription.
 */
export interface RetentionCohort {
  cohort: string // 'YYYY-MM-DD' (jour d'inscription)
  size: number
  d1: number
  d7: number
  d30: number
}

export interface DashboardMetrics {
  generatedAt: string
  rangeDays: number
  totals: { users: number; games: number; activeGames: number }
  active: { dau: number; wau: number; mau: number }
  newSignups: number
  signupsPerDay: MetricPoint[]
  gamesCreatedPerDay: MetricPoint[]
  gamesEndedPerDay: MetricPoint[]
  gamesAbandonedPerDay: MetricPoint[]
  modeBreakdown: ModeBreakdown[]
  abandonRate: number // 0..1
  avgGameDurationMs: number | null
  funnel: FunnelData
  retention: RetentionCohort[]
}

export interface SystemHealth {
  env: 'emulator' | 'prod'
  uptimeSec: number
  activeGames: number
  totalUsers: number
  requestCount: number
  errorCount: number
  errorRate: number // 0..1
  avgLatencyMs: number | null
  p95LatencyMs: number | null
  // Placeholders — nécessitent une instrumentation dédiée.
  rtdbConnections: number | null
  firebaseQuota: number | null
  matchmakingWaitMs: number | null
}

export interface RevenueMetrics {
  enabled: boolean
  note: string
  mrr: number | null
  arpu: number | null
  payingUsers: number | null
}
