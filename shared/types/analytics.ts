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

/** Une jauge de quota (valeur actuelle vs limite). */
export interface QuotaGauge {
  used: number
  limit: number
  pct: number // 0-100
  label: string
  unit: string
}

export interface FirestoreQuota {
  readsToday: QuotaGauge
  writesToday: QuotaGauge
  deletesToday: QuotaGauge
  storageBytes: QuotaGauge
  documentCount: number
}

export interface RtdbQuota {
  storageBytes: QuotaGauge
  downloadThisMonth: QuotaGauge
  connections: QuotaGauge | null
}

export interface GamesQuotaEstimate {
  totalGames: number
  totalGamesToday: number
  avgReadsPerGame: number | null
  avgWritesPerGame: number | null
  gamesRemainingByReads: number | null
  gamesRemainingByWrites: number | null
  /** Minimum des deux = contrainte la plus serrée */
  gamesRemainingMin: number | null
}

export interface FirebaseQuotaMetrics {
  /** 'spark' = gratuit (limites connues). 'blaze' = pay-as-you-go (pas de quota disjoncteur). */
  plan: 'spark' | 'blaze'
  generatedAt: string
  /** 'cloud-monitoring' si les métriques viennent de l'API GCloud, sinon 'estimated'. */
  source: 'cloud-monitoring' | 'estimated'
  firestore: FirestoreQuota
  rtdb: RtdbQuota
  games: GamesQuotaEstimate
}
