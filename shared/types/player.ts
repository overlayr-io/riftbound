import {Card, CardId} from "./card";
import {DeckList} from "./card";

export type PlayerId = string;
export interface Player {
  playerId: PlayerId
}

export interface PlayerState {
  playerId: PlayerId
  score: number

  /**
   * Below: setup phase only.
   */
  hasSubmittedDeck: boolean
  deckList: DeckList | null
  legendCard: Card | null
  submittedBattlefield: CardId | null
  battlefieldCard: Card | null
  diceRoll: number | null
  mulliganCount: number | null
  mulliganDone: boolean
  sideboardDone: boolean
}
