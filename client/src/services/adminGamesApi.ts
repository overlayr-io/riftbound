import type { GameSummary, GameDetail, GamesFilter } from '@riftbound/shared'
import { apiFetch } from './http'

// Côté transport, les dates sont sérialisées en ISO string.
type IsoDates<T> = {
  [K in keyof T]: T[K] extends Date ? string : T[K] extends Date | null ? string | null : T[K]
}

export type GameSummaryDto = IsoDates<GameSummary>
export type RoundSummaryDto = IsoDates<import('@riftbound/shared').RoundSummary>
export type GameDetailDto = IsoDates<Omit<GameDetail, 'rounds'>> & { rounds: RoundSummaryDto[] }

export const adminGamesApi = {
  list(filter: GamesFilter = {}): Promise<GameSummaryDto[]> {
    const params = new URLSearchParams()
    if (filter.mode) params.set('mode', filter.mode)
    if (filter.matchFormat) params.set('matchFormat', filter.matchFormat)
    if (filter.deckFormat) params.set('deckFormat', filter.deckFormat)
    if (filter.status) params.set('status', filter.status)
    if (filter.search) params.set('search', filter.search)
    if (filter.limit) params.set('limit', String(filter.limit))
    const qs = params.toString()
    return apiFetch('GET', `/admin/games${qs ? `?${qs}` : ''}`)
  },

  detail(gameId: string): Promise<GameDetailDto> {
    return apiFetch('GET', `/admin/games/${gameId}`)
  },

  forceEnd(gameId: string): Promise<GameDetailDto> {
    return apiFetch('POST', `/admin/games/${gameId}/force-end`)
  },

  kickFromLobby(lobbyId: string, uid: string): Promise<void> {
    return apiFetch('POST', `/admin/lobbies/${lobbyId}/kick/${uid}`)
  },

  resetLobby(lobbyId: string): Promise<void> {
    return apiFetch('POST', `/admin/lobbies/${lobbyId}/reset`)
  },
}
