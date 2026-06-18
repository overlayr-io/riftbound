import {GameMode, GameMatchFormat, GameDeckFormat} from "./game";
import {PlayerId} from "./player";

export interface LobbyPlayerState {
  playerName: string
  isReady: boolean
  /**
   * Only for 2v2 mode.
   */
  teamId: '1' | '2' | null
}
export type LobbyType = 'matchmaking' | 'private'

export interface Lobby {
  lobbyId: string
  type: LobbyType
  host: PlayerId
  lobbyCode: string
  mode: GameMode
  matchFormat: GameMatchFormat | 'ANY'
  deckFormat: GameDeckFormat | 'ANY'
  players: Map<PlayerId, LobbyPlayerState>
  gameId: string | null
  createdAt: Date
  updatedAt: Date
  deletedAt: Date | null
}

export interface LobbyMessage {
  messageId: string
  lobbyId: string
  senderId: PlayerId
  message: string
  type: 'chat' | 'system'
  sendAt: Date
}