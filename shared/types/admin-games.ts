import type { GameMode, GameMatchFormat, GameDeckFormat } from './game'
import type { PlayerId } from './player'

export type GameStatus = 'active' | 'ended' | 'abandoned'

export function gameStatusOf(endedAt: Date | null, deletedAt: Date | null): GameStatus {
  if (deletedAt) return 'abandoned'
  if (endedAt) return 'ended'
  return 'active'
}

export interface GamePlayerInfo {
  uid: PlayerId
  name: string
  teamId: '1' | '2' | null
}

export interface GameSummary {
  gameId: string
  lobbyId: string
  mode: GameMode
  matchFormat: GameMatchFormat
  deckFormat: GameDeckFormat
  status: GameStatus
  players: GamePlayerInfo[]
  currentRoundId: string | null
  roundResults: { round: number; winnerId: PlayerId }[]
  createdAt: Date
  updatedAt: Date
  endedAt: Date | null
}

export interface RoundSummary {
  roundId: string
  round: number
  setup: string
  winnerId: PlayerId | null
  endedAt: Date | null
  updatedAt: Date
}

export interface GameDetail extends GameSummary {
  rounds: RoundSummary[]
}

export interface GamesFilter {
  mode?: GameMode
  matchFormat?: GameMatchFormat
  deckFormat?: GameDeckFormat
  status?: GameStatus
  /** Recherche libre : gameId, lobbyId, nom ou uid de joueur. */
  search?: string
  limit?: number
}
