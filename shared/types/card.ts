import {PlayerId} from "./player";
import {ZoneId} from "./zone";

export type CardId = string;
export type CardType = 'rune' | 'unit' | 'spell' | 'gear' | 'battlefield' | 'legend'
export type CardVisibleTo = 'ALL' | 'SELF' | 'NOBODY'

/**
 * Deck-level card (static description), as produced by the deck-list import.
 * `baseCardId` references the canonical card; `id` is the per-copy instance id.
 */
export interface Card {
  id: CardId
  baseCardId: CardId
  name: string
  type: CardType
  imageUrl: string
}

export interface CardState {
  cardId: CardId
  baseCardId: CardId

  description: {
    name: string
    type: CardType
    imageUrl: string
  }

  ownerId: PlayerId
  controllerId: PlayerId

  zoneId: ZoneId
  order: number

  state: {
    exhausted: boolean
    counters: number | null
    damages: number | null
    buffs: number | null
    visibleTo: CardVisibleTo
    groupTo: CardId[]
  }

  isToken: boolean
}


export interface DeckList {
  legend: Card | null
  champion: Card | null
  battlefields: Card[]
  mainDeck: Card[]
  runes: Card[]
  sideboard: Card[]
}
