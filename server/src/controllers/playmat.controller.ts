import type { Request, Response, NextFunction } from 'express'
import { PlaymatService, playmatCatalogToDto } from '../services/playmat.service'
import {
  OfficialPlaymatRepository, UnicolorThemeRepository, PlayerPlaymatRepository, PlaymatSettingsRepository,
} from '../repositories/playmat.repository'
import { AuditService } from '../services/audit.service'
import { AuditRepository } from '../repositories/audit.repository'
import {
  uploadPlaymatFile, deletePlaymatFile, buildPlayerPath,
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

export async function getCatalog(_req: Request, res: Response, next: NextFunction) {
  try { res.json(playmatCatalogToDto(await service.catalog())) } catch (e) { next(e) }
}

export async function listMyPlaymats(req: Request, res: Response, next: NextFunction) {
  try { res.json(await service.listMine(req.user!.uid)) } catch (e) { next(e) }
}

export async function addMyPlaymat(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.file) { res.status(400).json({ error: 'Fichier manquant' }); return }

    const variant = req.body.variant as PlaymatVariant
    if (variant !== 'full' && variant !== 'half') {
      res.status(400).json({ error: 'variant must be full or half' }); return
    }

    let zoneStyle: ZoneStyle | undefined
    try { zoneStyle = req.body.zoneStyle ? JSON.parse(req.body.zoneStyle) : undefined } catch {
      res.status(400).json({ error: 'zoneStyle JSON invalide' }); return
    }

    const id = crypto.randomUUID()
    const storagePath = buildPlayerPath(req.user!.uid, variant, id)
    const imageUrl = await uploadPlaymatFile(storagePath, req.file.buffer, req.file.mimetype)

    res.status(201).json(
      await service.addMine(req.user!.uid, { variant, imageUrl, storagePath, zoneStyle }),
    )
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'LIMIT_REACHED') {
      res.status(409).json({ error: 'Limite de 3 images atteinte pour cette variante' }); return
    }
    next(e)
  }
}

export async function deleteMyPlaymat(req: Request, res: Response, next: NextFunction) {
  try {
    const deleted = await service.removeMine(req.user!.uid, param(req.params.id))
    await deletePlaymatFile(deleted.storagePath)
    res.json(deleted)
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'NOT_FOUND') {
      res.status(404).json({ error: 'Not found' }); return
    }
    next(e)
  }
}

export async function getMySettings(req: Request, res: Response, next: NextFunction) {
  try { res.json(await service.getSettings(req.user!.uid)) } catch (e) { next(e) }
}

export async function putMySettings(req: Request, res: Response, next: NextFunction) {
  try { res.json(await service.setSettings(req.user!.uid, req.body)) } catch (e) { next(e) }
}
