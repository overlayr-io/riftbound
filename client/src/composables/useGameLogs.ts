import { ref } from 'vue'
import { collection, query, orderBy, limit, onSnapshot, addDoc, serverTimestamp, type Unsubscribe } from 'firebase/firestore'
import type { GameLog } from '@riftbound/shared'
import { firestore } from '@/firebase'
import { gameApi } from '@/services/api'

export function useGameLogs(gameId: () => string | null) {
  const logs = ref<GameLog[]>([])
  const loading = ref(false)

  // ── Remote player: one-time fetch ─────────────────────────────────────────────
  async function fetchLogs() {
    const gId = gameId()
    if (!gId) return
    loading.value = true
    try {
      logs.value = await gameApi.getLogs(gId)
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
      logs.value = snap.docs.map(d => {
        const data = d.data()
        return {
          logId: d.id,
          playerId: data.playerId ?? null,
          description: data.description ?? '',
          createdAt: data.createdAt?.toDate() ?? null,
        } as GameLog
      })
      loading.value = false
    })
  }

  function unsubscribe() {
    unsub?.()
    unsub = null
  }

  async function logAction(
    action: { type: string },
    playerId: string,
    playerNames: Record<string, { name: string }>,
  ) {
    const gId = gameId()
    if (!gId) return
    const playerName = playerNames[playerId]?.name ?? playerId.slice(0, 6)
    const description = `${playerName} a effectué une action`
    try {
      await addDoc(collection(firestore, 'games', gId, 'logs'), {
        playerId,
        description,
        createdAt: serverTimestamp(),
      })
    } catch {
      // non-critical
    }
  }

  return { logs, loading, fetchLogs, subscribe, unsubscribe, logAction }
}
