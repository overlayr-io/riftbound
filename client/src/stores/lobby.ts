import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  doc,
  collection,
  query,
  orderBy,
  onSnapshot,
  type Unsubscribe,
} from 'firebase/firestore'
import type { Lobby, LobbyMessage, LobbyPlayerState } from '@riftbound/shared'
import type { GameMode, GameDeckFormat, GameMatchFormat } from '@riftbound/shared'
import { MAX_PLAYERS_BY_MODE } from '@riftbound/shared'
import { firestore } from '@/firebase'
import { useAuthStore } from './auth'
import { lobbyApi, ApiError } from '@/services/api'

export const useLobbyStore = defineStore('lobby', () => {
  const authStore = useAuthStore()

  const lobby = ref<Lobby | null>(null)
  const messages = ref<LobbyMessage[]>([])
  const error = ref<string | null>(null)

  let unsubLobby: Unsubscribe | null = null
  let unsubMessages: Unsubscribe | null = null

  // ── Computed ────────────────────────────────────────────────────────────────

  const isHost = computed(() => {
    if (!lobby.value || !authStore.user) return false
    return lobby.value.host === authStore.user.uid
  })

  const slotMax = computed(() => {
    if (!lobby.value) return 0
    return MAX_PLAYERS_BY_MODE[lobby.value.mode]
  })

  const canStart = computed(() => {
    if (!lobby.value || !isHost.value) return false
    const players = Array.from(lobby.value.players.values())
    return players.length >= 2 && players.every(p => p.isReady)
  })

  const isReady = computed(() => {
    if (!lobby.value || !authStore.user) return false
    return lobby.value.players.get(authStore.user.uid)?.isReady ?? false
  })

  // ── Listeners ───────────────────────────────────────────────────────────────

  function attachListeners(lobbyId: string) {
    detachListeners()

    // Listener 1 — lobby document (players)
    unsubLobby = onSnapshot(
      doc(firestore, 'lobbies', lobbyId),
      (snap) => {
        if (!snap.exists()) {
          lobby.value = null
          return
        }
        const d = snap.data()
        const rawPlayers: Record<string, LobbyPlayerState> = d.players ?? {}
        lobby.value = {
          lobbyId: snap.id,
          type: d.type,
          host: d.host,
          lobbyCode: d.lobbyCode,
          mode: d.mode,
          matchFormat: d.matchFormat,
          deckFormat: d.deckFormat,
          players: new Map(Object.entries(rawPlayers)),
          gameId: d.gameId ?? null,
          createdAt: d.createdAt?.toDate() ?? new Date(),
          updatedAt: d.updatedAt?.toDate() ?? new Date(),
          deletedAt: d.deletedAt?.toDate() ?? null,
        }
      },
      (err) => { console.error('[lobby] listener error', err) },
    )

    // Listener 2 — messages subcollection
    unsubMessages = onSnapshot(
      query(
        collection(firestore, 'lobbies', lobbyId, 'messages'),
        orderBy('sendAt', 'asc'),
      ),
      (snap) => {
        messages.value = snap.docs.map((d) => {
          const data = d.data()
          return {
            messageId: d.id,
            lobbyId,
            senderId: data.senderId,
            message: data.message,
            type: data.type,
            sendAt: data.sendAt?.toDate() ?? new Date(),
          }
        })
      },
      (err) => { console.error('[messages] listener error', err) },
    )
  }

  function detachListeners() {
    unsubLobby?.()
    unsubMessages?.()
    unsubLobby = null
    unsubMessages = null
  }

  // ── Actions ─────────────────────────────────────────────────────────────────

  async function startMatchmaking(
    mode: GameMode,
    deckFormat: GameDeckFormat | 'ANY',
  ): Promise<{ joined: boolean }> {
    const uid = authStore.user?.uid
    if (!uid) throw new Error('Not authenticated')
    error.value = null
    const result = await lobbyApi.matchmaking(uid, mode, deckFormat)
    const lobbyId = result.lobby.lobbyId
    attachListeners(lobbyId)
    return { joined: result.joined }
  }

  async function createLobby(
    mode: GameMode,
    matchFormat: GameMatchFormat,
    deckFormat: GameDeckFormat,
  ): Promise<void> {
    const uid = authStore.user?.uid
    if (!uid) throw new Error('Not authenticated')
    error.value = null
    const dto = await lobbyApi.create(uid, mode, matchFormat, deckFormat)
    attachListeners(dto.lobbyId)
  }

  async function joinLobby(code: string): Promise<void> {
    const uid = authStore.user?.uid
    if (!uid) throw new Error('Not authenticated')
    error.value = null
    try {
      const dto = await lobbyApi.joinByCode(uid, code)
      attachListeners(dto.lobbyId)
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 404) throw new Error('CODE_NOT_FOUND')
        if (err.status === 409) throw new Error('LOBBY_FULL')
      }
      throw err
    }
  }

  async function leaveLobby(): Promise<void> {
    const id = lobby.value?.lobbyId
    detachListeners()
    lobby.value = null
    messages.value = []
    if (id) await lobbyApi.leave(id).catch(() => {})
  }

  async function cancelMatchmaking(): Promise<void> {
    const id = lobby.value?.lobbyId
    detachListeners()
    lobby.value = null
    messages.value = []
    if (id) await lobbyApi.cancelMatchmaking(id).catch(() => {})
  }

  async function toggleReady(): Promise<void> {
    if (!lobby.value) return
    await lobbyApi.toggleReady(lobby.value.lobbyId)
  }

  async function startGame(): Promise<void> {
    // TODO: wire to game start
    console.log('Starting game...')
  }

  async function sendMessage(text: string): Promise<void> {
    if (!lobby.value) return
    await lobbyApi.sendMessage(lobby.value.lobbyId, text)
  }

  return {
    lobby,
    messages,
    error,
    isHost,
    isReady,
    canStart,
    slotMax,
    createLobby,
    joinLobby,
    leaveLobby,
    toggleReady,
    startGame,
    startMatchmaking,
    cancelMatchmaking,
    sendMessage,
    detachListeners,
  }
})
