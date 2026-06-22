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

export type ZoneId =
  | PlayerZoneId
  | 'battlefield_owner'
  | 'battlefield_opponent'
  | 'stack'