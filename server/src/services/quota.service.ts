import * as admin from 'firebase-admin'
import type {
  FirebaseQuotaMetrics, QuotaGauge,
  FirestoreQuota, RtdbQuota, GamesQuotaEstimate,
} from '@riftbound/shared'
import { db, rtdb } from '../config/firebase'
import { env } from '../config/env'

// ─── Firebase Spark plan hard limits ───────────────────────────────────────
const SPARK = {
  firestoreReadsPerDay:    50_000,
  firestoreWritesPerDay:   20_000,
  firestoreDeletesPerDay:  20_000,
  firestoreStorageBytes:   1 * 1024 ** 3, // 1 GiB
  rtdbStorageBytes:        1 * 1024 ** 3, // 1 GiB
  rtdbDownloadPerMonth:    10 * 1024 ** 3, // 10 GiB
  rtdbConnections:         100,
}

// ─── Cloud Monitoring REST helpers ─────────────────────────────────────────

async function getGcpToken(): Promise<string | null> {
  try {
    const cred = admin.app().options.credential
    if (!cred) return null
    const t = await cred.getAccessToken()
    return t.access_token
  } catch {
    return null
  }
}

/** Sum all point values across all time series for the last `hours` hours. */
async function fetchMonitoringSum(
  token: string,
  projectId: string,
  metricType: string,
  hours = 24,
): Promise<number | null> {
  const now = new Date()
  const start = new Date(now.getTime() - hours * 3_600_000)
  const params = new URLSearchParams({
    filter: `metric.type="${metricType}"`,
    'interval.startTime': start.toISOString(),
    'interval.endTime': now.toISOString(),
    'aggregation.alignmentPeriod': `${hours * 3600}s`,
    'aggregation.perSeriesAligner': 'ALIGN_SUM',
    'aggregation.crossSeriesReducer': 'REDUCE_SUM',
    'aggregation.groupByFields': '',
  })
  try {
    const res = await fetch(
      `https://monitoring.googleapis.com/v3/projects/${projectId}/timeSeries?${params}`,
      { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(8_000) },
    )
    if (!res.ok) return null
    const json = await res.json() as { timeSeries?: Array<{ points?: Array<{ value?: { int64Value?: string | number; doubleValue?: number } }> }> }
    let total = 0
    for (const ts of json.timeSeries ?? []) {
      for (const pt of ts.points ?? []) {
        total += Number(pt.value?.int64Value ?? pt.value?.doubleValue ?? 0)
      }
    }
    return total
  } catch {
    return null
  }
}

function gauge(used: number, limit: number, label: string, unit: string): QuotaGauge {
  return { used, limit, pct: Math.min(100, Math.round((used / limit) * 100)), label, unit }
}

function fmtBytes(b: number): string {
  if (b >= 1024 ** 3) return `${(b / 1024 ** 3).toFixed(2)} GiB`
  if (b >= 1024 ** 2) return `${(b / 1024 ** 2).toFixed(1)} MiB`
  if (b >= 1024) return `${(b / 1024).toFixed(1)} KiB`
  return `${b} B`
}

// ─── RTDB size estimation ───────────────────────────────────────────────────

async function estimateRtdbBytes(): Promise<number | null> {
  if (!rtdb) return null
  try {
    const snap = await rtdb.ref('/').once('value')
    const json = JSON.stringify(snap.val() ?? {})
    return Buffer.byteLength(json, 'utf8')
  } catch {
    return null
  }
}

// ─── Firestore collection sizes ─────────────────────────────────────────────

async function firestoreDocCount(): Promise<number> {
  const collections = ['users', 'games', 'lobbies', 'chat', 'spectators']
  const counts = await Promise.all(
    collections.map((c) =>
      db.collection(c).count().get()
        .then((s) => s.data().count)
        .catch(() => 0),
    ),
  )
  return counts.reduce((a, b) => a + b, 0)
}

async function firestoreStorageEstimate(): Promise<number> {
  // Rough estimate: sample 50 docs per main collection, average doc size × count.
  const collections = ['users', 'games', 'lobbies']
  let total = 0
  for (const col of collections) {
    const [countSnap, sampleSnap] = await Promise.all([
      db.collection(col).count().get().catch(() => null),
      db.collection(col).limit(50).get().catch(() => null),
    ])
    if (!countSnap || !sampleSnap || sampleSnap.empty) continue
    const count = countSnap.data().count
    const sampleBytes = sampleSnap.docs.reduce(
      (sum, d) => sum + Buffer.byteLength(JSON.stringify(d.data()), 'utf8'),
      0,
    )
    const avgBytes = sampleBytes / sampleSnap.size
    total += avgBytes * count
  }
  return Math.round(total)
}

// ─── Main service ────────────────────────────────────────────────────────────

