import type { BetaSettings, BetaPhase, Invite, WaitlistEntry, WaitlistStatus } from '@riftbound/shared'
import { apiFetch } from './http'

export type InviteDto = Omit<Invite, 'createdAt' | 'expiresAt'> & { createdAt: string; expiresAt: string | null }
export type WaitlistDto = Omit<WaitlistEntry, 'requestedAt' | 'decidedAt'> & { requestedAt: string; decidedAt: string | null }
export type BetaSettingsDto = Omit<BetaSettings, 'updatedAt'> & { updatedAt: string | null }

export const adminBetaApi = {
  getSettings(): Promise<BetaSettingsDto> {
    return apiFetch('GET', '/admin/beta/settings')
  },
  setPhase(phase: BetaPhase): Promise<BetaSettingsDto> {
    return apiFetch('POST', '/admin/beta/phase', { phase })
  },
  listInvites(): Promise<InviteDto[]> {
    return apiFetch('GET', '/admin/invites')
  },
  createInvite(maxUses: number, expiresAt: string | null): Promise<InviteDto> {
    return apiFetch('POST', '/admin/invites', { maxUses, expiresAt })
  },
  revokeInvite(code: string): Promise<void> {
    return apiFetch('DELETE', `/admin/invites/${code}`)
  },
  listWaitlist(): Promise<WaitlistDto[]> {
    return apiFetch('GET', '/admin/waitlist')
  },
  decideWaitlist(ids: string[], status: Extract<WaitlistStatus, 'approved' | 'rejected'>, note?: string): Promise<WaitlistDto[]> {
    return apiFetch('POST', '/admin/waitlist/decide', { ids, status, note })
  },
}
