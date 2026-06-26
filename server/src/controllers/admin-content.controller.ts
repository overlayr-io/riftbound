import type { Request, Response, NextFunction } from 'express'
import { ContentService } from '../services/content.service'
import { CardRepository } from '../repositories/card.repository'
import { PatchNoteRepository } from '../repositories/patch-note.repository'
import { AnnouncementRepository } from '../repositories/announcement.repository'
import { AuditService } from '../services/audit.service'
import { AuditRepository } from '../repositories/audit.repository'
import { actorOf } from '../middlewares/rbac.middleware'

const service = new ContentService(
  new CardRepository(), new PatchNoteRepository(), new AnnouncementRepository(),
  new AuditService(new AuditRepository()),
)
const param = (p: string | string[]): string => (Array.isArray(p) ? p[0] : p)

// ── Cartes ──
export async function listCards(_req: Request, res: Response, next: NextFunction) {
  try { res.json(await service.listCards()) } catch (e) { next(e) }
}
export async function upsertCard(req: Request, res: Response, next: NextFunction) {
  try {
    const { baseCardId, name, type, imageUrl } = req.body
    if (!baseCardId || !name || !type) { res.status(400).json({ error: 'Missing fields' }); return }
    res.json(await service.upsertCard(actorOf(req), { baseCardId, name, type, imageUrl: imageUrl ?? '' }))
  } catch (e) { next(e) }
}
export async function deleteCard(req: Request, res: Response, next: NextFunction) {
  try { await service.removeCard(actorOf(req), param(req.params.id)); res.status(204).send() } catch (e) { next(e) }
}

// ── Patch notes ──
export async function listNotes(_req: Request, res: Response, next: NextFunction) {
  try { res.json(await service.listNotes()) } catch (e) { next(e) }
}
export async function createNote(req: Request, res: Response, next: NextFunction) {
  try {
    const { title, version, body, status } = req.body
    if (!title) { res.status(400).json({ error: 'Missing title' }); return }
    res.status(201).json(await service.createNote(actorOf(req), { title, version: version ?? '', body: body ?? '', status: status === 'published' ? 'published' : 'draft' }))
  } catch (e) { next(e) }
}
export async function updateNote(req: Request, res: Response, next: NextFunction) {
  try { res.json(await service.updateNote(actorOf(req), param(req.params.id), req.body ?? {})) }
  catch (e: unknown) { if (e instanceof Error && e.message === 'NOT_FOUND') { res.status(404).json({ error: 'Not found' }); return } next(e) }
}
export async function deleteNote(req: Request, res: Response, next: NextFunction) {
  try { await service.removeNote(actorOf(req), param(req.params.id)); res.status(204).send() } catch (e) { next(e) }
}

// ── Annonces ──
export async function listAnnouncements(_req: Request, res: Response, next: NextFunction) {
  try { res.json(await service.listAnnouncements()) } catch (e) { next(e) }
}
export async function createAnnouncement(req: Request, res: Response, next: NextFunction) {
  try {
    const { message, level, startsAt, endsAt, targetRoles } = req.body
    if (!message) { res.status(400).json({ error: 'Missing message' }); return }
    res.status(201).json(await service.createAnnouncement(actorOf(req), {
      message, level: level ?? 'info',
      startsAt: startsAt ? new Date(startsAt) : null,
      endsAt: endsAt ? new Date(endsAt) : null,
      targetRoles: targetRoles ?? null,
    }))
  } catch (e) { next(e) }
}
export async function deleteAnnouncement(req: Request, res: Response, next: NextFunction) {
  try { await service.removeAnnouncement(actorOf(req), param(req.params.id)); res.status(204).send() } catch (e) { next(e) }
}