export class QuotaService {
  async get(totalGames: number, gamesCreatedToday: number): Promise<FirebaseQuotaMetrics> {
    const token = await getGcpToken()
    const projectId = env.FIREBASE_PROJECT_ID
    let source: 'cloud-monitoring' | 'estimated' = 'estimated'

    // Try Cloud Monitoring for Firestore operation counts
    let readsToday = 0
    let writesToday = 0
    let deletesToday = 0
    let rtdbStorageCloud: number | null = null
    let rtdbDownloadCloud: number | null = null

    if (token) {
      const [r, w, d, rtdbSt, rtdbDl] = await Promise.all([
        fetchMonitoringSum(token, projectId, 'firestore.googleapis.com/document/read_count'),
        fetchMonitoringSum(token, projectId, 'firestore.googleapis.com/document/write_count'),
        fetchMonitoringSum(token, projectId, 'firestore.googleapis.com/document/delete_count'),
        // RTDB storage in bytes (monthly cumulative — 30d window)
        fetchMonitoringSum(token, projectId, 'firebasedatabase.googleapis.com/storage/used_bytes', 1),
        // RTDB download bytes this month
        fetchMonitoringSum(token, projectId, 'firebasedatabase.googleapis.com/network/downloaded_bytes_count', 720),
      ])

      if (r !== null || w !== null || d !== null) source = 'cloud-monitoring'
      readsToday  = r  ?? 0
      writesToday = w  ?? 0
      deletesToday = d ?? 0
      rtdbStorageCloud = rtdbSt
      rtdbDownloadCloud = rtdbDl
    }

    // Firestore storage — always estimated (Cloud Monitoring requires extra perms)
    const [docCount, fsStorageEst, rtdbSizeEst] = await Promise.all([
      firestoreDocCount(),
      firestoreStorageEstimate(),
      estimateRtdbBytes(),
    ])

    const fsStorageBytes = fsStorageEst

    // ── Firestore quota ──
    const firestore: FirestoreQuota = {
      readsToday:  gauge(readsToday,   SPARK.firestoreReadsPerDay,    'Lectures Firestore / jour',    'ops'),
      writesToday: gauge(writesToday,  SPARK.firestoreWritesPerDay,   'Écritures Firestore / jour',   'ops'),
      deletesToday: gauge(deletesToday, SPARK.firestoreDeletesPerDay, 'Suppressions Firestore / jour', 'ops'),
      storageBytes: gauge(fsStorageBytes, SPARK.firestoreStorageBytes, 'Stockage Firestore (estimé)', fmtBytes(fsStorageBytes)),
      documentCount: docCount,
    }

    // ── RTDB quota ──
    const rtdbStorageBytes = rtdbStorageCloud ?? rtdbSizeEst ?? 0
    const rtdbDownloadBytes = rtdbDownloadCloud ?? 0

    const rtdbQuota: RtdbQuota = {
      storageBytes:      gauge(rtdbStorageBytes,  SPARK.rtdbStorageBytes,      'Stockage RTDB',            fmtBytes(rtdbStorageBytes)),
      downloadThisMonth: gauge(rtdbDownloadBytes, SPARK.rtdbDownloadPerMonth,  'Téléchargements RTDB / mois', fmtBytes(rtdbDownloadBytes)),
      connections: null, // pas exposé sans Cloud Monitoring Connections metric
    }

    // ── Games estimate ──
    // avg = metrics from today / games played today (if known from Cloud Monitoring)
    const avgReadsPerGame  = gamesCreatedToday > 0 && source === 'cloud-monitoring'
      ? Math.round(readsToday / gamesCreatedToday)
      : null
    const avgWritesPerGame = gamesCreatedToday > 0 && source === 'cloud-monitoring'
      ? Math.round(writesToday / gamesCreatedToday)
      : null

    const remainingReads  = SPARK.firestoreReadsPerDay  - readsToday
    const remainingWrites = SPARK.firestoreWritesPerDay - writesToday

    const gamesRemainingByReads  = avgReadsPerGame  && avgReadsPerGame  > 0 ? Math.floor(remainingReads  / avgReadsPerGame)  : null
    const gamesRemainingByWrites = avgWritesPerGame && avgWritesPerGame > 0 ? Math.floor(remainingWrites / avgWritesPerGame) : null

    let gamesRemainingMin: number | null = null
    if (gamesRemainingByReads !== null && gamesRemainingByWrites !== null)
      gamesRemainingMin = Math.min(gamesRemainingByReads, gamesRemainingByWrites)
    else if (gamesRemainingByReads !== null) gamesRemainingMin = gamesRemainingByReads
    else if (gamesRemainingByWrites !== null) gamesRemainingMin = gamesRemainingByWrites

    const games: GamesQuotaEstimate = {
      totalGames,
      totalGamesToday: gamesCreatedToday,
      avgReadsPerGame,
      avgWritesPerGame,
      gamesRemainingByReads,
      gamesRemainingByWrites,
      gamesRemainingMin,
    }

    return {
      plan: 'spark',
      generatedAt: new Date().toISOString(),
      source,
      firestore,
      rtdb: rtdbQuota,
      games,
    }
  }
}
