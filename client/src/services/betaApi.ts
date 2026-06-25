import type { BetaAccessState } from '@riftbound/shared'
import { apiFetch } from './http'

/** API joueur du système beta (/api/beta). */
export const betaApi = {
  access(): Promise<BetaAccessState> {
    return apiFetch('GET', '/beta/access')
  },
  redeem(code: string): Promise<BetaAccessState> {
    return apiFetch('POST', '/beta/redeem', { code })
  },
  joinWaitlist(email: string): Promise<BetaAccessState> {
    return apiFetch('POST', '/beta/waitlist', { email })
  },
}
