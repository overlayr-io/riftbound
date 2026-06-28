import type {
  OfficialPlaymat, UnicolorTheme, PlayerPlaymat, PlaymatVariant, ZoneStyle, PlaymatSettings,
} from '@riftbound/shared'
import { DEFAULT_PLAYMAT_SETTINGS, DEFAULT_ZONE_STYLE } from '@riftbound/shared'
import { db } from '../config/firebase'
import { FieldValue } from 'firebase-admin/firestore'

function toZoneStyle(d: FirebaseFirestore.DocumentData | undefined): ZoneStyle {
  if (!d) return { ...DEFAULT_ZONE_STYLE }
  return {
    background: d.background ?? DEFAULT_ZONE_STYLE.background,
    border: d.border ?? DEFAULT_ZONE_STYLE.border,
    label: d.label ?? DEFAULT_ZONE_STYLE.label,
  }
}

function toOfficial(id: string, d: FirebaseFirestore.DocumentData): OfficialPlaymat {
  return {
    id,
    name: d.name ?? '',
    variant: (d.variant as PlaymatVariant) ?? 'full',
    imageUrl: d.imageUrl ?? '',
    storagePath: d.storagePath ?? '',
    zoneStyle: toZoneStyle(d.zoneStyle),
    isDefault: d.isDefault ?? false,
    createdAt: d.createdAt?.toDate() ?? new Date(),
    updatedAt: d.updatedAt?.toDate() ?? new Date(),
  }
}

function toUnicolor(id: string, d: FirebaseFirestore.DocumentData): UnicolorTheme {
  return {
    id,
    name: d.name ?? '',
    backgroundCss: d.backgroundCss ?? '',
    zoneStyle: toZoneStyle(d.zoneStyle),
    isDefault: d.isDefault ?? false,
    createdAt: d.createdAt?.toDate() ?? new Date(),
    updatedAt: d.updatedAt?.toDate() ?? new Date(),
  }
}

function toPlayer(id: string, d: FirebaseFirestore.DocumentData): PlayerPlaymat {
  return {
    id,
    ownerUid: d.ownerUid ?? '',
    variant: (d.variant as PlaymatVariant) ?? 'full',
    imageUrl: d.imageUrl ?? '',
    storagePath: d.storagePath ?? '',
    zoneStyle: toZoneStyle(d.zoneStyle),
    createdAt: d.createdAt?.toDate() ?? new Date(),
  }
}

export class OfficialPlaymatRepository {
  private readonly col = db.collection('playmats')

  async list(): Promise<OfficialPlaymat[]> {
    const snap = await this.col.orderBy('createdAt', 'desc').limit(200).get()
    return snap.docs.map((d) => toOfficial(d.id, d.data()))
  }

  async create(input: Pick<OfficialPlaymat, 'name' | 'variant' | 'imageUrl' | 'storagePath' | 'zoneStyle'>): Promise<OfficialPlaymat> {
    const now = FieldValue.serverTimestamp()
    const ref = await this.col.add({ ...input, isDefault: false, createdAt: now, updatedAt: now })
    return toOfficial(ref.id, (await ref.get()).data()!)
  }

  async update(id: string, patch: Partial<Pick<OfficialPlaymat, 'name' | 'zoneStyle'>>): Promise<OfficialPlaymat | null> {
    const ref = this.col.doc(id)
    if (!(await ref.get()).exists) return null
    await ref.update({ ...patch, updatedAt: FieldValue.serverTimestamp() })
    return toOfficial(id, (await ref.get()).data()!)
  }

  async remove(id: string): Promise<OfficialPlaymat | null> {
    const ref = this.col.doc(id)
    const snap = await ref.get()
    if (!snap.exists) return null
    const mat = toOfficial(id, snap.data()!)
    await ref.delete()
    return mat
  }

  /** Pose le défaut sur `id` et le retire des autres de même variante (transaction). */
  async setDefault(id: string): Promise<OfficialPlaymat | null> {
    const ref = this.col.doc(id)
    const snap = await ref.get()
    if (!snap.exists) return null
    const variant = (snap.data()!.variant as PlaymatVariant) ?? 'full'
    const sameVariant = await this.col.where('variant', '==', variant).get()
    const batch = db.batch()
    sameVariant.docs.forEach((d) => batch.update(d.ref, { isDefault: d.id === id }))
    await batch.commit()
    return toOfficial(id, (await ref.get()).data()!)
  }

