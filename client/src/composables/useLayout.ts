import {CardState, PlayerZoneId, ZoneId} from "@riftbound/shared";
import {computed, toValue} from "vue";
import {BF_CARD_SCALE, DEFAULT_CARD_RATIO, GAP, INSIDE_MARGIN, OUTSIDE_MARGIN, useCardSize} from "@/composables/useCardSize.ts";
import {useViewport} from "@/composables/useViewport.ts";
import {CardLayout, Rect} from "@/types/card.type.ts";
import {useGameStore} from "@/stores/game.ts";

export const SEPARATOR = ':'

export function useLayout(cards: readonly CardState[]) {
  const { mode, playerIds, opponents, myUid } = useGameStore()
  const { width: W, height: H, SIDEBAR_WIDTH } = useViewport()
  const { cardW, cardH } = useCardSize()

  const zones = computed<Record<string, Rect>>(() => {
    const LEFT_X = SIDEBAR_WIDTH + OUTSIDE_MARGIN

    const cardSlot = {
      w: Math.round(cardH.value * DEFAULT_CARD_RATIO) + INSIDE_MARGIN * 2,
      h: cardH.value + INSIDE_MARGIN * 2,
    }

    // Y anchors — derived directly from the constraint (no centering needed)
    const yp2h = -cardSlot.h * 0.20           // p2 utilities: 20% above top edge
    const yp2z =  cardSlot.h * 0.80 + GAP     // p2 zones: after visible utilities + gap
    const ybf  =  cardSlot.h * 1.80 + GAP * 2 // battlefield: after p2 zones + gap

    // Battlefield height fills all remaining space between the two player sections:
    // top section ends at ybf, bottom section (mirrored yp2z row) starts at H - yp2z - cardSlot.h
    // leaving one GAP on each side → bfH = (H - yp2z - cardSlot.h - GAP) - ybf
    const bfH = H.value - 3.60 * cardSlot.h - 4 * GAP

    const STACK = { w: cardW.value * 3 }

    // Baron Nashor adds a 3rd battlefield between local and opponent
    const hasBaronNashor = false
    const bfCount = hasBaronNashor ? 3 : 2
    // bfCount battlefields + bfCount gaps + stack fill: LEFT_X … W - OUTSIDE_MARGIN
    const bfW = (W.value - OUTSIDE_MARGIN - LEFT_X - bfCount * GAP - STACK.w) / bfCount

    // Deck zones (banish, discard, main_deck, runes_deck) are 10% narrower than a full card slot
    const deckSlot = { w: Math.round(cardSlot.w * 0.90), h: cardSlot.h }

    // Zones row (legend, champion, base, runes) must fit exactly LEFT_X … W-OUTSIDE_MARGIN
    // 2 card slots + 3 gaps + base + runes = available width
    const zoneRowFill = W.value - OUTSIDE_MARGIN - LEFT_X - 2 * cardSlot.w - 3 * GAP
    const BASE  = { w: zoneRowFill * 0.60, h: cardSlot.h }
    const RUNES = { w: zoneRowFill * 0.40, h: cardSlot.h }

    // Hand fills the space between main_deck and runes_deck in the utilities row
    const HAND  = { w: (W.value - OUTSIDE_MARGIN - LEFT_X - 4 * deckSlot.w - 4 * GAP) * 0.60, h: cardSlot.h }

    // Hand is centered in the board (LEFT_X … W-OUTSIDE_MARGIN) so the mirror stays centered
    const handX = (W.value + LEFT_X - OUTSIDE_MARGIN - HAND.w) / 2

    const bfCardH = cardH.value * BF_CARD_SCALE
    const bfCardW = cardW.value * BF_CARD_SCALE

    const top: Record<PlayerZoneId, Rect> = {
      banish:    { x: LEFT_X,                                              y: yp2h, ...deckSlot },
      discard:   { x: LEFT_X + deckSlot.w + GAP,                           y: yp2h, ...deckSlot },
      main_deck: { x: LEFT_X + 2 * deckSlot.w + 2 * GAP,                   y: yp2h, ...deckSlot },
      hand:      { x: handX,                                               y: yp2h, w: HAND.w, h: HAND.h },
      runes_deck:{ x: W.value - OUTSIDE_MARGIN - deckSlot.w,               y: yp2h, ...deckSlot },

      legend:    { x: LEFT_X,                                              y: yp2z, ...cardSlot },
      champion:  { x: LEFT_X + cardSlot.w + GAP,                           y: yp2z, ...cardSlot },
      base:      { x: LEFT_X + 2 * cardSlot.w + 2 * GAP,                   y: yp2z, w: BASE.w,  h: BASE.h  },
      runes:     { x: LEFT_X + 2 * cardSlot.w + 2 * GAP + BASE.w + GAP,    y: yp2z, w: RUNES.w, h: RUNES.h },

      // overridden below per-player — placeholder keeps the type happy
      battlefield: { x: 0, y: 0, w: 0, h: 0 },
    }

    // Mirror x: symmetric within the board canvas (LEFT_X … W-OUTSIDE_MARGIN)
    const mirror = ({ x, y, w: zw, h: zh }: Rect): Rect => ({
      x: W.value - OUTSIDE_MARGIN - x + LEFT_X - zw,
      y: H.value - y - zh,
      w: zw,
      h: zh,
    })

    const local    = myUid
    const opponent = opponents[0]

    const result: Record<string, Rect> = {}
    for (const [k, v] of Object.entries(top)) result[`${opponent}_${k}`] = v
    for (const [k, v] of Object.entries(top)) result[`${local}_${k}`]    = mirror(v)

    // Emit all 4 zones for one battlefield column.
    // ownerAtBottom: true → local orientation (owner row at bottom, facing centre)
    //                false → opponent orientation (owner row at top, facing centre)
    const emitBattlefield = (prefix: string, x: number, ownerAtBottom: boolean) => {
      result[`${prefix}${SEPARATOR}battlefield`] = { x, y: ybf, w: bfW, h: bfH }
      result[`${prefix}_battlefield`] = {
        x: x + (bfW - bfCardH) / 2,
        y: ybf + (bfH - bfCardW) / 2,
        w: bfCardH,
        h: bfCardW,
      }
      result[`${prefix}${SEPARATOR}battlefield_owner`] = {
        x: x + GAP,
        y: ownerAtBottom ? ybf + bfH - cardSlot.h - INSIDE_MARGIN : ybf + INSIDE_MARGIN,
        w: bfW - 2 * GAP,
        h: cardSlot.h,
      }
      result[`${prefix}${SEPARATOR}battlefield_opponent`] = {
        x: x + GAP,
        y: ownerAtBottom ? ybf + INSIDE_MARGIN : ybf + bfH - cardSlot.h - INSIDE_MARGIN,
        w: bfW - 2 * GAP,
        h: cardSlot.h,
      }
    }

    const localX    = LEFT_X
    const opponentX = LEFT_X + (hasBaronNashor ? 2 : 1) * (bfW + GAP)

    emitBattlefield(local,    localX,    true)
    emitBattlefield(opponent, opponentX, false)

    if (hasBaronNashor) {
      const baronX = LEFT_X + bfW + GAP
      emitBattlefield('baron_nashor', baronX, true)
    }

    result['stack'] = {
      x: W.value - OUTSIDE_MARGIN - STACK.w, y: ybf, w: STACK.w, h: bfH,
    }

    return result
  })

  const layouts = computed<Map<ZoneId, CardLayout>>(() => {
    const out = new Map<ZoneId, CardLayout>()

    const groups = new Map<ZoneId, CardState[]>()
    for (const c of cards) {
      // key format: "{ownerId}_{zone}" — ownerId never contains '_'
      const key = `${c.ownerId}${SEPARATOR}${c.zoneId}`
      let list = groups.get(key)
      if (!list) groups.set(key, (list = []))
      list.push(c)
    }

    for (const [key, list] of groups) {
      const zone = key.slice(key.indexOf(SEPARATOR) + 1) as ZoneId
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
      [`${p1}${SEPARATOR}zone`]: { x: 0, y: 0,     w, h: h / 2 },
      [`${p2}${SEPARATOR}zone`]: { x: 0, y: h / 2, w, h: h / 2 },
    }
  })

  return {
    zones,
    layouts,
    playersZone,
  }
}