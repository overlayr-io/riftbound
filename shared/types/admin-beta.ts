import type { BetaPhase, Invite, WaitlistStatus } from './admin'
import type { BetaAccess } from './user'

export interface BetaSettings {
  phase: BetaPhase
  updatedAt: Date | null
  updatedBy: string | null
}

export interface CreateInvitePayload {
  maxUses: number
  expiresAt: Date | null
  note?: string
}

export interface InviteWithLink extends Invite {
  /** Lien d'invitation prêt à partager (front consomme ?code=). */
  link: string
}

/** Réponse du gate joueur : où en est l'utilisateur courant vis-à-vis de la beta. */
export interface BetaAccessState {
  phase: BetaPhase
  betaAccess: BetaAccess
  /** true = le joueur peut accéder au jeu sans action supplémentaire. */
  allowed: boolean
}

export interface RedeemResult {
  ok: boolean
  betaAccess: BetaAccess
}

export interface WaitlistDecisionPayload {
  ids: string[]
  status: Extract<WaitlistStatus, 'approved' | 'rejected'>
  note?: string
}
