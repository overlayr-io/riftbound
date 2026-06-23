import {PlayerId} from "./player";

export type DrawCardAction = {
  type: 'DRAW_CARD'
  playerId: PlayerId
  cardId: string
}

export type ChannelCardAction = {
  type: 'CHANNEL_CARD'
  playerId: PlayerId
  cardId: string
}

export type RecycleRuneAction = {
  type: 'RECYCLE_RUNE'
  playerId: PlayerId
  cardId: string
}

export type GameAction =
  | DrawCardAction
  | ChannelCardAction
  // | RecycleCardAction
  | RecycleRuneAction
  // | PlayCardAction
  // | MoveCardAction
  // | MoveToHandAction
  // | DiscardCardAction
  // | BanishCardAction
  // | CopyCardAction
  // | HideCardAction
  // | RevealCardAction
  // | RevealCardForControllerAction
  // | GroupCardAction
  // | UngroupCardAction
  // | AddToStackAction
  // | ToggleExhaustedAction
  // | SetCountersAction
  // | SetDamagesAction
  // | SetBuffAction
  // | PlayTokenCardAction
  // | CreateTokenAction
  // | ShuffleHandAction;

export type GameActionType = GameAction['type'];