/**
 * Compteurs in-process (requêtes / erreurs / latence) pour la santé système.
 * Léger, sans dépendance ; remis à zéro au redémarrage du process.
 */
const MAX_SAMPLES = 500

class Metrics {
  readonly startedAt = Date.now()
  requestCount = 0
  errorCount = 0
  private latencies: number[] = []

  record(latencyMs: number, isError: boolean): void {
    this.requestCount++
    if (isError) this.errorCount++
    this.latencies.push(latencyMs)
    if (this.latencies.length > MAX_SAMPLES) this.latencies.shift()
  }

  snapshot() {
    const sorted = [...this.latencies].sort((a, b) => a - b)
    const avg = sorted.length ? sorted.reduce((s, v) => s + v, 0) / sorted.length : null
    const p95 = sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))] : null
    return {
      uptimeSec: Math.floor((Date.now() - this.startedAt) / 1000),
      requestCount: this.requestCount,
      errorCount: this.errorCount,
      errorRate: this.requestCount ? this.errorCount / this.requestCount : 0,
      avgLatencyMs: avg !== null ? Math.round(avg) : null,
      p95LatencyMs: p95 ?? null,
    }
  }
}

export const metrics = new Metrics()
