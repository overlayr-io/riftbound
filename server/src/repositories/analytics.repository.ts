import type { GameMode } from '@riftbound/shared'
import { db } from '../config/firebase'

export interface RawUser {
  createdAt: Date
  lastSeenAt: Date | null
}

export interface RawGame {
  createdAt: Date
  endedAt: Date | null
  deletedAt: Date | null
  mode: GameMode
  playerIds: string[]
}

const SCAN_LIMIT = 5000

export class AnalyticsRepository {
  async users(): Promise<RawUser[]> {
    const snap = await db.collection('users').limit(SCAN_LIMIT).get()
    return snap.docs.map((d) => {
      const x = d.data()
      return {
        createdAt: x.createdAt?.toDate() ?? new Date(),
        lastSeenAt: x.lastSeenAt?.toDate() ?? null,
      }
    })
  }

  async games(): Promise<RawGame[]> {
    const snap = await db.collection('games').limit(SCAN_LIMIT).get()
    return snap.docs.map((d) => {
      const x = d.data()
      return {
        createdAt: x.createdAt?.toDate() ?? new Date(),
        endedAt: x.endedAt?.toDate() ?? null,
        deletedAt: x.deletedAt?.toDate() ?? null,
        mode: (x.mode as GameMode) ?? 'dual',
        playerIds: x.playerIds ?? [],
      }
    })
  }

  async countUsers(): Promise<number> {
    const agg = await db.collection('users').count().get()
    return agg.data().count
  }
}
