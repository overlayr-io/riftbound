import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Lobby, LobbyMessage, LobbyPlayerState } from '@riftbound/shared'
import type { GameMode, GameDeckFormat } from '@riftbound/shared'
import { MAX_PLAYERS_BY_MODE } from '@riftbound/shared'
import { useAuthStore } from './auth'

export const useLobbyStore = defineStore('lobby', () => {
  const authStore = useAuthStore()

  const lobby = ref<Lobby | null>(null)
  const messages = ref<LobbyMessage[]>([])

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

  function getPlayerName(): string {
    const uid = authStore.user?.uid ?? 'unknown'
    return `Joueur-${uid.slice(0, 4).toUpperCase()}`
  }

  async function createLobby(mode: GameMode, deckFormat: GameDeckFormat): Promise<void> {
    const user = authStore.user
    if (!user) return

    const lobbyId = Math.random().toString(36).slice(2, 10).toUpperCase()
    const lobbyCode = Math.random().toString(36).slice(2, 7).toUpperCase()

    const playerState: LobbyPlayerState = {
      playerName: getPlayerName(),
      isReady: false,
      teamId: null,
    }

    const players = new Map<string, LobbyPlayerState>()
    players.set(user.uid, playerState)

    lobby.value = {
      lobbyId,
      host: user.uid,
      lobbyCode,
      mode,
      matchFormat: 'BO1',
      deckFormat,
      players,
      gameId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    }
  }

  async function joinLobby(code: string): Promise<void> {
    const user = authStore.user
    if (!user) return

    const lobbyId = Math.random().toString(36).slice(2, 10).toUpperCase()
    const fakeHostId = `host-${Math.random().toString(36).slice(2, 6)}`

    const players = new Map<string, LobbyPlayerState>()
    players.set(fakeHostId, { playerName: 'Adversaire', isReady: false, teamId: null })
    players.set(user.uid, { playerName: getPlayerName(), isReady: false, teamId: null })

    lobby.value = {
      lobbyId,
      host: fakeHostId,
      lobbyCode: code.toUpperCase(),
      mode: 'dual',
      matchFormat: 'BO1',
      deckFormat: 'constructed',
      players,
      gameId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    }
  }

  async function leaveLobby(): Promise<void> {
    lobby.value = null
    messages.value = []
  }

  async function toggleReady(): Promise<void> {
    const user = authStore.user
    if (!lobby.value || !user) return
    const state = lobby.value.players.get(user.uid)
    if (!state) return
    state.isReady = !state.isReady
    lobby.value.updatedAt = new Date()
  }

  async function startGame(): Promise<void> {
    // TODO: wire to Firebase
    console.log('Starting game...')
  }

  async function startMatchmaking(_mode: GameMode, _deckFormat: GameDeckFormat | 'ANY'): Promise<void> {
    // TODO: wire to Firebase matchmaking
    console.log('Matchmaking...', _mode, _deckFormat)
  }

  async function cancelMatchmaking(): Promise<void> {
    // TODO: wire to Firebase
    console.log('Matchmaking cancelled')
  }

  async function sendMessage(text: string): Promise<void> {
    const user = authStore.user
    if (!lobby.value || !user) return

    const msg: LobbyMessage = {
      messageId: Math.random().toString(36).slice(2),
      lobbyId: lobby.value.lobbyId,
      senderId: user.uid,
      message: text,
      type: 'chat',
      sendAt: new Date(),
    }
    messages.value.push(msg)
  }

  return {
    lobby,
    messages,
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
  }
})
