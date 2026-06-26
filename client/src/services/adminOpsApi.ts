import type { FeatureFlag, MaintenanceState, ChatModerationConfig, MessageReport, SeedResult, Role, ReportStatus } from '@riftbound/shared'
import { apiFetch } from './http'

export type MessageReportDto = Omit<MessageReport, 'createdAt'> & { createdAt: string }

export const adminOpsApi = {
  // Feature flags
  listFlags(): Promise<FeatureFlag[]> { return apiFetch('GET', '/admin/flags') },
  upsertFlag(flag: FeatureFlag): Promise<FeatureFlag> { return apiFetch('POST', '/admin/flags', flag) },
  deleteFlag(key: string): Promise<void> { return apiFetch('DELETE', `/admin/flags/${key}`) },

  // Maintenance
  getMaintenance(): Promise<MaintenanceState> { return apiFetch('GET', '/admin/maintenance') },
  setMaintenance(state: { enabled: boolean; message: string; allowRoles: Role[] }): Promise<MaintenanceState> {
    return apiFetch('POST', '/admin/maintenance', state)
  },

  // Config modération chat
  getChatConfig(): Promise<ChatModerationConfig> { return apiFetch('GET', '/admin/chat-config') },
  setChatConfig(extraBlockedWords: string[]): Promise<ChatModerationConfig> {
    return apiFetch('POST', '/admin/chat-config', { extraBlockedWords })
  },

  // Signalements
  listReports(status?: ReportStatus): Promise<MessageReportDto[]> {
    return apiFetch('GET', `/admin/reports${status ? `?status=${status}` : ''}`)
  },
  resolveReport(id: string, deleteMessage: boolean): Promise<void> {
    return apiFetch('POST', `/admin/reports/${id}/resolve`, { deleteMessage })
  },
  mute(uid: string, muted: boolean): Promise<void> {
    return apiFetch('POST', `/admin/users/${uid}/mute`, { muted })
  },

  // Seed (non-prod)
  seed(): Promise<SeedResult> { return apiFetch('POST', '/admin/seed') },
}
