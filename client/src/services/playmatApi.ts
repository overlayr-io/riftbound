import type {
  PlaymatCatalogDto, PlayerPlaymatDto, PlaymatSettings, PlaymatVariant, ZoneStyle,
} from '@riftbound/shared'
import { apiFetch } from './http'

export const playmatApi = {
  /** Catalogue public (officiels + thèmes unis) — cache long côté store. */
  catalog(): Promise<PlaymatCatalogDto> { return apiFetch('GET', '/public/playmats') },

  listMine(): Promise<PlayerPlaymatDto[]> { return apiFetch('GET', '/users/me/playmats') },
  addMine(input: { variant: PlaymatVariant; imageUrl: string; storagePath: string; zoneStyle: ZoneStyle }): Promise<PlayerPlaymatDto> {
    return apiFetch('POST', '/users/me/playmats', input)
  },
  deleteMine(id: string): Promise<PlayerPlaymatDto> { return apiFetch('DELETE', `/users/me/playmats/${id}`) },

  getSettings(): Promise<PlaymatSettings> { return apiFetch('GET', '/users/me/playmat-settings') },
  putSettings(settings: PlaymatSettings): Promise<PlaymatSettings> {
    return apiFetch('PUT', '/users/me/playmat-settings', settings)
  },
}
