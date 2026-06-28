import type {
  OfficialPlaymat, UnicolorTheme, PlayerPlaymat, PlaymatVariant, ZoneStyle, PlaymatSettings, PlaymatCatalogDto,
} from '@riftbound/shared'
import { MAX_PLAYER_PLAYMATS_PER_VARIANT, DEFAULT_ZONE_STYLE, DEFAULT_PLAYMAT_SETTINGS } from '@riftbound/shared'
import {
  OfficialPlaymatRepository, UnicolorThemeRepository, PlayerPlaymatRepository, PlaymatSettingsRepository,
} from '../repositories/playmat.repository'
import { AuditService, type AuditActor } from './audit.service'

function sanitizeZoneStyle(input: unknown): ZoneStyle {
  const z = (input ?? {}) as Partial<ZoneStyle>
  const str = (v: unknown, fallback: string) =>
    typeof v === 'string' && v.length <= 64 ? v : fallback
  return {
    background: str(z.background, DEFAULT_ZONE_STYLE.background),
    border: str(z.border, DEFAULT_ZONE_STYLE.border),
    label: str(z.label, DEFAULT_ZONE_STYLE.label),
  }
}

export class PlaymatService {
  constructor(
    private readonly official: OfficialPlaymatRepository,
    private readonly unicolor: UnicolorThemeRepository,
    private readonly player: PlayerPlaymatRepository,
    private readonly settings: PlaymatSettingsRepository,
    private readonly audit: AuditService,
  ) {}

  // ── Catalogue public (joueur) ──────────────────────────────────────────────
  async catalog(): Promise<{ official: OfficialPlaymat[]; unicolors: UnicolorTheme[] }> {
    const [official, unicolors] = await Promise.all([this.official.list(), this.unicolor.list()])
    return { official, unicolors }
  }

  // ── Officiels (admin) ──────────────────────────────────────────────────────
  listOfficial() { return this.official.list() }

  async createOfficial(actor: AuditActor, input: { name: string; variant: PlaymatVariant; imageUrl: string; storagePath: string; zoneStyle: unknown }) {
    const mat = await this.official.create({
      name: input.name.slice(0, 80),
      variant: input.variant === 'half' ? 'half' : 'full',
      imageUrl: input.imageUrl,
      storagePath: input.storagePath,
      zoneStyle: sanitizeZoneStyle(input.zoneStyle),
    })
    await this.audit.record({ actor, action: 'content.playmat_create', targetType: 'playmat', targetId: mat.id, before: null, after: { name: mat.name, variant: mat.variant } })
    return mat
  }

  async updateOfficial(actor: AuditActor, id: string, patch: { name?: string; zoneStyle?: unknown }) {
    const update: Partial<Pick<OfficialPlaymat, 'name' | 'zoneStyle'>> = {}
    if (typeof patch.name === 'string') update.name = patch.name.slice(0, 80)
    if (patch.zoneStyle !== undefined) update.zoneStyle = sanitizeZoneStyle(patch.zoneStyle)
    const mat = await this.official.update(id, update)
    if (!mat) throw new Error('NOT_FOUND')
    await this.audit.record({ actor, action: 'content.playmat_update', targetType: 'playmat', targetId: id, before: null, after: { name: mat.name } })
    return mat
  }

  async removeOfficial(actor: AuditActor, id: string) {
    const mat = await this.official.remove(id)
    if (!mat) throw new Error('NOT_FOUND')
    await this.audit.record({ actor, action: 'content.playmat_delete', targetType: 'playmat', targetId: id, before: { storagePath: mat.storagePath }, after: null })
    // L'objet Storage est supprimé côté client (le back-office a le droit de delete).
    return mat
  }

  async setOfficialDefault(actor: AuditActor, id: string) {
    const mat = await this.official.setDefault(id)
    if (!mat) throw new Error('NOT_FOUND')
    await this.audit.record({ actor, action: 'content.playmat_set_default', targetType: 'playmat', targetId: id, before: null, after: { variant: mat.variant } })
    return mat
  }

  // ── Thèmes unis (admin) ─────────────────────────────────────────────────────
  listUnicolors() { return this.unicolor.list() }

