import { ref, watch, onUnmounted } from 'vue'
import {
  collection, onSnapshot, query, orderBy, limit,
  type Unsubscribe,
} from 'firebase/firestore'
import type { GameMessage } from '@riftbound/shared'
import { firestore } from '@/firebase'
import { gameApi } from '@/services/api'

export function useGameChat(gameId: () => string | null) {
  const messages = ref<GameMessage[]>([])
  const sending = ref(false)
  const error = ref<string | null>(null)
  let unsub: Unsubscribe | null = null

  function subscribe(gId: string) {
    unsub?.()
    unsub = onSnapshot(
      query(
        collection(firestore, 'games', gId, 'messages'),
        orderBy('sentAt', 'asc'),
        limit(100),
      ),
      snap => {
        messages.value = snap.docs.map(d => ({
          messageId: d.id,
          playerId: d.data().playerId,
          playerName: d.data().playerName,
          text: d.data().text,
          sentAt: d.data().sentAt?.toDate() ?? new Date(),
        }))
      },
    )
  }

  const stop = watch(gameId, id => {
    if (id) subscribe(id)
    else { unsub?.(); unsub = null; messages.value = [] }
  }, { immediate: true })

  onUnmounted(() => { stop(); unsub?.() })

  async function send(text: string): Promise<boolean> {
    const gId = gameId()
    if (!gId || !text.trim() || sending.value) return false
    sending.value = true
    error.value = null
    try {
      await gameApi.sendMessage(gId, text.trim())
      return true
    } catch (e: any) {
      error.value = e.message ?? 'Erreur'
      return false
    } finally {
      sending.value = false
    }
  }

  return { messages, sending, error, send }
}
