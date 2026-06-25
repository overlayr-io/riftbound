import type {
  DashboardMetrics, SystemHealth, RevenueMetrics, MetricPoint, ModeBreakdown,
  RetentionCohort, GameMode,
} from '@riftbound/shared'
import { AnalyticsRepository, type RawUser, type RawGame } from '../repositories/analytics.repository'
import { metrics } from '../metrics'
import { env } from '../config/env'

const DAY = 24 * 60 * 60 * 1000

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10)
}

/** Série journalière des N derniers jours (clé YYYY-MM-DD → compte). */
function series(dates: Date[], rangeDays: number): MetricPoint[] {
  const counts = new Map<string, number>()
  for (const d of dates) counts.set(dayKey(d), (counts.get(dayKey(d)) ?? 0) + 1)

  const out: MetricPoint[] = []
  const today = new Date()
  for (let i = rangeDays - 1; i >= 0; i--) {
    const day = new Date(today.getTime() - i * DAY)
    const key = dayKey(day)
    out.push({ date: key, value: counts.get(key) ?? 0 })
  }
  return out
}

export class AnalyticsService {
  constructor(private readonly repo: AnalyticsRepository) {}

  async dashboard(rangeDays = 14): Promise<DashboardMetrics> {
    const [users, games] = await Promise.all([this.repo.users(), this.repo.games()])
    const now = Date.now()
    const since = now - rangeDays * DAY

    const activeWithin = (ms: number) =>
      users.filter((u) => u.lastSeenAt && u.lastSeenAt.getTime() >= now - ms).length

    const activeGames = games.filter((g) => !g.endedAt && !g.deletedAt).length
    const abandoned = games.filter((g) => g.deletedAt).length
    const ended = games.filter((g) => g.endedAt && !g.deletedAt)

    const durations = ended
      .map((g) => (g.endedAt!.getTime() - g.createdAt.getTime()))
      .filter((ms) => ms > 0)
    const avgGameDurationMs = durations.length
      ? Math.round(durations.reduce((s, v) => s + v, 0) / durations.length)
      : null

    const modeCounts = new Map<GameMode, number>()
    for (const g of games) modeCounts.set(g.mode, (modeCounts.get(g.mode) ?? 0) + 1)
    const modeBreakdown: ModeBreakdown[] = [...modeCounts.entries()].map(([mode, count]) => ({ mode, count }))

    return {
      generatedAt: new Date().toISOString(),
      rangeDays,
      totals: { users: users.length, games: games.length, activeGames },
      active: { dau: activeWithin(DAY), wau: activeWithin(7 * DAY), mau: activeWithin(30 * DAY) },
      newSignups: users.filter((u) => u.createdAt.getTime() >= since).length,
      signupsPerDay: series(users.map((u) => u.createdAt), rangeDays),
      gamesCreatedPerDay: series(games.map((g) => g.createdAt), rangeDays),
      gamesEndedPerDay: series(ended.map((g) => g.endedAt!), rangeDays),
      gamesAbandonedPerDay: series(games.filter((g) => g.deletedAt).map((g) => g.deletedAt!), rangeDays),
      modeBreakdown,
      abandonRate: games.length ? abandoned / games.length : 0,
      avgGameDurationMs,
      funnel: this.funnel(users, games),
      retention: this.retention(users),
    }
  }

  private funnel(users: RawUser[], games: RawGame[]) {
    const everPlayed = new Set<string>()
    const completed = new Set<string>()
    for (const g of games) {
      for (const uid of g.playerIds) {
        everPlayed.add(uid)
        if (g.endedAt) completed.add(uid)
      }
    }
    return { signedUp: users.length, playedFirstGame: everPlayed.size, completedGame: completed.size }
  }

  private retention(users: RawUser[]): RetentionCohort[] {
    const byCohort = new Map<string, RawUser[]>()
    const now = Date.now()
    for (const u of users) {
      // Cohortes des 14 derniers jours d'inscription.
      if (u.createdAt.getTime() < now - 14 * DAY) continue
      const key = dayKey(u.createdAt)
      if (!byCohort.has(key)) byCohort.set(key, [])
      byCohort.get(key)!.push(u)
    }

    const retainedAt = (cohort: RawUser[], days: number) =>
      cohort.filter((u) => u.lastSeenAt && u.lastSeenAt.getTime() >= u.createdAt.getTime() + days * DAY).length

    return [...byCohort.entries()]
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .map(([cohort, list]) => ({
        cohort,
        size: list.length,
        d1: retainedAt(list, 1),
        d7: retainedAt(list, 7),
        d30: retainedAt(list, 30),
      }))
  }

  async health(): Promise<SystemHealth> {
    const games = await this.repo.games()
    const snap = metrics.snapshot()
    return {
      env: env.USE_EMULATOR ? 'emulator' : 'prod',
      uptimeSec: snap.uptimeSec,
      activeGames: games.filter((g) => !g.endedAt && !g.deletedAt).length,
      totalUsers: await this.repo.countUsers().catch(() => 0),
      requestCount: snap.requestCount,
      errorCount: snap.errorCount,
      errorRate: snap.errorRate,
      avgLatencyMs: snap.avgLatencyMs,
      p95LatencyMs: snap.p95LatencyMs,
      // Placeholders — à instrumenter.
      rtdbConnections: null,
      firebaseQuota: null,
      matchmakingWaitMs: null,
    }
  }

  // Module revenu : placeholder structuré (pas de monétisation aujourd'hui).
  revenue(): RevenueMetrics {
    return { enabled: false, note: 'Monétisation non active — structure prête.', mrr: null, arpu: null, payingUsers: null }
  }
}
