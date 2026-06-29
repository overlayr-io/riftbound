import type { Request, Response, NextFunction } from 'express'
import { PlaymatService } from '../services/playmat.service'
import {
  OfficialPlaymatRepository, UnicolorThemeRepository, PlayerPlaymatRepository, PlaymatSettingsRepository,
} from '../repositories/playmat.repository'
import { AuditService } from '../services/audit.service'
import { AuditRepository } from '../repositories/audit.repository'
import { actorOf } from '../middlewares/rbac.middleware'
import {
  uploadPlaymatFile, deletePlaymatFile, buildOfficialPath,
} from '../services/playmatStorage.service'
import type { PlaymatVariant, ZoneStyle } from '@riftbound/shared'

const service = new PlaymatService(
  new OfficialPlaymatRepository(),
  new UnicolorThemeRepository(),
  new PlayerPlaymatRepository(),
  new PlaymatSettingsRepository(),
  new AuditService(new AuditRepository()),
)

const param = (p: string | string[]): string => (Array.isArray(p) ? p[0] : p)
const notFound = (e: unknown, res: Response) =>
  e instanceof Error && e.message === 'NOT_FOUND' ? (res.status(404).json({ error: 'Not found' }), true) : false

// ── Officiels ──
export async function listOfficial(_req: Request, res: Response, next: NextFunction) {
  try { res.json(await service.listOfficial()) } catch (e) { next(e) }
}

export async function createOfficial(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.file) { res.status(400).json({ error: 'Fichier manquant' }); return }

    const { name } = req.body
    const variant = req.body.variant as PlaymatVariant
    if (!name || (variant !== 'full' && variant !== 'half')) {
      res.status(400).json({ error: 'Champs manquants ou invalides' }); return
    }

    let zoneStyle: ZoneStyle | undefined
    try { zoneStyle = req.body.zoneStyle ? JSON.parse(req.body.zoneStyle) : undefined } catch {
      res.status(400).json({ error: 'zoneStyle JSON invalide' }); return
    }

    const id = crypto.randomUUID()
    const storagePath = buildOfficialPath(variant, id)
    const imageUrl = await uploadPlaymatFile(storagePath, req.file.buffer, req.file.mimetype)

    res.status(201).json(
      await service.createOfficial(actorOf(req), { name, variant, imageUrl, storagePath, zoneStyle }),
    )
  } catch (e) { next(e) }
}

export async function updateOfficial(req: Request, res: Response, next: NextFunction) {
  try { res.json(await service.updateOfficial(actorOf(req), param(req.params.id), req.body ?? {})) }
  catch (e) { if (notFound(e, res)) return; next(e) }
}

export async function deleteOfficial(req: Request, res: Response, next: NextFunction) {
  try {
    const deleted = await service.removeOfficial(actorOf(req), param(req.params.id))
    await deletePlaymatFile(deleted.storagePath)
    res.json(deleted)
  } catch (e) { if (notFound(e, res)) return; next(e) }
}

export async function setOfficialDefault(req: Request, res: Response, next: NextFunction) {
  try { res.json(await service.setOfficialDefault(actorOf(req), param(req.params.id))) }
  catch (e) { if (notFound(e, res)) return; next(e) }
}

// ── Thèmes unis ──
export async function listUnicolors(_req: Request, res: Response, next: NextFunction) {
  try { res.json(await service.listUnicolors()) } catch (e) { next(e) }
}

export async function createUnicolor(req: Request, res: Response, next: NextFunction) {
  try {
    const { name, backgroundCss, zoneStyle } = req.body
    if (!name || !backgroundCss) { res.status(400).json({ error: 'Missing fields' }); return }
    res.status(201).json(await service.createUnicolor(actorOf(req), { name, backgroundCss, zoneStyle }))
  } catch (e) { next(e) }
}

export async function updateUnicolor(req: Request, res: Response, next: NextFunction) {
  try { res.json(await service.updateUnicolor(actorOf(req), param(req.params.id), req.body ?? {})) }
  catch (e) { if (notFound(e, res)) return; next(e) }
}

export async function deleteUnicolor(req: Request, res: Response, next: NextFunction) {
  try { await service.removeUnicolor(actorOf(req), param(req.params.id)); res.status(204).send() }
  catch (e) { next(e) }
}

export async function setUnicolorDefault(req: Request, res: Response, next: NextFunction) {
  try { res.json(await service.setUnicolorDefault(actorOf(req), param(req.params.id))) }
  catch (e) { if (notFound(e, res)) return; next(e) }
}
