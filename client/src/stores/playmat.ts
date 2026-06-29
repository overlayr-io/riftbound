import { defineStore } from 'pinia'
import { ref } from 'vue'
import type {
  OfficialPlaymatDto, UnicolorThemeDto, PlayerPlaymatDto, PlaymatSettings, PlaymatVariant, ZoneStyle,
} from '@riftbound/shared'
import { DEFAULT_PLAYMAT_SETTINGS, DEFAULT_ZONE_STYLE } from '@riftbound/shared'
import { playmatApi } from '@/services/playmatApi'

/** Fond résolu prêt à peindre par le plateau. */
export interface ResolvedPlaymat {
  /** CSS de fond (thème uni ou fallback). null si on peint une image. */
  backgroundCss: string | null
  /** URL de l'image de fond. null si thème uni. */
  imageUrl: string | null
  zoneStyle: ZoneStyle
  /** Moitié-moitié effectif (1v1 + image). */
  halfMode: boolean
}

/** Fallback ultime = thème nuit-bleu/or actuel (cohérent avec GameLayout). */
const DEFAULT_RESOLVED: ResolvedPlaymat = {
  backgroundCss: 'radial-gradient(ellipse 140% 90% at 50% 25%, #091629 0%, #030810 65%)',
  imageUrl: null,
  zoneStyle: { ...DEFAULT_ZONE_STYLE },
  halfMode: false,
}

function hashSeed(seed: string): number {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619) }
  return (h >>> 0)
}

export const usePlaymatStore = defineStore('playmat', () => {
  // Catalogue public — chargé une seule fois, mis en cache mémoire.
  const official = ref<OfficialPlaymatDto[]>([])
  const unicolors = ref<UnicolorThemeDto[]>([])
  const mine = ref<PlayerPlaymatDto[]>([])
  const settings = ref<PlaymatSettings>({ ...DEFAULT_PLAYMAT_SETTINGS })

  const catalogLoaded = ref(false)
  const mineLoaded = ref(false)
  const settingsLoaded = ref(false)
  let inflight: Promise<void> | null = null

  /** Charge catalogue + images perso + préférences en une passe, idempotent. */
  async function load(force = false): Promise<void> {
    if (!force && catalogLoaded.value && mineLoaded.value && settingsLoaded.value) return
    if (inflight && !force) return inflight
    inflight = (async () => {
      const [cat, m, s] = await Promise.allSettled([
        playmatApi.catalog(),
        playmatApi.listMine(),
        playmatApi.getSettings(),
      ])
      if (cat.status === 'fulfilled') { official.value = cat.value.official; unicolors.value = cat.value.unicolors; catalogLoaded.value = true }
      if (m.status === 'fulfilled') { mine.value = m.value; mineLoaded.value = true }
      if (s.status === 'fulfilled') { settings.value = s.value; settingsLoaded.value = true }
    })()
    try { await inflight } finally { inflight = null }
  }

  /** Charge uniquement le catalogue public (ex. spectateur sans images perso). */
  async function loadCatalog(): Promise<void> {
    if (catalogLoaded.value) return
    try {
      const cat = await playmatApi.catalog()
      official.value = cat.official; unicolors.value = cat.unicolors; catalogLoaded.value = true
    } catch { /* garde le fallback */ }
  }

  async function refreshMine(): Promise<void> {
    mine.value = await playmatApi.listMine(); mineLoaded.value = true
  }

  async function saveSettings(patch: Partial<PlaymatSettings>): Promise<void> {
    const next = { ...settings.value, ...patch }
    settings.value = next // optimiste
    settings.value = await playmatApi.putSettings(next)
  }

  function defaultUnicolor(): UnicolorThemeDto | null {
    return unicolors.value.find((u) => u.isDefault) ?? unicolors.value[0] ?? null
  }

  /**
   * Résout le fond à peindre pour une partie donnée.
   * @param mode  mode de jeu — la moitié-moitié n'est effective qu'en 'dual'.
   * @param seed  identifiant de partie — graine du tirage aléatoire.
   */
  function resolve(mode: 'dual' | '2v2' | 'ffa', seed = ''): ResolvedPlaymat {
    const s = settings.value
    const wantHalf = s.halfMode && mode === 'dual'
    const variant: PlaymatVariant = 'full'

    // 1) Aléatoire : tire dans mes images (+ officiels si opt-in) de la variante.
    if (s.random) {
      const pool: { imageUrl: string; zoneStyle: ZoneStyle }[] = [
        ...mine.value.filter((m) => m.variant === variant),
        ...(s.includeOfficialInRandom ? official.value.filter((o) => o.variant === variant) : []),
      ]
      if (pool.length) {
        const pick = pool[hashSeed(seed || 'seed') % pool.length]
        return { backgroundCss: null, imageUrl: pick.imageUrl, zoneStyle: pick.zoneStyle, halfMode: wantHalf }
      }
      return fallback()
    }

    // 2) Sélection manuelle.
    if (s.kind === 'unicolor') {
      const theme = s.id ? unicolors.value.find((u) => u.id === s.id) : defaultUnicolor()
      if (theme) return { backgroundCss: theme.backgroundCss, imageUrl: null, zoneStyle: theme.zoneStyle, halfMode: false }
      return fallback()
    }
    if (s.kind === 'official') {
      const mat = official.value.find((o) => o.id === s.id)
      if (mat) return { backgroundCss: null, imageUrl: mat.imageUrl, zoneStyle: mat.zoneStyle, halfMode: false }
      return fallback()
    }
    if (s.kind === 'player') {
      const mat = mine.value.find((m) => m.id === s.id)
      if (mat) return { backgroundCss: null, imageUrl: mat.imageUrl, zoneStyle: mat.zoneStyle, halfMode: false }
      return fallback() // image supprimée/signalée → thème uni par défaut
    }
    return fallback()
  }

  function fallback(): ResolvedPlaymat {
    const theme = defaultUnicolor()
    if (theme) return { backgroundCss: theme.backgroundCss, imageUrl: null, zoneStyle: theme.zoneStyle, halfMode: false }
    return { ...DEFAULT_RESOLVED }
  }

  return {
    official, unicolors, mine, settings,
    catalogLoaded, mineLoaded, settingsLoaded,
    load, loadCatalog, refreshMine, saveSettings, resolve, fallback,
  }
})
