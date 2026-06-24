import { computed, ref } from 'vue'
import { useGameStore } from '@/stores/game'

export function usePlayerScore() {
  const gameStore = useGameStore()

  // ── Local optimistic values (shown immediately in the UI) ─────────────────────
  const pendingMyScore = ref<number | null>(null)
  let myFlushTimer: ReturnType<typeof setTimeout> | null = null

  const myScore = computed(() =>
    pendingMyScore.value ?? gameStore.myState?.score ?? 0,
  )

  const oppScore = computed(() => {
    const uid = gameStore.myUid
    if (!uid || !gameStore.currentRound) return 0
    const opp = gameStore.opponents[0]
    return opp ? (gameStore.currentRound.players[opp]?.score ?? 0) : 0
  })

  // Score before any pending clicks — used to compute the total delta for the log
  let scoreBeforeEditing: number | null = null

  function changeMyScore(delta: number) {
    const uid = gameStore.myUid
    if (!uid) return

    const remote = gameStore.myState?.score ?? 0
    const base = pendingMyScore.value ?? remote

    // Snapshot the pre-edit baseline on the first click of a new sequence
    if (pendingMyScore.value === null) scoreBeforeEditing = remote

    const next = Math.max(0, base + delta)
    pendingMyScore.value = next

    // Reset debounce timer — only flush after 2s of inactivity
    if (myFlushTimer) clearTimeout(myFlushTimer)
    myFlushTimer = setTimeout(() => {
      const finalScore = pendingMyScore.value!
      const totalDelta = finalScore - (scoreBeforeEditing ?? 0)
      const sign = totalDelta >= 0 ? `+${totalDelta}` : `${totalDelta}`
      gameStore.setScore(uid, finalScore)
      gameStore.writeLog(`${gameStore.actorName(uid)} : score ${sign} → ${finalScore} pt(s)`, uid)
      pendingMyScore.value = null
      scoreBeforeEditing = null
      myFlushTimer = null
    }, 2000)
  }

  return { myScore, oppScore, changeMyScore }
}
