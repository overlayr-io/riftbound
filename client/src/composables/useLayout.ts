import {CardState, PlayerZoneId, ZoneId} from "@riftbound/shared";
import {computed, toValue} from "vue";
import {DEFAULT_CARD_RATIO, INSIDE_MARGIN, OUTSIDE_MARGIN, useCardSize} from "@/composables/useCardSize.ts";
import {useViewport} from "@/composables/useViewport.ts";
import {CardLayout, Rect} from "@/types/card.type.ts";
import {useGameStore} from "@/stores/game.ts";

export const DEFAULT_SEPARATOR = ':'

export function useLayout(cards: readonly CardState[]) {
  const { mode, playerIds, opponents, myUid } = useGameStore()
  const { width: W, height: H, SIDEBAR_WIDTH } = useViewport()
  const { cardW, cardH } = useCardSize()

  const zones = computed<Record<string, Rect>>(() => {
    const GAP = 5

    const LEFT_X = SIDEBAR_WIDTH + OUTSIDE_MARGIN

    const cardSlot = {
      w: Math.round(cardH.value * DEFAULT_CARD_RATIO) + INSIDE_MARGIN,
      h: cardH.value + INSIDE_MARGIN,
    }

    const BASE = { w: 0, y: 0 }
    const HAND = { w: 0, y: 0 }
    const RUNES = { w: 0, y: 0 }
    const battlefield = { w: 0, y: 0 }


    const top: Record<PlayerZoneId, Rect> = {
      banish: {       x: LEFT_X,                                        y: 0,                   ...cardSlot  },
      discard: {      x: LEFT_X + cardSlot.w + GAP,                     y: 0,                   ...cardSlot  },
      main_deck: {    x: LEFT_X + cardSlot.w + GAP + cardSlot.w + GAP,  y: 0,                   ...cardSlot  },
      hand: {         x: 0,                                             y: 0,                   w: HAND.w, h: HAND.y },
      runes_deck: {   x: 0,                                             y: 0,                   ...cardSlot  },
      legend: {       x: 0,                                             y: 0,                   ...cardSlot  },
      champion: {     x: 0,                                             y: 0,                   ...cardSlot  },
      base: {         x: 0,                                             y: 0,                   w: BASE.w, h: BASE.y  },
      runes: {        x: 0,                                             y: 0,                   w: RUNES.w, h: RUNES.y  },
      battlefield: {  x: 0,                                             y: 0,                   w: battlefield.w, h: battlefield.y  },
    }

    const mirror = ({ x, y, w: zw, h: zh}: Rect): Rect => ({
      x: W.value - x - zw,
      y: H.value - y - zh,
      w: zw,
      h: zh,
    })

    const local = myUid
    const opponent = opponents[0]

    const result: Record<string, Rect> = {}
    for (const [k, v] of Object.entries(top)) result[`${opponent}_${k}`] = v
    for (const [k, v] of Object.entries(top)) result[`${local}_${k}`]  = mirror(v)

    result['stack'] = { x: 0, y: 0, w: 0, h: 0 }
    result[`${local}${DEFAULT_SEPARATOR}battlefield_owner`] = { x: 0, y: 0, w: 0, h: 0 }
    result[`${local}${DEFAULT_SEPARATOR}battlefield_opponent`] = { x: 0, y: 0, w: 0, h: 0 }
    result[`${opponent}${DEFAULT_SEPARATOR}battlefield_opponent`] = { x: 0, y: 0, w: 0, h: 0 }
    result[`${opponent}${DEFAULT_SEPARATOR}battlefield_opponent`] = { x: 0, y: 0, w: 0, h: 0 }

    return result
  })

  const layouts = computed<Map<ZoneId, CardLayout>>(() => {
    const out = new Map<ZoneId, CardLayout>()

    const groups = new Map<ZoneId, CardState[]>()
    for (const c of cards) {
      // key format: "{ownerId}_{zone}" — ownerId never contains '_'
      const key = `${c.ownerId}${DEFAULT_SEPARATOR}${c.zoneId}`
      let list = groups.get(key)
      if (!list) groups.set(key, (list = []))
      list.push(c)
    }

    for (const [key, list] of groups) {
      const zone = key.slice(key.indexOf(DEFAULT_SEPARATOR) + 1) as ZoneId
      // Some zones are shared (no player prefix): fall back to zone-only key
      const rect = zones.value[key] ?? zones.value[zone]
      if (!rect) continue

      list.sort((a, b) => a.order - b.order)

      // On le fera plus tard
      // ici c'est le layout row, ect..
      switch (zone) {
        case 'hand':
          break

        case 'main_deck':
        case 'runes_deck':
        case 'discard':
        case 'banish':
          break

        case 'legend':
        case 'champion':
          break

        case 'battlefield':
          break

        case 'battlefield_opponent':
        case 'battlefield_owner':
          break

        case 'runes':
          break

        case 'base':
          break

        case 'stack':
          break
      }
    }

    return out
  })


  const playersZone = computed<Record<string, Rect>>(() => {
    const w = toValue(W)
    const h = toValue(H)
    const [p1, p2, p3, p4] = playerIds

    /*if(mode === 'dual') {
      if(p1 && p2) {

      }
      throw new Error('Invalid player ids: ')
    }

    if(mode === '2v2') {
      return {
        'p1-zone': { x: 0, y: 0,     w, h: h / 2 },
        'p2-zone': { x: 0, y: 0,     w, h: h / 2 },

      }

    }*/
    return {
      [`${p1}${DEFAULT_SEPARATOR}zone`]: { x: 0, y: 0,     w, h: h / 2 },
      [`${p2}${DEFAULT_SEPARATOR}zone`]: { x: 0, y: h / 2, w, h: h / 2 },
    }
  })

  return {
    zones,
    layouts,
    playersZone,
  }
}