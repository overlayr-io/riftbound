import {CardState, ZoneId} from "@riftbound/shared";
import {computed, toValue} from "vue";
import {useCardSize} from "@/composables/useCardSize.ts";
import {useViewport} from "@/composables/useViewport.ts";
import {CardLayout, Rect} from "@/types/card.type.ts";
import {useGameStore} from "@/stores/game.ts";

export function useLayout(cards: readonly CardState[]) {
  const { mode, playerIds } = useGameStore()
  const { width: W, height: H } = useViewport()
  const { cardW, cardH } = useCardSize()

  const zones = computed<Record<string, Rect>>(() => {
    return {}
  })

  const layouts = computed<Map<ZoneId, CardLayout>>(() => {
    const out = new Map<ZoneId, CardLayout>()

    const groups = new Map<ZoneId, CardState[]>()
    for (const c of cards) {
      // key format: "{ownerId}_{zone}" — ownerId never contains '_'
      const key = `${c.ownerId}:${c.zoneId}`
      let list = groups.get(key)
      if (!list) groups.set(key, (list = []))
      list.push(c)
    }

    for (const [key, list] of groups) {
      const zone = key.slice(key.indexOf(':') + 1) as ZoneId
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

        case 'selected_battlefield':
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
    // const [p1, p2, p3, p4] = playerIds

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
      'p1-zone': { x: 0, y: 0,     w, h: h / 2 },
      'p2-zone': { x: 0, y: h / 2, w, h: h / 2 },
    }
  })

  return {
    zones,
    layouts,
    playersZone,
  }
}