  async createUnicolor(actor: AuditActor, input: { name: string; backgroundCss: string; zoneStyle: unknown }) {
    const theme = await this.unicolor.create({
      name: input.name.slice(0, 80),
      backgroundCss: String(input.backgroundCss).slice(0, 400),
      zoneStyle: sanitizeZoneStyle(input.zoneStyle),
    })
    await this.audit.record({ actor, action: 'content.unicolor_create', targetType: 'unicolor', targetId: theme.id, before: null, after: { name: theme.name } })
    return theme
  }

  async updateUnicolor(actor: AuditActor, id: string, patch: { name?: string; backgroundCss?: string; zoneStyle?: unknown }) {
    const update: Partial<Pick<UnicolorTheme, 'name' | 'backgroundCss' | 'zoneStyle'>> = {}
    if (typeof patch.name === 'string') update.name = patch.name.slice(0, 80)
    if (typeof patch.backgroundCss === 'string') update.backgroundCss = patch.backgroundCss.slice(0, 400)
    if (patch.zoneStyle !== undefined) update.zoneStyle = sanitizeZoneStyle(patch.zoneStyle)
    const theme = await this.unicolor.update(id, update)
    if (!theme) throw new Error('NOT_FOUND')
    await this.audit.record({ actor, action: 'content.unicolor_update', targetType: 'unicolor', targetId: id, before: null, after: { name: theme.name } })
    return theme
  }

  async removeUnicolor(actor: AuditActor, id: string) {
    await this.unicolor.remove(id)
    await this.audit.record({ actor, action: 'content.unicolor_delete', targetType: 'unicolor', targetId: id, before: null, after: null })
  }

  async setUnicolorDefault(actor: AuditActor, id: string) {
    const theme = await this.unicolor.setDefault(id)
    if (!theme) throw new Error('NOT_FOUND')
    await this.audit.record({ actor, action: 'content.unicolor_set_default', targetType: 'unicolor', targetId: id, before: null, after: null })
    return theme
  }

  // ── Images joueur ────────────────────────────────────────────────────────────
  listMine(uid: string) { return this.player.listByOwner(uid) }

  async addMine(uid: string, input: { variant: PlaymatVariant; imageUrl: string; storagePath: string; zoneStyle: unknown }): Promise<PlayerPlaymat> {
    const variant: PlaymatVariant = input.variant === 'half' ? 'half' : 'full'
    if (!input.imageUrl || !input.storagePath) throw new Error('INVALID')
    const count = await this.player.countByOwnerVariant(uid, variant)
    if (count >= MAX_PLAYER_PLAYMATS_PER_VARIANT) throw new Error('LIMIT_REACHED')
    return this.player.create({
      ownerUid: uid,
      variant,
      imageUrl: input.imageUrl,
      storagePath: input.storagePath,
      zoneStyle: sanitizeZoneStyle(input.zoneStyle),
    })
  }

  async removeMine(uid: string, id: string): Promise<PlayerPlaymat> {
    const mat = await this.player.findById(id)
    if (!mat || mat.ownerUid !== uid) throw new Error('NOT_FOUND')
    await this.player.remove(id)
    // Le fichier Storage est supprimé côté client (règle owner-delete). Si le fond
    // actif pointait dessus, le rendu retombe sur le thème uni par défaut.
    return mat
  }

  // ── Préférences ───────────────────────────────────────────────────────────────
  getSettings(uid: string) { return this.settings.get(uid) }

  async setSettings(uid: string, input: unknown): Promise<PlaymatSettings> {
    const s = (input ?? {}) as Partial<PlaymatSettings>
    const kind = s.kind === 'official' || s.kind === 'player' ? s.kind : 'unicolor'
    const settings: PlaymatSettings = {
      kind,
      id: typeof s.id === 'string' ? s.id : null,
      halfMode: !!s.halfMode,
      random: !!s.random,
      includeOfficialInRandom: !!s.includeOfficialInRandom,
    }
    return this.settings.set(uid, settings)
  }
}

export const playmatCatalogToDto = (c: { official: OfficialPlaymat[]; unicolors: UnicolorTheme[] }): PlaymatCatalogDto => ({
  official: c.official.map((o) => ({ ...o, createdAt: o.createdAt.toISOString(), updatedAt: o.updatedAt.toISOString() })),
  unicolors: c.unicolors.map((u) => ({ ...u, createdAt: u.createdAt.toISOString(), updatedAt: u.updatedAt.toISOString() })),
})

export { DEFAULT_PLAYMAT_SETTINGS }
