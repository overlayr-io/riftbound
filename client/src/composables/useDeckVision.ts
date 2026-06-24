import { ref, watch, onUnmounted } from 'vue'
import { ref as rtdbRef, onValue, set, remove, type Unsubscribe } from 'firebase/database'
import { rtdb } from '@/firebase'

export const DECK_VISION_KEY = Symbol('deckVision')

/** Live presence written while a player has their Vision tray open (anti-cheat halo). */
export interface VisionPresence {
  playerId: string
  count: number
  ts: number
}

/** Broadcast emitted when a player reveals cards from their deck (banner on every screen). */
export interface RevealEvent {
  playerId: string
  cardIds: string[]
  ts: number
}

export function useDeckVision(
  gameId: () => string | null,
  myUid: () => string | null,
) {
  // Presence of every player currently doing a Vision, keyed by playerId.
  const activeVisions = ref<Record<string, VisionPresence>>({})
  // Active reveal broadcasts, keyed by playerId.
  const reveals = ref<Record<string, RevealEvent>>({})

  const unsubs: Unsubscribe[] = []

  function subscribe(gId: string) {
    unsubs.forEach(u => u())
    unsubs.length = 0

    const visionRef = rtdbRef(rtdb, `games/${gId}/vision`)
    unsubs.push(
      onValue(visionRef, snap => {
        activeVisions.value = snap.exists() ? (snap.val() as Record<string, VisionPresence>) : {}
      })
    )

    const revealRef = rtdbRef(rtdb, `games/${gId}/reveal`)
    unsubs.push(
      onValue(revealRef, snap => {
        reveals.value = snap.exists() ? (snap.val() as Record<string, RevealEvent>) : {}
      })
    )
  }

  const stop = watch(
    gameId,
    id => {
      if (id) subscribe(id)
      else { unsubs.forEach(u => u()); unsubs.length = 0 }
    },
    { immediate: true },
  )

  onUnmounted(() => { stop(); unsubs.forEach(u => u()) })

  // ── Vision presence (anti-cheat halo) ─────────────────────────────────────────

  async function setVisionPresence(count: number) {
    const gId = gameId()
    const uid = myUid()
    if (!gId || !uid) return
    await set(rtdbRef(rtdb, `games/${gId}/vision/${uid}`), { playerId: uid, count, ts: Date.now() })
  }

  async function clearVisionPresence() {
    const gId = gameId()
    const uid = myUid()
    if (!gId || !uid) return
    await remove(rtdbRef(rtdb, `games/${gId}/vision/${uid}`))
  }

  // ── Reveal broadcast ──────────────────────────────────────────────────────────

  async function broadcastReveal(cardIds: string[]) {
    const gId = gameId()
    const uid = myUid()
    if (!gId || !uid || !cardIds.length) return
    const ref_ = rtdbRef(rtdb, `games/${gId}/reveal/${uid}`)
    await set(ref_, { playerId: uid, cardIds, ts: Date.now() })
    // Safety auto-cleanup; the revealer normally clears it explicitly.
    setTimeout(() => remove(ref_), 60000)
  }

  async function clearReveal() {
    const gId = gameId()
    const uid = myUid()
    if (!gId || !uid) return
    await remove(rtdbRef(rtdb, `games/${gId}/reveal/${uid}`))
  }

  return {
    activeVisions,
    reveals,
    setVisionPresence,
    clearVisionPresence,
    broadcastReveal,
    clearReveal,
  }
}

export type DeckVisionContext = ReturnType<typeof useDeckVision>
