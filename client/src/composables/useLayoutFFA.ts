import {CardState, PlayerZoneId, ZoneId} from "@riftbound/shared";
import {computed, toValue} from "vue";
import {BF_CARD_SCALE, DEFAULT_CARD_RATIO, GAP, INSIDE_MARGIN, OUTSIDE_MARGIN, useCardSize} from "@/composables/useCardSize.ts";
import {useViewport} from "@/composables/useViewport.ts";
import {CardLayout, Rect} from "@/types/card.type.ts";
import {useGameStore} from "@/stores/game.ts";

const SEPARATOR = ':'

export function useLayoutFFA(cards: readonly CardState[]) {
  const { opponents, myUid } = useGameStore()
  const { width: W, height: H } = useViewport()
  const { cardW, cardH } = useCardSize()

  const zones = computed<Record<string, Rect>>(() => {
    const LEFT_X = OUTSIDE_MARGIN

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

    const topPlayer   = opponents[0]
    const leftPlayer  = opponents[1]
    const rightPlayer: string | undefined = opponents[2]
    const isFFA4      = !!rightPlayer

    const sideCardSlotFFA = { w: cardSlot.h, h: cardSlot.w }
    const sideDeckSlotFFA = { w: cardSlot.h, h: deckSlot.w }
    const SIDE_W       = sideCardSlotFFA.h * 1.80 + GAP * 2
    const CENTER_X     = LEFT_X + SIDE_W + GAP
    const CENTER_RIGHT = isFFA4
      ? W.value - OUTSIDE_MARGIN - SIDE_W - GAP
      : W.value - OUTSIDE_MARGIN
    const CENTER_W = CENTER_RIGHT - CENTER_X

    const zoneRowFillFFA = CENTER_W - 2 * cardSlot.w - 3 * GAP
    const BASE_FFA  = { w: zoneRowFillFFA * 0.60, h: cardSlot.h }
    const RUNES_FFA = { w: zoneRowFillFFA * 0.40, h: cardSlot.h }
    const HAND_FFA  = { w: (CENTER_W - 4 * deckSlot.w - 4 * GAP) * 0.60, h: cardSlot.h }
    const handXFFA  = CENTER_X + (CENTER_W - HAND_FFA.w) / 2

    const topCenterFFA: Record<PlayerZoneId, Rect> = {
      banish:      { x: CENTER_X,                                                   y: yp2h, ...deckSlot },
      discard:     { x: CENTER_X + deckSlot.w + GAP,                                y: yp2h, ...deckSlot },
      main_deck:   { x: CENTER_X + 2 * deckSlot.w + 2 * GAP,                        y: yp2h, ...deckSlot },
      hand:        { x: handXFFA,                                                   y: yp2h, w: HAND_FFA.w, h: HAND_FFA.h },
      runes_deck:  { x: CENTER_RIGHT - deckSlot.w,                                  y: yp2h, ...deckSlot },
      legend:      { x: CENTER_X,                                                   y: yp2z, ...cardSlot },
      champion:    { x: CENTER_X + cardSlot.w + GAP,                               y: yp2z, ...cardSlot },
      base:        { x: CENTER_X + 2 * cardSlot.w + 2 * GAP,                        y: yp2z, w: BASE_FFA.w,  h: BASE_FFA.h },
      runes:       { x: CENTER_X + 2 * cardSlot.w + 2 * GAP + BASE_FFA.w + GAP,    y: yp2z, w: RUNES_FFA.w, h: RUNES_FFA.h },
      battlefield: { x: 0, y: 0, w: 0, h: 0 },
    }

    const mirrorCenterFFA = ({ x, y, w: zw, h: zh }: Rect): Rect => ({
      x: CENTER_RIGHT - (x - CENTER_X) - zw,
      y: H.value - y - zh,
      w: zw,
      h: zh,
    })

    const sideScaleFFA = CENTER_W > H.value ? H.value / CENTER_W : 1
    const rowOffsetFFA = (H.value - CENTER_W * sideScaleFFA) / 2

    const rotateLeftFFA = ({ x: xt, y: yt, w: wt, h: ht }: Rect): Rect => ({
      x: LEFT_X + yt,
      y: rowOffsetFFA + (xt - CENTER_X) * sideScaleFFA,
      w: ht,
      h: wt * sideScaleFFA,
    })

    // Side template: landscape slots in template → portrait on screen after rotation
    const syp2hFFA = -sideCardSlotFFA.h * 0.20
    const syp2zFFA =  sideCardSlotFFA.h * 0.80 + GAP
    const sideZoneRowFillFFA = CENTER_W - 2 * sideCardSlotFFA.w - 3 * GAP
    const SIDE_BASE_FFA  = { w: sideZoneRowFillFFA * 0.60, h: sideCardSlotFFA.h }
    const SIDE_RUNES_FFA = { w: sideZoneRowFillFFA * 0.40, h: sideCardSlotFFA.h }
    const SIDE_HAND_FFA  = { w: (CENTER_W - 4 * sideCardSlotFFA.w - 4 * GAP) * 0.60, h: sideCardSlotFFA.h }
    const sideHandXFFA   = CENTER_X + (CENTER_W - SIDE_HAND_FFA.w) / 2

    const sideCenterFFA: Record<PlayerZoneId, Rect> = {
      banish:      { x: CENTER_X,                                                              y: syp2hFFA, ...sideDeckSlotFFA },
      discard:     { x: CENTER_X + sideCardSlotFFA.w + GAP,                                    y: syp2hFFA, ...sideDeckSlotFFA },
      main_deck:   { x: CENTER_X + 2 * sideCardSlotFFA.w + 2 * GAP,                            y: syp2hFFA, ...sideDeckSlotFFA },
      hand:        { x: sideHandXFFA,                                                          y: syp2hFFA, w: SIDE_HAND_FFA.w, h: sideCardSlotFFA.h },
      runes_deck:  { x: CENTER_RIGHT - sideCardSlotFFA.w,                                      y: syp2hFFA, ...sideDeckSlotFFA },
      legend:      { x: CENTER_X,                                                              y: syp2zFFA, ...sideCardSlotFFA },
      champion:    { x: CENTER_X + sideCardSlotFFA.w + GAP,                                    y: syp2zFFA, ...sideCardSlotFFA },
      base:        { x: CENTER_X + 2 * sideCardSlotFFA.w + 2 * GAP,                            y: syp2zFFA, w: SIDE_BASE_FFA.w,  h: SIDE_BASE_FFA.h },
      runes:       { x: CENTER_X + 2 * sideCardSlotFFA.w + 2 * GAP + SIDE_BASE_FFA.w + GAP,   y: syp2zFFA, w: SIDE_RUNES_FFA.w, h: SIDE_RUNES_FFA.h },
      battlefield: { x: 0, y: 0, w: 0, h: 0 },
    }

    emitPlayerRows(topPlayer,   topCenterFFA,  v => v)
    emitPlayerRows(local ?? '', topCenterFFA,  mirrorCenterFFA)
    emitPlayerRows(leftPlayer,  sideCenterFFA, rotateLeftFFA)

    if (isFFA4 && rightPlayer) {
      const rotateRightFFA = ({ x: xt, y: yt, w: wt, h: ht }: Rect): Rect => ({
        x: W.value - OUTSIDE_MARGIN - yt - ht,
        y: rowOffsetFFA + (xt - CENTER_X) * sideScaleFFA,
        w: ht,
        h: wt * sideScaleFFA,
      })
      emitPlayerRows(rightPlayer, sideCenterFFA, rotateRightFFA)
    }

    const bfWFFA = (CENTER_W - 3 * GAP - STACK.w) / 3
    emitBF(local ?? '',    CENTER_X,                       bfWFFA, true)
    emitBF('baron_nashor', CENTER_X + bfWFFA + GAP,        bfWFFA, true)
    emitBF(topPlayer,      CENTER_X + 2 * (bfWFFA + GAP),  bfWFFA, false)

    result['stack'] = { x: CENTER_RIGHT - STACK.w, y: ybf, w: STACK.w, h: bfH }

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
    const local = myUid

    const topPlayer   = opponents[0]
    const leftPlayer  = opponents[1]
    const rightPlayer: string | undefined = opponents[2]
    const isFFA4      = !!rightPlayer

    const LEFT_X_FFA   = OUTSIDE_MARGIN
    // Must match the zones computed: sideCardSlotFFA.h = cardSlot.w = cardW + INSIDE_MARGIN*2
    const cardSlotW    = cardW.value + INSIDE_MARGIN * 2
    const SIDE_W       = cardSlotW * 1.80 + GAP * 2
    const CENTER_X     = LEFT_X_FFA + SIDE_W + GAP
    const CENTER_RIGHT = isFFA4
      ? w - OUTSIDE_MARGIN - SIDE_W - GAP
      : w - OUTSIDE_MARGIN
    const CENTER_W = CENTER_RIGHT - CENTER_X

    const out: Record<string, Rect> = {
      [`${local}${SEPARATOR}zone`]:      { x: CENTER_X,   y: h / 2, w: CENTER_W, h: h / 2 },
      [`${topPlayer}${SEPARATOR}zone`]:  { x: CENTER_X,   y: 0,     w: CENTER_W, h: h / 2 },
      [`${leftPlayer}${SEPARATOR}zone`]: { x: LEFT_X_FFA, y: 0,     w: SIDE_W,   h },
    }

    if (isFFA4 && rightPlayer) {
      out[`${rightPlayer}${SEPARATOR}zone`] = { x: CENTER_RIGHT + GAP, y: 0, w: SIDE_W, h }
    }

    return out
  })

  return {
    zones,
    layouts,
    playersZone,
  }
}
