import {CardState, PlayerZoneId, ZoneId} from "@riftbound/shared";
import {computed, type MaybeRefOrGetter, toValue} from "vue";
import {BF_CARD_SCALE, DEFAULT_CARD_RATIO, GAP, INSIDE_MARGIN, OUTSIDE_MARGIN, useCardSize} from "@/composables/useCardSize.ts";
import {useViewport} from "@/composables/useViewport.ts";
import {CardLayout, Rect} from "@/types/card.type.ts";
import {useGameStore} from "@/stores/game.ts";

const SEPARATOR = ':'
const ROW_GAP = 4

export function useLayoutDual(cards: MaybeRefOrGetter<readonly CardState[]>) {
  const store = useGameStore()
  const { width: W, height: H, SIDEBAR_WIDTH } = useViewport()
  const { cardW, cardH } = useCardSize()

  // ── Layout functions ──────────────────────────────────────────────────────────

  // Fan/arc: spread cards in a hand. flip=true for opponent (rotated 180°, arc inverted).
  function layoutHand(zone: Rect, cards: CardState[], out: Map<string, CardLayout>, flip: boolean) {
    const cw = cardW.value
    const ch = cardH.value
    const n = cards.length
    if (n === 0) return

    const MAX_ROT = Math.min(20, n * 2.5)
    const overlap = cw * 0.55
    const naturalSpan = cw + Math.max(0, n - 1) * overlap
    const span = Math.min(naturalSpan, zone.w * 0.95)
    const step = n === 1 ? 0 : (span - cw) / (n - 1)
    const startX = zone.x + (zone.w - span) / 2

    for (let i = 0; i < n; i++) {
      const t = n === 1 ? 0 : (i / (n - 1) - 0.5) * 2  // -1 to 1
      const rotation = (flip ? 180 : 0) + t * MAX_ROT
      const arc = -(1 - t * t) * ch * 0.05
      out.set(cards[i].cardId, {
        x: startX + i * step,
        y: zone.y + (zone.h - ch) / 2 + (flip ? -arc : arc),
        w: cw, h: ch,
        rotation,
        z: i,
      })
    }
  }

  // Stack with top card centered and up to 2 ghost cards peeking behind.
  function layoutStackable(zone: Rect, cards: CardState[], out: Map<string, CardLayout>) {
    const cw = cardW.value
    const ch = cardH.value
    const n = cards.length
    if (n === 0) return

    const cx = zone.x + (zone.w - cw) / 2
    const cy = zone.y + (zone.h - ch) / 2
    const OFFSET = 1.5
    const MAX_DEPTH = 3
    const start = Math.max(0, n - MAX_DEPTH)

    for (let i = 0; i < n; i++) {
      if (i < start) continue
      const depth = n - 1 - i
      out.set(cards[i].cardId, {
        x: cx - depth * OFFSET,
        y: cy - depth * OFFSET,
        w: cw, h: ch,
        rotation: 0,
        z: i,
      })
    }
  }

  // Single card centered in zone. Supports exhausted rotation.
  function layoutSingle(zone: Rect, cards: CardState[], out: Map<string, CardLayout>) {
    const cw = cardW.value
    const ch = cardH.value
    if (cards.length === 0) return
    const top = cards[cards.length - 1]
    out.set(top.cardId, {
      x: zone.x + (zone.w - cw) / 2,
      y: zone.y + (zone.h - ch) / 2,
      w: cw, h: ch,
      rotation: top.state.exhausted ? 90 : 0,
      z: 0,
    })
  }

  // Horizontal row, centered. Exhausted cards are rotated 90° and occupy ch as width.
  function layoutRow(zone: Rect, cards: CardState[], out: Map<string, CardLayout>, reverseZ = false) {
    const cw = cardW.value
    const ch = cardH.value
    const n = cards.length
    if (n === 0) return

    // Visual width per card (exhausted cards take ch as horizontal footprint)
    const vws = cards.map(c => c.state.exhausted ? ch : cw)
    const totalNatural = vws.reduce((s, w) => s + w, 0)
    const totalWithGaps = totalNatural + (n - 1) * ROW_GAP
    const compress = totalWithGaps > zone.w
      ? (zone.w - (n - 1) * ROW_GAP) / totalNatural
      : 1

    const scaledCw = cw * compress
    const scaledCh = ch * compress
    const scaledTotal = vws.reduce((s, w) => s + w * compress, 0) + (n - 1) * ROW_GAP

    let x = zone.x + (zone.w - scaledTotal) / 2

    for (let i = 0; i < n; i++) {
      const card = cards[i]
      const vw = vws[i] * compress
      out.set(card.cardId, {
        x: x + vw / 2 - scaledCw / 2,
        y: zone.y + (zone.h - scaledCh) / 2,
        w: scaledCw, h: scaledCh,
        rotation: card.state.exhausted ? 90 : 0,
        z: reverseZ ? n - 1 - i : i,
      })
      x += vw + ROW_GAP
    }
  }

  // Same as layoutRow but z-index reversed (rightmost card goes behind).
  function layoutReverseRow(zone: Rect, cards: CardState[], out: Map<string, CardLayout>) {
    layoutRow(zone, cards, out, true)
  }

  // Row for battlefield units (same as layoutRow).
  function layoutBattlefield(zone: Rect, cards: CardState[], out: Map<string, CardLayout>) {
    layoutRow(zone, cards, out)
  }

  // Overlapping fan: all cards at same center, older cards rotated −10° each. Max 6 visible.
  function layoutStack(zone: Rect, cards: CardState[], out: Map<string, CardLayout>) {
    const n = cards.length
    if (n === 0) return

    const MAX_VISIBLE = 6
    const ROT_PER_LEVEL = -10

    const scaleW = zone.w / cardW.value
    const scaleH = zone.h / cardH.value
    const scale = Math.min(scaleW, scaleH, 1)
    const cw = cardW.value * scale
    const ch = cardH.value * scale
    const cx = zone.x + (zone.w - cw) / 2
    const cy = zone.y + (zone.h - ch) / 2

    const start = Math.max(0, n - MAX_VISIBLE)

    for (let i = 0; i < n; i++) {
      if (i < start) continue
      const depthFromTop = n - 1 - i
      out.set(cards[i].cardId, {
        x: cx, y: cy,
        w: cw, h: ch,
        rotation: depthFromTop * ROT_PER_LEVEL,
        z: i,
      })
    }
  }

  // ── Zones ─────────────────────────────────────────────────────────────────────

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

    const local = store.myUid
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

    const opponent = store.opponents[0] ?? ''

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

  // ── Card layouts ──────────────────────────────────────────────────────────────

  const layouts = computed<Map<string, CardLayout>>(() => {
    const out = new Map<string, CardLayout>()
    const cardList = toValue(cards)
    const myUid = store.myUid

    const groups = new Map<string, CardState[]>()
    for (const c of cardList) {
      const key = `${c.ownerId}${SEPARATOR}${c.zoneId}`
      let list = groups.get(key)
      if (!list) groups.set(key, (list = []))
      list.push(c)
    }

    for (const [key, list] of groups) {
      const playerId = key.split(SEPARATOR)[0]
      const zone = key.slice(key.indexOf(SEPARATOR) + 1) as ZoneId
      // Zones for player rows use underscore separator, battlefield zones use colon
      const rect = zones.value[key] ?? zones.value[`${playerId}_${zone}`]
      if (!rect) continue

      list.sort((a, b) => a.order - b.order)

      const isOpponent = playerId !== myUid

      switch (zone) {
        case 'hand':
          layoutHand(rect, list, out, isOpponent)
          break
        case 'main_deck':
        case 'runes_deck':
        case 'discard':
        case 'banish':
          layoutStackable(rect, list, out)
          break
        case 'legend':
        case 'champion':
          layoutSingle(rect, list, out)
          break
        case 'battlefield':
          layoutBattlefield(rect, list, out)
          break
        case 'battlefield_opponent':
        case 'battlefield_owner':
        case 'base':
          layoutRow(rect, list, out)
          break
        case 'runes':
          layoutReverseRow(rect, list, out)
          break
        case 'stack':
          layoutStack(rect, list, out)
          break
      }
    }

    return out
  })

  // ── Player territories ────────────────────────────────────────────────────────

  const playersZone = computed<Record<string, Rect>>(() => {
    const w = W.value
    const h = H.value
    const ids = store.playerIds
    const [p1, p2] = ids

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
