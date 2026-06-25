import type { UserSummary, UserDetail, UsersFilter, ImpersonationToken } from '@riftbound/shared'
import { apiFetch } from './http'

type Iso<T> = { [K in keyof T]: T[K] extends Date ? string : T[K] extends Date | null ? string | null : T[K] }
export type UserSummaryDto = Iso<UserSummary>
export type UserDetailDto = Iso<Omit<UserDetail, 'games' | 'session'>> & {
  games: import('./adminGamesApi').GameSummaryDto[]
  session: { lastSignInAt: string | null; lastRefreshAt: string | null; provider: string }
}

export const adminUsersApi = {
  list(filter: UsersFilter = {}): Promise<UserSummaryDto[]> {
    const p = new URLSearchParams()
    if (filter.search) p.set('search', filter.search)
    if (filter.status) p.set('status', filter.status)
    if (filter.role) p.set('role', filter.role)
    if (filter.betaAccess) p.set('betaAccess', filter.betaAccess)
    const qs = p.toString()
    return apiFetch('GET', `/admin/users${qs ? `?${qs}` : ''}`)
  },
  detail(uid: string): Promise<UserDetailDto> {
    return apiFetch('GET', `/admin/users/${uid}`)
  },
  suspend(uid: string, durationMs: number, reason: string): Promise<UserDetailDto> {
    return apiFetch('POST', `/admin/users/${uid}/suspend`, { durationMs, reason })
  },
  ban(uid: string, reason: string): Promise<UserDetailDto> {
    return apiFetch('POST', `/admin/users/${uid}/ban`, { reason })
  },
  reactivate(uid: string): Promise<UserDetailDto> {
    return apiFetch('POST', `/admin/users/${uid}/reactivate`)
  },
  resetDisplayName(uid: string, displayName: string): Promise<UserDetailDto> {
    return apiFetch('POST', `/admin/users/${uid}/displayname`, { displayName })
  },
  forceLogout(uid: string): Promise<void> {
    return apiFetch('POST', `/admin/users/${uid}/force-logout`)
  },
  softDelete(uid: string): Promise<void> {
    return apiFetch('POST', `/admin/users/${uid}/soft-delete`)
  },
  hardDelete(uid: string): Promise<void> {
    return apiFetch('DELETE', `/admin/users/${uid}`)
  },
  impersonate(uid: string): Promise<ImpersonationToken> {
    return apiFetch('POST', `/admin/users/${uid}/impersonate`)
  },
}
