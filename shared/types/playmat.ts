// ── Playmat (fonds de plateau) ──────────────────────────────────────────────
//
// Le plateau est fluide (remplit le viewport) et les fonds sont rendus en
// `background-size: cover`. Ce qui compte = ratio + résolution mini, pas un px
// exact. Cibles recommandées :
//   - full : 16:9, ≥ 2560×1440 (idéal 4K). Contenu important centré (bords rognés).
//   - half : 32:9, ≈ 3840×1080 (territoire joueur en 1v1 = largeur × ½ hauteur).

/** full = couvre tout le plateau ; half = couvre la moitié-moitié (1v1 only). */
export type PlaymatVariant = 'full' | 'half'

export const PLAYMAT_DIMENSIONS: Record<PlaymatVariant, { ratio: string; w: number; h: number; label: string }> = {
  full: { ratio: '16:9', w: 2560, h: 1440, label: 'Fond entier — 16:9, ≥ 2560×1440 (idéal 3840×2160)' },
  half: { ratio: '32:9', w: 3840, h: 1080, label: 'Demi-terrain — 32:9, ≈ 3840×1080' },
}

/** Couleurs des zones de jeu calées sur le contraste du fond. */
export interface ZoneStyle {
  /** Remplissage translucide des zones (effet verre dépoli). rgba recommandé. */
  background: string
  /** Couleur des bordures / coins dorés des zones. */
  border: string
  /** Couleur des labels de zones (deck, main, base…). */
  label: string
}

/** Style verre dépoli appliqué par défaut quand rien n'est précisé. */
export const DEFAULT_ZONE_STYLE: ZoneStyle = {
  background: 'rgba(8, 16, 28, 0.32)',
  border: '#C8AA6E',
  label: '#F2E5CD',
}

/** Image de fond officielle, gérée depuis le back-office. */
export interface OfficialPlaymat {
  id: string
  name: string
  variant: PlaymatVariant
  imageUrl: string
  storagePath: string
  zoneStyle: ZoneStyle
  /** Fond par défaut pour sa variante (un seul full + un seul half). */
  isDefault: boolean
  createdAt: Date
  updatedAt: Date
}

/** Thème uni (couleur(s)) — pas d'image. Géré depuis le back-office. */
export interface UnicolorTheme {
  id: string
  name: string
  /** CSS du fond du plateau (couleur unie ou dégradé). */
  backgroundCss: string
  zoneStyle: ZoneStyle
  isDefault: boolean
  createdAt: Date
  updatedAt: Date
}

/** Image uploadée par un joueur (3 full + 3 half max). zoneStyle auto-contrasté. */
export interface PlayerPlaymat {
  id: string
  ownerUid: string
  variant: PlaymatVariant
  imageUrl: string
  storagePath: string
  zoneStyle: ZoneStyle
  createdAt: Date
}

export const MAX_PLAYER_PLAYMATS_PER_VARIANT = 3

/** Référence vers le fond actif choisi par le joueur. */
export type PlaymatSelectionKind = 'official' | 'player' | 'unicolor'

/** Préférences playmat d'un joueur (stockées sur son profil). */
export interface PlaymatSettings {
  /** Type de la sélection active. */
  kind: PlaymatSelectionKind
  /** Id de l'OfficialPlaymat / PlayerPlaymat / UnicolorTheme actif (null = défaut). */
  id: string | null
  /** Mode moitié-moitié (1v1 uniquement ; ignoré sinon). */
  halfMode: boolean
  /** Aléatoire : nouveau fond tiré au sort à chaque partie. */
  random: boolean
  /** Inclure aussi les fonds officiels dans le tirage aléatoire. */
  includeOfficialInRandom: boolean
}

export const DEFAULT_PLAYMAT_SETTINGS: PlaymatSettings = {
  kind: 'unicolor',
  id: null,
  halfMode: false,
  random: false,
  includeOfficialInRandom: false,
}

// ── DTOs (Date -> string sur le fil) ─────────────────────────────────────────
export type OfficialPlaymatDto = Omit<OfficialPlaymat, 'createdAt' | 'updatedAt'> & {
  createdAt: string; updatedAt: string
}
export type UnicolorThemeDto = Omit<UnicolorTheme, 'createdAt' | 'updatedAt'> & {
  createdAt: string; updatedAt: string
}
export type PlayerPlaymatDto = Omit<PlayerPlaymat, 'createdAt'> & { createdAt: string }

/** Catalogue public renvoyé au joueur (officiels + thèmes unis). */
export interface PlaymatCatalogDto {
  official: OfficialPlaymatDto[]
  unicolors: UnicolorThemeDto[]
}
