import { auth } from '@/firebase'
import type { Card, Lobby, LobbyPlayerState } from '@riftbound/shared'
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

async function requestGame<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers = await authHeaders()
  const res = await fetch(`${BASE_URL}/api/games${path}`, {
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

  evictPlayer(lobbyId: string, playerId: string): Promise<void> {
    return request('DELETE', `/${lobbyId}/players/${playerId}`)
  },

  cancelMatchmaking(lobbyId: string): Promise<void> {
    return request('DELETE', `/${lobbyId}/matchmaking`)
  },

  toggleReady(lobbyId: string): Promise<void> {
    return request('PATCH', `/${lobbyId}/ready`)
  },

  setTeam(lobbyId: string, playerId: string, teamId: '1' | '2' | null): Promise<void> {
    return request('PATCH', `/${lobbyId}/players/${playerId}/team`, { teamId })
  },

  randomizeTeams(lobbyId: string): Promise<void> {
    return request('POST', `/${lobbyId}/teams/randomize`)
  },

  sendMessage(lobbyId: string, text: string): Promise<void> {
    return request('POST', `/${lobbyId}/messages`, { text })
  },
}

export const gameApi = {
  start(lobbyId: string): Promise<{ gameId: string }> {
    return requestGame('POST', '/', { lobbyId })
  },

  submitDeck(gameId: string, roundId: string, legendCard: Card): Promise<void> {
    return requestGame('PATCH', `/${gameId}/rounds/${roundId}/deck`, { legendCard })
  },

  selectBattlefield(gameId: string, roundId: string, card: Card): Promise<void> {
    return requestGame('PATCH', `/${gameId}/rounds/${roundId}/battlefield`, {
      battlefieldCardId: card.id,
      battlefieldCard: card,
    })
  },

  rollDice(gameId: string, roundId: string): Promise<{ result: number }> {
    return requestGame('POST', `/${gameId}/rounds/${roundId}/dice`)
  },

  chooseFirstPlayer(gameId: string, roundId: string, chosenPlayerId: string): Promise<void> {
    return requestGame('POST', `/${gameId}/rounds/${roundId}/first-player`, { chosenPlayerId })
  },

  discardBattlefield(gameId: string, roundId: string, cardId: string): Promise<void> {
    return requestGame('POST', `/${gameId}/rounds/${roundId}/discard-battlefield`, { cardId })
  },

  confirmDiscard(gameId: string, roundId: string): Promise<void> {
    return requestGame('POST', `/${gameId}/rounds/${roundId}/discard-battlefield/confirm`)
  },

  submitMulligan(gameId: string, roundId: string, count: number): Promise<void> {
    return requestGame('POST', `/${gameId}/rounds/${roundId}/mulligan`, { count })
  },

  devSkipSetup(gameId: string, roundId: string, playersDecks: Record<string, unknown>): Promise<void> {
    return requestGame('POST', `/${gameId}/rounds/${roundId}/dev-skip`, { playersDecks })
  },
}
