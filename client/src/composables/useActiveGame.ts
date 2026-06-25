import { ref, onUnmounted } from 'vue'
import { collection, query, where, onSnapshot, limit } from 'firebase/firestore'
import { firestore } from '@/firebase'

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

    const q = query(
      collection(firestore, 'games'),
      where('playerIds', 'array-contains', currentUid),
      where('endedAt', '==', null),
      limit(1),
    )

    unsub = onSnapshot(q, (snap) => {
      loading.value = false
      if (snap.empty) {
        activeGame.value = null
      } else {
        const doc = snap.docs[0]
        const d = doc.data()
        activeGame.value = {
          gameId: doc.id,
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
