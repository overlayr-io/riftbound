import {PlayerId} from "./player";

export type GameMode = 'dual' | '2v2' | 'FFA'
export type GameMatchFormat = 'BO1' | 'BO3' | 'BO5'
export type GameDeckFormat = 'constructed' | 'sealed' | 'learn_to_play'
export const MAX_PLAYERS_BY_MODE: Record<GameMode, number> = {
  dual: 2,
  '2v2': 4,
  FFA: 4
}
export interface GamePlayerState {
  playerName: string
  /**
   * Only for 2v2 mode.
   */
  teamId: '1' | '2' | null
}

export interface Game {
  gameId: string
  host: PlayerId
  lobbyCode: string
  mode: GameMode
  matchFormat: GameMatchFormat
  deckFormat: GameDeckFormat
  players: Map<PlayerId, GamePlayerState>
}