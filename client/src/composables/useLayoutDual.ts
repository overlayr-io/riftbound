import {CardState, PlayerZoneId, ZoneId} from "@riftbound/shared";
import {computed, toValue} from "vue";
import {BF_CARD_SCALE, DEFAULT_CARD_RATIO, GAP, INSIDE_MARGIN, OUTSIDE_MARGIN, useCardSize} from "@/composables/useCardSize.ts";
import {useViewport} from "@/composables/useViewport.ts";
import {CardLayout, Rect} from "@/types/card.type.ts";
import {useGameStore} from "@/stores/game.ts";

const SEPARATOR = ':'

export function useLayoutDual(cards: readonly CardState[]) {
  const { playerIds, opponents, myUid } = useGameStore()
  const { width: W, height: H, SIDEBAR_WIDTH } = useViewport()
  const { cardW, cardH } = useCardSize()

  const zones = computed<Record<string, Rect>>(() => {
    const LEFT_X = SIDEBAR_WIDTH + OUTSIDE_MARGIN

    const cardSlot = {
      w: Math.round(cardH.value * DEFAULT_CARD_RATIO) + INSIDE_MARGIN * 2,
      h: cardH.value + INSIDE_MARGIN * 2,
    }

    const yp2h = -cardSlot.h * 0.20
    const yp2z =  cardSlot.h * 0.80 + GAP
    const ybf  =  cardSlot.h * 1.80 + GAP * 2
    const bfH  =  H.value - 3.60 * cardSlot.h - 4 * GAP

    const STACK    = { w: cardW.value * 3 }
    const deckSlot = { w: Math.round(cardSlot.w * 0.90), h: cardSlot.h }
    const bfCardH  = cardH.value * BF_CARD_SCALE
    const bfCardW  = cardW.value * BF_CARD_SCALE

    const local = myUid
    const result: Record<string, Rect> = {}

    const emitBF = (prefix: string, x: number, w: number, ownerAtBottom: boolean) => {
      result[`${prefix}${SEPARATOR}battlefield`] = { x, y: ybf, w, h: bfH }
      result[`${prefix}_battlefield`] = {
        x: x + (w - bfCardH) / 2,
        y: ybf + (bfH - bfCardW) / 2,
        w: bfCardH,
        h: bfCardW,
      }
      result[`${prefix}${SEPARATOR}battlefield_owner`] = {
        x: x + GAP,
        y: ownerAtBottom ? ybf + bfH - cardSlot.h - INSIDE_MARGIN : ybf + INSIDE_MARGIN,
        w: w - 2 * GAP,
        h: cardSlot.h,
      }
      result[`${prefix}${SEPARATOR}battlefield_opponent`] = {
        x: x + GAP,
        y: ownerAtBottom ? ybf + INSIDE_MARGIN : ybf + bfH - cardSlot.h - INSIDE_MARGIN,
        w: w - 2 * GAP,
        h: cardSlot.h,
      }
    }

    const emitPlayerRows = (
      playerId: string,
      template: Record<PlayerZoneId, Rect>,
      transform: (r: Rect) => Rect,
    ) => {
      for (const [k, v] of Object.entries(template)) {
        result[`${playerId}_${k}`] = transform(v)
      }
    }

    const opponent = opponents[0]

    const hasBaronNashor = false
    const bfCount = hasBaronNashor ? 3 : 2
    const bfW = (W.value - OUTSIDE_MARGIN - LEFT_X - bfCount * GAP - STACK.w) / bfCount

    const zoneRowFill = W.value - OUTSIDE_MARGIN - LEFT_X - 2 * cardSlot.w - 3 * GAP
    const BASE  = { w: zoneRowFill * 0.60, h: cardSlot.h }
    const RUNES = { w: zoneRowFill * 0.40, h: cardSlot.h }
    const HAND  = { w: (W.value - OUTSIDE_MARGIN - LEFT_X - 4 * deckSlot.w - 4 * GAP) * 0.60, h: cardSlot.h }
    const handX = (W.value + LEFT_X - OUTSIDE_MARGIN - HAND.w) / 2

    const top: Record<PlayerZoneId, Rect> = {
      banish:      { x: LEFT_X,                                              y: yp2h, ...deckSlot },
      discard:     { x: LEFT_X + deckSlot.w + GAP,                           y: yp2h, ...deckSlot },
      main_deck:   { x: LEFT_X + 2 * deckSlot.w + 2 * GAP,                   y: yp2h, ...deckSlot },
      hand:        { x: handX,                                               y: yp2h, w: HAND.w, h: HAND.h },
      runes_deck:  { x: W.value - OUTSIDE_MARGIN - deckSlot.w,               y: yp2h, ...deckSlot },
      legend:      { x: LEFT_X,                                              y: yp2z, ...cardSlot },
      champion:    { x: LEFT_X + cardSlot.w + GAP,                           y: yp2z, ...cardSlot },
      base:        { x: LEFT_X + 2 * cardSlot.w + 2 * GAP,                   y: yp2z, w: BASE.w,  h: BASE.h  },
      runes:       { x: LEFT_X + 2 * cardSlot.w + 2 * GAP + BASE.w + GAP,    y: yp2z, w: RUNES.w, h: RUNES.h },
      battlefield: { x: 0, y: 0, w: 0, h: 0 },
    }

    const mirror = ({ x, y, w: zw, h: zh }: Rect): Rect => ({
      x: W.value - OUTSIDE_MARGIN - x + LEFT_X - zw,
      y: H.value - y - zh,
      w: zw,
      h: zh,
    })

    emitPlayerRows(opponent,     top, v => v)
    emitPlayerRows(local ?? '', top, mirror)

    emitBF(local ?? '', LEFT_X,                                              bfW, true)
    emitBF(opponent,    LEFT_X + (hasBaronNashor ? 2 : 1) * (bfW + GAP),    bfW, false)

    if (hasBaronNashor) {
      emitBF('baron_nashor', LEFT_X + bfW + GAP, bfW, true)
    }

    result['stack'] = { x: W.value - OUTSIDE_MARGIN - STACK.w, y: ybf, w: STACK.w, h: bfH }

    return result
  })

  const layouts = computed<Map<ZoneId, CardLayout>>(() => {
    const out = new Map<ZoneId, CardLayout>()

    const groups = new Map<string, CardState[]>()
    for (const c of cards) {
      const key = `${c.ownerId}${SEPARATOR}${c.zoneId}`
      let list = groups.get(key)
      if (!list) groups.set(key, (list = []))
      list.push(c)
    }

    for (const [key, list] of groups) {
      const zone = key.slice(key.indexOf(SEPARATOR) + 1) as ZoneId
      const rect = zones.value[key] ?? zones.value[zone]
      if (!rect) continue

      list.sort((a, b) => a.order - b.order)

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
    const [p1, p2] = playerIds

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
