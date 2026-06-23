import {PlayerId} from "./player";
import {ZoneId} from "./zone";

// ── Deck actions ──────────────────────────────────────────────────────────────

export type DrawCardAction = {
  type: 'DRAW_CARD'
  playerId: PlayerId
  cardId: string
  fromZoneId: ZoneId
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

// ── Play / move actions ───────────────────────────────────────────────────────

export type PlayCardAction = {
  type: 'PLAY_CARD'
  playerId: PlayerId
  cardId: string
  fromZoneId: ZoneId
  toZoneId: ZoneId
}

export type MoveCardAction = {
  type: 'MOVE_CARD'
  playerId: PlayerId
  cardId: string
  fromZoneId: ZoneId
  toZoneId: ZoneId
}

export type MoveToHandAction = {
  type: 'MOVE_TO_HAND'
  playerId: PlayerId
  cardId: string
  fromZoneId: ZoneId
}

export type DiscardCardAction = {
  type: 'DISCARD_CARD'
  playerId: PlayerId
  cardId: string
  fromZoneId: ZoneId
}

export type BanishCardAction = {
  type: 'BANISH_CARD'
  playerId: PlayerId
  cardId: string
  fromZoneId: ZoneId
}

// ── Visibility actions ────────────────────────────────────────────────────────

export type HideCardAction = {
  type: 'HIDE_CARD'
  playerId: PlayerId
  cardId: string
}

export type RevealCardAction = {
  type: 'REVEAL_CARD'
  playerId: PlayerId
  cardId: string
}

export type RevealCardForSelfAction = {
  type: 'REVEAL_CARD_FOR_SELF'
  playerId: PlayerId
  cardId: string
}

// ── State actions ─────────────────────────────────────────────────────────────

export type ToggleExhaustedAction = {
  type: 'TOGGLE_EXHAUSTED'
  playerId: PlayerId
  cardId: string
}

export type SetCountersAction = {
  type: 'SET_COUNTERS'
  playerId: PlayerId
  cardId: string
  value: number | null
}

export type SetDamagesAction = {
  type: 'SET_DAMAGES'
  playerId: PlayerId
  cardId: string
  value: number | null
}

export type SetBuffAction = {
  type: 'SET_BUFF'
  playerId: PlayerId
  cardId: string
  value: number | null
}

// ── Union ─────────────────────────────────────────────────────────────────────

export type GameAction =
  | DrawCardAction
  | ChannelCardAction
  | RecycleRuneAction
  | PlayCardAction
  | MoveCardAction
  | MoveToHandAction
  | DiscardCardAction
  | BanishCardAction
  | HideCardAction
  | RevealCardAction
  | RevealCardForSelfAction
  | ToggleExhaustedAction
  | SetCountersAction
  | SetDamagesAction
  | SetBuffAction
  // | CopyCardAction
  // | RevealCardForControllerAction
  // | GroupCardAction
  // | UngroupCardAction
  // | AddToStackAction
  // | PlayTokenCardAction
  // | CreateTokenAction
  // | ShuffleHandAction

export type GameActionType = GameAction['type'];
