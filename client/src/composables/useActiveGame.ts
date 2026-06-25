import { ref, onUnmounted } from 'vue'
import { collection, query, where, onSnapshot, limit, Timestamp } from 'firebase/firestore'
import { firestore } from '@/firebase'

const TTL_MS = 60 * 60 * 1000 // 1 heure

export interface ActiveGameSummary {
  gameId: string
  lobbyCode: string
  mode: string
  matchFormat: string
}

export function useActiveGame(uid: () => string | null) {
  const activeGame = ref<ActiveGameSummary | null>(null)
  const loading = ref(true)

  let unsub: (() => void) | null = null

  function attach() {
    const currentUid = uid()
    if (!currentUid) { loading.value = false; return }

    const cutoff = Timestamp.fromDate(new Date(Date.now() - TTL_MS))

    const q = query(
      collection(firestore, 'games'),
      where('playerIds', 'array-contains', currentUid),
      where('endedAt', '==', null),
      where('updatedAt', '>', cutoff),
      limit(1),
    )

    unsub = onSnapshot(q, (snap) => {
      loading.value = false
      if (snap.empty) {
        activeGame.value = null
      } else {
        const d = snap.docs[0].data()
        activeGame.value = {
          gameId: snap.docs[0].id,
          lobbyCode: d.lobbyCode ?? '',
          mode: d.mode ?? '',
          matchFormat: d.matchFormat ?? '',
        }
      }
    }, () => { loading.value = false })
  }

  attach()

  onUnmounted(() => unsub?.())

  return { activeGame, loading }
}
