import { ref, watch, onUnmounted } from 'vue'
import { ref as rtdbRef, onValue, set, remove, type Unsubscribe } from 'firebase/database'
import { rtdb } from '@/firebase'
import { useToast } from '@/stores/toast'

export const PING_ARROW_KEY = Symbol('pingArrow')

export interface PingEvent {
  cardId: string
  playerId: string
  ts: number
}

export interface ArrowsEvent {
  sourceCardId: string
  targetCardIds: string[]
  playerId: string
  ts: number
}

export interface ArrowGroup {
  sourceCardId: string
  targetCardIds: string[]
}

export function useGamePingArrow(
  gameId: () => string | null,
  myUid: () => string | null,
) {
  const toast = useToast()

  const pinggedCardIds = ref<Set<string>>(new Set())
  // All confirmed arrow groups from RTDB (all players)
  const arrowGroups = ref<ArrowGroup[]>([])
  // Local in-progress selection
  const isArrowMode = ref(false)
  const localSourceCardId = ref<string | null>(null)
  const localTargets = ref<Set<string>>(new Set())

  const pingTimeouts: Record<string, ReturnType<typeof setTimeout>> = {}
  let hintToastId: number | null = null
  const unsubs: Unsubscribe[] = []

  function subscribe(gId: string) {
    unsubs.forEach(u => u())
    unsubs.length = 0

    const pingRef = rtdbRef(rtdb, `games/${gId}/ping`)
    unsubs.push(
      onValue(pingRef, snap => {
        if (!snap.exists()) return
        const data = snap.val() as Record<string, PingEvent>
        for (const event of Object.values(data)) {
          const cid = event.cardId
          if (pinggedCardIds.value.has(cid)) continue
          pinggedCardIds.value = new Set([...pinggedCardIds.value, cid])
          if (pingTimeouts[cid]) clearTimeout(pingTimeouts[cid])
          pingTimeouts[cid] = setTimeout(() => {
            const s = new Set(pinggedCardIds.value)
            s.delete(cid)
            pinggedCardIds.value = s
          }, 2500)
        }
      })
    )

    const arrowsRef = rtdbRef(rtdb, `games/${gId}/arrows`)
    unsubs.push(
      onValue(arrowsRef, snap => {
        if (!snap.exists()) {
          arrowGroups.value = []
          return
        }
        const data = snap.val() as Record<string, ArrowsEvent>
        arrowGroups.value = Object.values(data).map(e => ({
          sourceCardId: e.sourceCardId,
          targetCardIds: e.targetCardIds ?? [],
        }))
      })
    )
  }

  const stop = watch(gameId, id => {
    if (id) subscribe(id)
    else { unsubs.forEach(u => u()); unsubs.length = 0 }
  }, { immediate: true })

  onUnmounted(() => { stop(); unsubs.forEach(u => u()) })

  async function sendPing(cardId: string) {
    const gId = gameId()
    const uid = myUid()
    if (!gId || !uid) return
    const ref_ = rtdbRef(rtdb, `games/${gId}/ping/${uid}`)
    await set(ref_, { cardId, playerId: uid, ts: Date.now() })
    setTimeout(() => remove(ref_), 3000)
    toast.info('Ping !', 2000)
  }

  function startArrowMode(sourceCardId: string) {
    isArrowMode.value = true
    localSourceCardId.value = sourceCardId
    localTargets.value = new Set()
    hintToastId = toast.hint('Mode flèche — clique les cartes cibles, puis Entrée ou OK')
  }

  function toggleTarget(cardId: string) {
    // Cannot target the source card itself
    if (cardId === localSourceCardId.value) return
    const s = new Set(localTargets.value)
    if (s.has(cardId)) s.delete(cardId)
    else s.add(cardId)
    localTargets.value = s
  }

  async function confirmArrows() {
    const gId = gameId()
    const uid = myUid()
    if (!gId || !uid || !localSourceCardId.value) return
    const ref_ = rtdbRef(rtdb, `games/${gId}/arrows/${uid}`)
    await set(ref_, {
      sourceCardId: localSourceCardId.value,
      targetCardIds: [...localTargets.value],
      playerId: uid,
      ts: Date.now(),
    })
    setTimeout(() => remove(ref_), 15000)
    cancelArrowMode()
    toast.success('Cibles désignées !', 2500)
  }

  function cancelArrowMode() {
    isArrowMode.value = false
    localSourceCardId.value = null
    localTargets.value = new Set()
    if (hintToastId !== null) { toast.remove(hintToastId); hintToastId = null }
  }

  async function clearMyArrows() {
    const gId = gameId()
    const uid = myUid()
    if (!gId || !uid) return
    await remove(rtdbRef(rtdb, `games/${gId}/arrows/${uid}`))
    cancelArrowMode()
    toast.info('Flèches supprimées', 1500)
  }

  return {
    pinggedCardIds,
    arrowGroups,
    isArrowMode,
    localSourceCardId,
    localTargets,
    sendPing,
    startArrowMode,
    toggleTarget,
    confirmArrows,
    cancelArrowMode,
    clearMyArrows,
  }
}

export type PingArrowContext = ReturnType<typeof useGamePingArrow>
