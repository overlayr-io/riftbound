import { ref, computed, watch, onUnmounted, type Ref } from 'vue'
import { doc, collection, query, orderBy, limit, onSnapshot, type Unsubscribe } from 'firebase/firestore'
import { firestore } from '@/firebase'
import type { CardState, PlayerState, PlayerId, SpectatorView } from '@riftbound/shared'
import { isCardFaceVisible } from '@riftbound/shared'

export interface SpectateRound {
  setup: string
  diceWinnerId: PlayerId | null
  firstPlayerId: PlayerId | null
  winnerId: PlayerId | null
  currentTurn: { playerId: PlayerId; turn: number } | null
  players: Record<PlayerId, PlayerState>
  cards: Record<string, CardState>
}

export interface SpectateLog {
  logId: string
  playerId: string | null
  description: string
}

/**
 * God view live read-only d'un round. La visibilité passe TOUJOURS par
 * isCardFaceVisible : ici mode 'god' (révèle tout). Un futur spectate joueur
 * réutilisera ce composable avec view = { mode:'player', uid } sans fuite.
 */
export function useSpectate(
  gameId: () => string,
  roundId: () => string | null,
  view: SpectatorView = { mode: 'god' },
) {
  const round = ref<SpectateRound | null>(null)
  const logs = ref<SpectateLog[]>([])
  const connected = ref(false)

  let unsubRound: Unsubscribe | null = null
  let unsubLogs: Unsubscribe | null = null

  function detach() {
    unsubRound?.(); unsubRound = null
    unsubLogs?.(); unsubLogs = null
    connected.value = false
  }

  function attach() {
    detach()
    const gid = gameId()
    const rid = roundId()
    if (!gid || !rid) return

    unsubRound = onSnapshot(
      doc(firestore, 'games', gid, 'rounds', rid),
      (snap) => {
        connected.value = true
        round.value = snap.exists() ? (snap.data() as SpectateRound) : null
      },
      () => { connected.value = false },
    )

    unsubLogs = onSnapshot(
      query(collection(firestore, 'games', gid, 'logs'), orderBy('createdAt', 'desc'), limit(40)),
      (snap) => {
        logs.value = snap.docs.map((d) => ({
          logId: d.id,
          playerId: d.data().playerId ?? null,
          description: d.data().description ?? '',
        }))
      },
      () => {},
    )
  }

  watch([gameId, roundId] as [Ref<string> | (() => string), Ref<string | null> | (() => string | null)], attach, { immediate: true })
  onUnmounted(detach)

  /** Cartes regroupées par joueur puis par zone, avec la face révélée ou non. */
  const board = computed(() => {
    const result: Record<PlayerId, Record<string, { card: CardState; faceVisible: boolean }[]>> = {}
    if (!round.value) return result
    for (const card of Object.values(round.value.cards)) {
      const owner = card.ownerId
      const zone = card.zoneId
      result[owner] ??= {}
      result[owner][zone] ??= []
      result[owner][zone].push({ card, faceVisible: isCardFaceVisible(card, view) })
    }
    for (const zones of Object.values(result)) {
      for (const list of Object.values(zones)) list.sort((a, b) => a.card.order - b.card.order)
    }
    return result
  })

  return { round, logs, connected, board }
}