  async defaults(): Promise<OfficialPlaymat[]> {
    const snap = await this.col.where('isDefault', '==', true).get()
    return snap.docs.map((d) => toOfficial(d.id, d.data()))
  }
}

export class UnicolorThemeRepository {
  private readonly col = db.collection('unicolorThemes')

  async list(): Promise<UnicolorTheme[]> {
    const snap = await this.col.orderBy('createdAt', 'desc').limit(200).get()
    return snap.docs.map((d) => toUnicolor(d.id, d.data()))
  }

  async create(input: Pick<UnicolorTheme, 'name' | 'backgroundCss' | 'zoneStyle'>): Promise<UnicolorTheme> {
    const now = FieldValue.serverTimestamp()
    const ref = await this.col.add({ ...input, isDefault: false, createdAt: now, updatedAt: now })
    return toUnicolor(ref.id, (await ref.get()).data()!)
  }

  async update(id: string, patch: Partial<Pick<UnicolorTheme, 'name' | 'backgroundCss' | 'zoneStyle'>>): Promise<UnicolorTheme | null> {
    const ref = this.col.doc(id)
    if (!(await ref.get()).exists) return null
    await ref.update({ ...patch, updatedAt: FieldValue.serverTimestamp() })
    return toUnicolor(id, (await ref.get()).data()!)
  }

  async remove(id: string): Promise<void> {
    await this.col.doc(id).delete()
  }

  /** Un seul thème uni par défaut (fallback global). */
  async setDefault(id: string): Promise<UnicolorTheme | null> {
    const ref = this.col.doc(id)
    if (!(await ref.get()).exists) return null
    const all = await this.col.get()
    const batch = db.batch()
    all.docs.forEach((d) => batch.update(d.ref, { isDefault: d.id === id }))
    await batch.commit()
    return toUnicolor(id, (await ref.get()).data()!)
  }
}

export class PlayerPlaymatRepository {
  private readonly col = db.collection('playerPlaymats')

  async listByOwner(uid: string): Promise<PlayerPlaymat[]> {
    const snap = await this.col.where('ownerUid', '==', uid).get()
    return snap.docs.map((d) => toPlayer(d.id, d.data())).sort((a, b) => +a.createdAt - +b.createdAt)
  }

  async countByOwnerVariant(uid: string, variant: PlaymatVariant): Promise<number> {
    const snap = await this.col.where('ownerUid', '==', uid).where('variant', '==', variant).get()
    return snap.size
  }

  async create(input: Pick<PlayerPlaymat, 'ownerUid' | 'variant' | 'imageUrl' | 'storagePath' | 'zoneStyle'>): Promise<PlayerPlaymat> {
    const ref = await this.col.add({ ...input, createdAt: FieldValue.serverTimestamp() })
    return toPlayer(ref.id, (await ref.get()).data()!)
  }

  async findById(id: string): Promise<PlayerPlaymat | null> {
    const snap = await this.col.doc(id).get()
    return snap.exists ? toPlayer(snap.id, snap.data()!) : null
  }

  async remove(id: string): Promise<void> {
    await this.col.doc(id).delete()
  }
}

/** Préférences playmat stockées sur le doc users/{uid} (champ playmatSettings). */
export class PlaymatSettingsRepository {
  private readonly col = db.collection('users')

  async get(uid: string): Promise<PlaymatSettings> {
    const snap = await this.col.doc(uid).get()
    const s = snap.exists ? snap.data()!.playmatSettings : null
    return s ? { ...DEFAULT_PLAYMAT_SETTINGS, ...s } : { ...DEFAULT_PLAYMAT_SETTINGS }
  }

  async set(uid: string, settings: PlaymatSettings): Promise<PlaymatSettings> {
    await this.col.doc(uid).set(
      { playmatSettings: settings, updatedAt: FieldValue.serverTimestamp() },
      { merge: true },
    )
    return settings
  }
}
