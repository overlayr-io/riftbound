export type PlayerZoneId =
  | 'banish'
  | 'discard'
  | 'main_deck'
  | 'hand'
  | 'runes_deck'
  | 'legend'
  | 'champion'
  | 'base'
  | 'runes'
  | 'selected_battlefield'
  | 'battlefield_owner'
  | 'battlefield_opponent'

export type ZoneId =
  | PlayerZoneId
  | 'stack'