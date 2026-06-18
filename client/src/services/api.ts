import { auth } from '@/firebase'
import type { Lobby, LobbyPlayerState } from '@riftbound/shared'
import type { GameMode, GameDeckFormat, GameMatchFormat } from '@riftbound/shared'

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

async function authHeaders(): Promise<Record<string, string>> {
  const user = auth.currentUser
  if (!user) throw new Error('Not authenticated')
  const token = await user.getIdToken()
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers = await authHeaders()
  const res = await fetch(`${BASE_URL}/api/lobbies${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  if (res.status === 204) return undefined as T
  const data = await res.json()
  if (!res.ok) throw new ApiError(res.status, data.error ?? 'Unknown error')
  return data as T
}

export class ApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message)
  }
}

export type LobbyDto = Omit<Lobby, 'players' | 'createdAt' | 'updatedAt' | 'deletedAt'> & {
  players: Record<string, LobbyPlayerState>
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

export type MatchmakingResult = {
  lobby: LobbyDto
  joined: boolean
}

function parsePlayerName(uid: string): string {
  return `Joueur-${uid.slice(0, 4).toUpperCase()}`
}

export const lobbyApi = {
  matchmaking(uid: string, mode: GameMode, deckFormat: GameDeckFormat | 'ANY'): Promise<MatchmakingResult> {
    return request('POST', '/matchmaking', {
      playerName: parsePlayerName(uid),
      mode,
      deckFormat,
    })
  },

  create(uid: string, mode: GameMode, matchFormat: GameMatchFormat, deckFormat: GameDeckFormat): Promise<LobbyDto> {
    return request('POST', '/', {
      playerName: parsePlayerName(uid),
      mode,
      matchFormat,
      deckFormat,
    })
  },

  joinByCode(uid: string, code: string): Promise<LobbyDto> {
    return request('POST', `/join/${code.toUpperCase()}`, {
      playerName: parsePlayerName(uid),
    })
  },

  leave(lobbyId: string): Promise<void> {
    return request('DELETE', `/${lobbyId}`)
  },

  cancelMatchmaking(lobbyId: string): Promise<void> {
    return request('DELETE', `/${lobbyId}/matchmaking`)
  },

  toggleReady(lobbyId: string): Promise<void> {
    return request('PATCH', `/${lobbyId}/ready`)
  },

  sendMessage(lobbyId: string, text: string): Promise<void> {
    return request('POST', `/${lobbyId}/messages`, { text })
  },
}
