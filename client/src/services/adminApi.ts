import type { AuditLogEntry, AuditLogFilter, Role } from '@riftbound/shared'
import type { UserDto } from './userApi'
import { apiFetch } from './http'

export interface AuditLogDto extends Omit<AuditLogEntry, 'at'> {
  at: string
}

export const adminApi = {
  assignRole(uid: string, role: Role | null): Promise<UserDto> {
    return apiFetch('POST', '/admin/roles', { uid, role })
  },

  revokeRole(uid: string): Promise<UserDto> {
    return apiFetch('DELETE', `/admin/roles/${uid}`)
  },

  listAudit(filter: AuditLogFilter = {}): Promise<AuditLogDto[]> {
    const params = new URLSearchParams()
    if (filter.actorUid) params.set('actorUid', filter.actorUid)
    if (filter.action) params.set('action', filter.action)
    if (filter.targetType) params.set('targetType', filter.targetType)
    if (filter.targetId) params.set('targetId', filter.targetId)
    if (filter.limit) params.set('limit', String(filter.limit))
    const qs = params.toString()
    return apiFetch('GET', `/admin/audit${qs ? `?${qs}` : ''}`)
  },
}
