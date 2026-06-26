import { ref, watch, onUnmounted, computed } from 'vue'
import {
  ref as rtdbRef,
  onValue,
  onDisconnect,
  set,
  serverTimestamp,
  type Unsubscribe,
} from 'firebase/database'
import { rtdb } from '@/firebase'

// Re-register presence whenever the RTDB connection is (re)established
function onRtdbConnected(cb: () => void): Unsubscribe {
  const connRef = rtdbRef(rtdb, '.info/connected')
  return onValue(connRef, snap => {
    if (snap.val() === true) cb()
  })
}

export interface PlayerPresence {
  online: boolean
  lastSeen: number
}

export type PresenceStatus = 'online' | 'disconnected' | 'gone'

export function usePlayerPresence(
  gameId: () => string | null,
  myUid: () => string | null,
  playerIds: () => string[],
) {
  const presences = ref<Record<string, PlayerPresence>>({})
  let unsub: Unsubscribe | null = null
  let unsubConnected: Unsubscribe | null = null

  function subscribe(gId: string) {
    unsub?.()
    const presenceRef = rtdbRef(rtdb, `presence/${gId}`)
    unsub = onValue(presenceRef, snap => {
      presences.value = (snap.val() as Record<string, PlayerPresence>) ?? {}
    })
  }

  async function registerMyPresence(gId: string, uid: string) {
    const myRef = rtdbRef(rtdb, `presence/${gId}/${uid}`)
    // When client disconnects: mark offline immediately server-side
    await onDisconnect(myRef).set({ online: false, lastSeen: serverTimestamp() })
    // Mark as online
    await set(myRef, { online: true, lastSeen: serverTimestamp() })
  }

  const stopWatch = watch(
    [gameId, myUid],
    ([gId, uid]) => {
      unsubConnected?.()
      unsubConnected = null
      if (gId && uid) {
        subscribe(gId)
        // Re-register on every (re)connection so the opponent sees us come back online
        unsubConnected = onRtdbConnected(() => registerMyPresence(gId, uid))
      } else {
        unsub?.()
        unsub = null
      }
    },
    { immediate: true },
  )

  onUnmounted(() => {
    stopWatch()
    unsub?.()
    unsubConnected?.()
  })

  // Status per player: 'online' | 'disconnected' (offline but < 60s) | 'gone' (offline > 60s)
  function statusOf(uid: string): PresenceStatus {
    const p = presences.value[uid]
    if (!p || p.online) return 'online'
    const elapsed = Date.now() - (p.lastSeen ?? 0)
    return elapsed < 60_000 ? 'disconnected' : 'gone'
  }

  const offlinePlayers = computed(() =>
    playerIds().filter(uid => statusOf(uid) !== 'online'),
  )

  return { presences, statusOf, offlinePlayers }
}
