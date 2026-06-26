import type { CardBase, PatchNote, Announcement, CardType, AnnouncementLevel, PatchNoteStatus, Role } from '@riftbound/shared'
import { apiFetch } from './http'

export type CardDto = Omit<CardBase, 'updatedAt'> & { updatedAt: string }
export type PatchNoteDto = Omit<PatchNote, 'publishedAt' | 'createdAt' | 'updatedAt'> & { publishedAt: string | null; createdAt: string; updatedAt: string }
export type AnnouncementDto = Omit<Announcement, 'startsAt' | 'endsAt'> & { startsAt: string | null; endsAt: string | null }

export const adminContentApi = {
  // Cartes
  listCards(): Promise<CardDto[]> { return apiFetch('GET', '/admin/cards') },
  upsertCard(baseCardId: string, name: string, type: CardType, imageUrl: string): Promise<CardDto> {
    return apiFetch('POST', '/admin/cards', { baseCardId, name, type, imageUrl })
  },
  deleteCard(id: string): Promise<void> { return apiFetch('DELETE', `/admin/cards/${id}`) },

  // Patch notes
  listNotes(): Promise<PatchNoteDto[]> { return apiFetch('GET', '/admin/patch-notes') },
  createNote(title: string, version: string, body: string, status: PatchNoteStatus): Promise<PatchNoteDto> {
    return apiFetch('POST', '/admin/patch-notes', { title, version, body, status })
  },
  updateNote(id: string, patch: Partial<{ title: string; version: string; body: string; status: PatchNoteStatus }>): Promise<PatchNoteDto> {
    return apiFetch('PATCH', `/admin/patch-notes/${id}`, patch)
  },
  deleteNote(id: string): Promise<void> { return apiFetch('DELETE', `/admin/patch-notes/${id}`) },

  // Annonces
  listAnnouncements(): Promise<AnnouncementDto[]> { return apiFetch('GET', '/admin/announcements') },
  createAnnouncement(input: { message: string; level: AnnouncementLevel; startsAt: string | null; endsAt: string | null; targetRoles: Role[] | null }): Promise<AnnouncementDto> {
    return apiFetch('POST', '/admin/announcements', input)
  },
  deleteAnnouncement(id: string): Promise<void> { return apiFetch('DELETE', `/admin/announcements/${id}`) },
}
