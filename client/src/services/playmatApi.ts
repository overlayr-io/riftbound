import type {
  PlaymatCatalogDto, PlayerPlaymatDto, PlaymatSettings, PlaymatVariant, ZoneStyle,
} from '@riftbound/shared'
import { apiFetch, apiFetchForm } from './http'

export const playmatApi = {
  catalog(): Promise<PlaymatCatalogDto> { return apiFetch('GET', '/public/playmats') },

  listMine(): Promise<PlayerPlaymatDto[]> { return apiFetch('GET', '/users/me/playmats') },

  addMine(input: { variant: PlaymatVariant; blob: Blob; zoneStyle: ZoneStyle }): Promise<PlayerPlaymatDto> {
    const form = new FormData()
    form.append('file', new File([input.blob], 'playmat.webp', { type: 'image/webp' }))
    form.append('variant', input.variant)
    form.append('zoneStyle', JSON.stringify(input.zoneStyle))
    return apiFetchForm('POST', '/users/me/playmats', form)
  },

  deleteMine(id: string): Promise<PlayerPlaymatDto> { return apiFetch('DELETE', `/users/me/playmats/${id}`) },

  getSettings(): Promise<PlaymatSettings> { return apiFetch('GET', '/users/me/playmat-settings') },
  putSettings(settings: PlaymatSettings): Promise<PlaymatSettings> {
    return apiFetch('PUT', '/users/me/playmat-settings', settings)
  },
}
