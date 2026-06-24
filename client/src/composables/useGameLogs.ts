import { ref } from 'vue'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import type { GameAction } from '@riftbound/shared'
import type { GameLog } from '@riftbound/shared'
import { firestore } from '@/firebase'
import { gameApi } from '@/services/api'

function describeAction(action: GameAction, playerName: string, playerNames: Record<string, { name: string }>): string {
  switch (action.type) {
    case 'DRAW_CARD':       return `${playerName} a pioché une carte`
    case 'CHANNEL_CARD':    return `${playerName} a canalisé une rune`
    case 'PLAY_CARD':       return `${playerName} a joué une carte`
    case 'MOVE_CARD':       return `${playerName} a déplacé une carte`
    case 'DISCARD_CARD':    return `${playerName} a défaussé une carte`
    case 'HIDE_CARD':       return `${playerName} a retourné une carte face cachée`
    case 'REVEAL_CARD':     return `${playerName} a révélé une carte`
    case 'TOGGLE_EXHAUSTED':return `${playerName} a épuisé / réactivé une carte`
    case 'GROUP_CARD':      return `${playerName} a groupé des cartes`
    case 'UNGROUP_CARD':    return `${playerName} a dégroupé des cartes`
    case 'SET_COUNTERS':    return `${playerName} a modifié des compteurs`
    case 'SET_DAMAGES':     return `${playerName} a modifié les dégâts`
    case 'SET_BUFF':        return `${playerName} a modifié un buff`
    case 'CREATE_TOKEN':    return `${playerName} a créé un token`
    case 'SEND_TO_DECK':    return `${playerName} a renvoyé une carte dans le deck`
    case 'RESOLVE_STACK':   return `${playerName} a résolu le stack`
    default:                return `${playerName} a effectué une action`
  }
}

export function useGameLogs(gameId: () => string | null) {
  const logs = ref<GameLog[]>([])
  const loading = ref(false)

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

  async function logAction(
    action: GameAction,
    playerId: string,
    playerNames: Record<string, { name: string }>,
  ) {
    const gId = gameId()
    if (!gId) return
    const playerName = playerNames[playerId]?.name ?? playerId.slice(0, 6)
    const description = describeAction(action, playerName, playerNames)
    try {
      await addDoc(collection(firestore, 'games', gId, 'logs'), {
        playerId,
        description,
        createdAt: serverTimestamp(),
      })
    } catch {
      // Log failures are non-critical
    }
  }

  return { logs, loading, fetchLogs, logAction }
}
