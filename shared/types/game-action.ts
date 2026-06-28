import {PlayerId} from "./player";
import {ZoneId} from "./zone";
import {CardType} from "./card";

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

// ── Group actions ─────────────────────────────────────────────────────────────

export type GroupCardAction = {
  type: 'GROUP_CARD'
  playerId: PlayerId
  parentId: string
  childId: string
}

export type UngroupCardAction = {
  type: 'UNGROUP_CARD'
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

// ── Control actions ───────────────────────────────────────────────────────────

export type CopyCardAction = {
  type: 'COPY_CARD'
  playerId: PlayerId
  sourceCardId: string
  newCardId: string
}

export type TakeControlAction = {
  type: 'TAKE_CONTROL'
  playerId: PlayerId
  cardId: string
  temporary: boolean
}

export type ReturnControlAction = {
  type: 'RETURN_CONTROL'
  playerId: PlayerId
  cardId: string
}

// ── Token actions ─────────────────────────────────────────────────────────────

export type CreateTokenAction = {
  type: 'CREATE_TOKEN'
  playerId: PlayerId
  cardId: string
  name: string
  cardType: CardType
  imageUrl: string
  zoneId: ZoneId
  exhausted?: boolean
}

export type DestroyTokenAction = {
  type: 'DESTROY_TOKEN'
  playerId: PlayerId
  cardId: string
}

export type SetKeywordsAction = {
  type: 'SET_KEYWORDS'
  playerId: PlayerId
  cardId: string
  keywords: string[]
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
  | GroupCardAction
  | UngroupCardAction
  | ToggleExhaustedAction
  | SetCountersAction
  | SetDamagesAction
  | SetBuffAction
  | CreateTokenAction
  | DestroyTokenAction
  | CopyCardAction
  | TakeControlAction
  | ReturnControlAction
  | SetKeywordsAction
  // | CopyCardAction
  // | RevealCardForControllerAction
  // | GroupCardAction
  // | UngroupCardAction
  // | AddToStackAction
  // | PlayTokenCardAction
  // | CreateTokenAction
  // | ShuffleHandAction

export type GameActionType = GameAction['type'];
