import type { CardBase, PatchNote, Announcement } from '@riftbound/shared'
import { CardRepository } from '../repositories/card.repository'
import { PatchNoteRepository } from '../repositories/patch-note.repository'
import { AnnouncementRepository } from '../repositories/announcement.repository'
import { AuditService, type AuditActor } from './audit.service'

export class ContentService {
  constructor(
    private readonly cards: CardRepository,
    private readonly notes: PatchNoteRepository,
    private readonly anns: AnnouncementRepository,
    private readonly audit: AuditService,
  ) {}

  // ── Cartes ──
  listCards() { return this.cards.list() }
  async upsertCard(actor: AuditActor, input: Pick<CardBase, 'baseCardId' | 'name' | 'type' | 'imageUrl'>) {
    const card = await this.cards.upsert(input)
    await this.audit.record({ actor, action: 'content.card_upsert', targetType: 'card', targetId: input.baseCardId, before: null, after: { name: input.name } })
    return card
  }
  async removeCard(actor: AuditActor, id: string) {
    await this.cards.remove(id)
    await this.audit.record({ actor, action: 'content.card_delete', targetType: 'card', targetId: id, before: null, after: null })
  }

  // ── Patch notes ──
  listNotes() { return this.notes.list() }
  publishedNotes() { return this.notes.published() }
  async createNote(actor: AuditActor, input: Pick<PatchNote, 'title' | 'version' | 'body' | 'status'>) {
    const note = await this.notes.create(input)
    await this.audit.record({ actor, action: 'content.patchnote_create', targetType: 'patchNote', targetId: note.id, before: null, after: { status: input.status } })
    return note
  }
  async updateNote(actor: AuditActor, id: string, patch: Partial<Pick<PatchNote, 'title' | 'version' | 'body' | 'status'>>) {
    const note = await this.notes.update(id, patch)
    if (!note) throw new Error('NOT_FOUND')
    await this.audit.record({ actor, action: 'content.patchnote_update', targetType: 'patchNote', targetId: id, before: null, after: { status: note.status } })
    return note
  }
  async removeNote(actor: AuditActor, id: string) {
    await this.notes.remove(id)
    await this.audit.record({ actor, action: 'content.patchnote_delete', targetType: 'patchNote', targetId: id, before: null, after: null })
  }

  // ── Annonces ──
  listAnnouncements() { return this.anns.list() }
  activeAnnouncements() { return this.anns.active() }
  async createAnnouncement(actor: AuditActor, input: Omit<Announcement, 'id'>) {
    const ann = await this.anns.create(input)
    await this.audit.record({ actor, action: 'content.announce_create', targetType: 'announcement', targetId: ann.id, before: null, after: { level: input.level } })
    return ann
  }
  async removeAnnouncement(actor: AuditActor, id: string) {
    await this.anns.remove(id)
    await this.audit.record({ actor, action: 'content.announce_delete', targetType: 'announcement', targetId: id, before: null, after: null })
  }
}
