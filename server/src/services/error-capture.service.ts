import type { ErrorLogEntry } from '@riftbound/shared'
import { ErrorLogRepository, type ErrorWriteInput } from '../repositories/error-log.repository'

/**
 * Capture d'erreurs bridée pour rester sous le quota Firestore Spark
 * (20 000 writes/jour) :
 *  - dédup : 1 écriture/min par signature ;
 *  - plafond global quotidien (300) ;
 *  - rétention 30 j (purge opportuniste).
 */
const DEDUP_MS = 60_000
const MAX_PER_DAY = 300

const lastBySig = new Map<string, number>()
let dayCount = 0
let dayStart = Date.now()

function shouldCapture(signature: string): boolean {
  const now = Date.now()
  if (now - dayStart > 24 * 60 * 60 * 1000) { dayCount = 0; dayStart = now }
  if (dayCount >= MAX_PER_DAY) return false
  const last = lastBySig.get(signature) ?? 0
  if (now - last < DEDUP_MS) return false
  lastBySig.set(signature, now)
  dayCount++
  return true
}

export class ErrorCaptureService {
  constructor(private readonly repo: ErrorLogRepository) {}

  async capture(input: ErrorWriteInput): Promise<void> {
    const signature = `${input.source}:${input.statusCode}:${input.message.slice(0, 80)}`
    if (!shouldCapture(signature)) return
    try {
      await this.repo.add(input)
      if (dayCount % 50 === 0) await this.repo.purgeOld().catch(() => {})
    } catch { /* ne jamais faire échouer la requête à cause du logging */ }
  }

  list(limit?: number): Promise<ErrorLogEntry[]> {
    return this.repo.list(limit)
  }
}

export const errorCaptureService = new ErrorCaptureService(new ErrorLogRepository())
