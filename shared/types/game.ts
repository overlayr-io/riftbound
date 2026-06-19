import {PlayerId, PlayerState} from "./player";
import {LobbyType} from "./lobby";
import {CardId, CardState, DeckList} from "./card";

export type GameMode = 'dual' | '2v2' | 'FFA'
export type GameMatchFormat = 'BO1' | 'BO3' | 'BO5'
export type GameDeckFormat = 'constructed' | 'sealed' | 'learn_to_play'
export const MAX_PLAYERS_BY_MODE: Record<GameMode, number> = {
  dual: 2,
  '2v2': 4,
  FFA: 4
}
export interface GamePlayer {
  playerName: string
  /**
   * Only for 2v2 mode.
   */
  teamId: '1' | '2' | null
  selectedDeck: DeckList | null
}

export interface Game {
  gameId: string
  type: LobbyType
  host: PlayerId
  lobbyCode: string
  mode: GameMode
  matchFormat: GameMatchFormat
  deckFormat: GameDeckFormat

  players: Map<PlayerId, GamePlayer>

  createdAt: Date
  updatedAt: Date
  endedAt: Date | null
  deletedAt: Date | null
}

export type GameSetupStep =
  | 'deck_selection'
  | 'select_battlefield'
  | 'dice_roll'
  | 'select_battlefield_discard' //only for 4-player
  | 'choose_first_player'        //only for 2-player
  | 'mulligan'
  | 'completed'

export interface GameRound {
  roundId: string
  gameId: string
  round: number

  previousRound: string | null

  setup: GameSetupStep
  diceWinnerId: PlayerId | null
  tiedPlayerIds: PlayerId[] | null
  firstPlayerId: PlayerId | null
  /**
   * 4-player only: the battlefield revealed-and-discarded by the dice winner
   * (since 4 players submit a battlefield each but only 3 are played).
   */
  discardedBattlefieldId: CardId | null
  /**
   * 4-player only: shuffled order of playerIds for the discard-BF display.
   * Set when transitioning to select_battlefield_discard.
   */
  bfDisplayOrder: PlayerId[] | null
  winnerId: PlayerId | null

  currentTurn: {
    playerId: PlayerId
    turn: number
  } | null

  players: Record<PlayerId, PlayerState>
  cards: Record<CardId, CardState>

  updatedAt: Date
  endedAt: Date | null
}

export interface GameChat {
  messageId: string
  gameId: string
  senderId: PlayerId
  message: string
  type: 'chat' | 'system'
  sendAt: Date
}
