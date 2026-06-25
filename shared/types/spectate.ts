import type { CardState } from './card'
import type { PlayerId } from './player'

/**
 * Couche de visibilité — SOURCE UNIQUE partagée client/serveur.
 * La god view admin révèle tout ; le mode `player` (futur spectate joueur)
 * masquera les mains/cartes adverses selon `visibleTo`. Garder cette logique
 * isolée ici évite qu'un futur spectate joueur ne fuite d'information.
 */
export type SpectatorView =
  | { mode: 'god' }
  | { mode: 'player'; uid: PlayerId }

export function isCardFaceVisible(card: CardState, view: SpectatorView): boolean {
  if (view.mode === 'god') return true
  switch (card.state.visibleTo) {
    case 'ALL':
      return true
    case 'SELF':
      return card.ownerId === view.uid || card.controllerId === view.uid
    case 'NOBODY':
    default:
      return false
  }
}
