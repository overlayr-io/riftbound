import { ref, watch, onUnmounted } from 'vue'
import { ref as rtdbRef, onValue, set, remove, type Unsubscribe } from 'firebase/database'
import { rtdb } from '@/firebase'

export interface EmoteEvent {
  playerId: string
  playerName: string
  emoteId: string
  ts: number
}

export function useGameEmote(gameId: () => string | null, myUid: () => string | null, myName: () => string) {
  const latestEmote = ref<EmoteEvent | null>(null)
  let unsub: Unsubscribe | null = null

  function subscribe(gId: string) {
    unsub?.()
    const emotesRef = rtdbRef(rtdb, `games/${gId}/emotes`)
    unsub = onValue(emotesRef, snap => {
      if (!snap.exists()) return
      const data = snap.val() as Record<string, EmoteEvent>

      // Pick the most recent emote from any player
      let newest: EmoteEvent | null = null
      for (const e of Object.values(data)) {
        if (!newest || e.ts > newest.ts) newest = e
      }
      if (newest) latestEmote.value = newest
    })
  }

  const stop = watch(gameId, id => {
    if (id) subscribe(id)
    else { unsub?.(); unsub = null }
  }, { immediate: true })

  onUnmounted(() => { stop(); unsub?.() })

  async function sendEmote(emoteId: string) {
    const gId = gameId()
    const uid = myUid()
    if (!gId || !uid) return

    const playerRef = rtdbRef(rtdb, `games/${gId}/emotes/${uid}`)
    await set(playerRef, { playerId: uid, playerName: myName(), emoteId, ts: Date.now() })

    // Auto-cleanup after 5s so old emotes don't re-trigger
    setTimeout(() => remove(playerRef), 5000)
  }

  return { latestEmote, sendEmote }
}
