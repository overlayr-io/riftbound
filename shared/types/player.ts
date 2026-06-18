import {CardId} from "./card";

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
  submittedBattlefield: CardId | null
  diceRoll: number | null
  mulliganCount: number | null
  mulliganDone: boolean
}
