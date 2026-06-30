import { ref } from 'vue'
import { collection, query, orderBy, limit, onSnapshot, type Unsubscribe } from 'firebase/firestore'
import type { GameLog } from '@riftbound/shared'
import { firestore } from '@/firebase'
import { gameApi } from '@/services/api'

export function useGameLogs(gameId: () => string | null, roundId: () => string | null) {
  const logs = ref<GameLog[]>([])
  const loading = ref(false)

  function filterByRound(all: GameLog[]): GameLog[] {
    const rid = roundId()
    return rid ? all.filter(l => l.roundId === rid) : all
  }

  // ── Remote player: one-time fetch ─────────────────────────────────────────────
  async function fetchLogs() {
    const gId = gameId()
    if (!gId) return
    loading.value = true
    try {
      const all = await gameApi.getLogs(gId)
      logs.value = filterByRound(all)
    } finally {
      loading.value = false
    }
  }

  // ── Local player: reactive subscription ───────────────────────────────────────
  let unsub: Unsubscribe | null = null

  function subscribe() {
    const gId = gameId()
    if (!gId || unsub) return
    loading.value = true
    const q = query(
      collection(firestore, 'games', gId, 'logs'),
      orderBy('createdAt', 'asc'),
      limit(200),
    )
    unsub = onSnapshot(q, snap => {
      const all = snap.docs.map(d => {
        const data = d.data()
        return {
          logId: d.id,
          playerId: data.playerId ?? null,
          description: data.description ?? '',
          roundId: data.roundId ?? null,
          createdAt: data.createdAt?.toDate() ?? null,
        } as GameLog
      })
      logs.value = filterByRound(all)
      loading.value = false
    })
  }

  function unsubscribe() {
    unsub?.()
    unsub = null
  }

  return { logs, loading, fetchLogs, subscribe, unsubscribe }
}
