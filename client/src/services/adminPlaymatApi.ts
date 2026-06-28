import type { OfficialPlaymatDto, UnicolorThemeDto, PlaymatVariant, ZoneStyle } from '@riftbound/shared'
import { apiFetch } from './http'

export const adminPlaymatApi = {
  // ── Fonds officiels ──
  listOfficial(): Promise<OfficialPlaymatDto[]> { return apiFetch('GET', '/admin/playmats') },
  createOfficial(input: { name: string; variant: PlaymatVariant; imageUrl: string; storagePath: string; zoneStyle: ZoneStyle }): Promise<OfficialPlaymatDto> {
    return apiFetch('POST', '/admin/playmats', input)
  },
  updateOfficial(id: string, patch: { name?: string; zoneStyle?: ZoneStyle }): Promise<OfficialPlaymatDto> {
    return apiFetch('PATCH', `/admin/playmats/${id}`, patch)
  },
  deleteOfficial(id: string): Promise<OfficialPlaymatDto> { return apiFetch('DELETE', `/admin/playmats/${id}`) },
  setOfficialDefault(id: string): Promise<OfficialPlaymatDto> { return apiFetch('POST', `/admin/playmats/${id}/default`) },

  // ── Thèmes unis ──
  listUnicolors(): Promise<UnicolorThemeDto[]> { return apiFetch('GET', '/admin/unicolors') },
  createUnicolor(input: { name: string; backgroundCss: string; zoneStyle: ZoneStyle }): Promise<UnicolorThemeDto> {
    return apiFetch('POST', '/admin/unicolors', input)
  },
  updateUnicolor(id: string, patch: { name?: string; backgroundCss?: string; zoneStyle?: ZoneStyle }): Promise<UnicolorThemeDto> {
    return apiFetch('PATCH', `/admin/unicolors/${id}`, patch)
  },
  deleteUnicolor(id: string): Promise<void> { return apiFetch('DELETE', `/admin/unicolors/${id}`) },
  setUnicolorDefault(id: string): Promise<UnicolorThemeDto> { return apiFetch('POST', `/admin/unicolors/${id}/default`) },
}
