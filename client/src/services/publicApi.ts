import type { FeatureFlag, Announcement, PatchNote } from '@riftbound/shared'
import { apiFetch } from './http'

export type AnnouncementDto = Omit<Announcement, 'startsAt' | 'endsAt'> & { startsAt: string | null; endsAt: string | null }
export type PatchNotePublicDto = Omit<PatchNote, 'publishedAt' | 'createdAt' | 'updatedAt'> & { publishedAt: string | null; createdAt: string; updatedAt: string }

export const publicApi = {
  flags(): Promise<FeatureFlag[]> { return apiFetch('GET', '/public/flags') },
  announcements(): Promise<AnnouncementDto[]> { return apiFetch('GET', '/public/announcements') },
  patchNotes(): Promise<PatchNotePublicDto[]> { return apiFetch('GET', '/public/patch-notes') },
  maintenance(): Promise<{ enabled: boolean; message: string }> { return apiFetch('GET', '/public/maintenance') },
  report(input: { scope: 'game' | 'lobby'; containerId: string; messageId: string; messageText: string; targetUid: string; reason: string }): Promise<unknown> {
    return apiFetch('POST', '/public/report', input)
  },
  bugReport(input: { message: string; severity: string; gameId?: string | null; clientVersion: string }): Promise<unknown> {
    return apiFetch('POST', '/public/bug-report', input)
  },
  reportError(input: { message: string; stack?: string; path?: string; clientVersion: string }): Promise<void> {
    return apiFetch('POST', '/public/error', input)
  },
  consent(version: string): Promise<void> {
    return apiFetch('POST', '/public/consent', { version })
  },
}
