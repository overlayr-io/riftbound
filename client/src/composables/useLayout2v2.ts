import {CardState, PlayerZoneId, ZoneId} from "@riftbound/shared";
import {computed, type MaybeRefOrGetter, toValue} from "vue";
import {BF_CARD_SCALE, DEFAULT_CARD_RATIO, GAP, INSIDE_MARGIN, OUTSIDE_MARGIN, useCardSize} from "@/composables/useCardSize.ts";
import {useViewport} from "@/composables/useViewport.ts";
import {CardLayout, Rect} from "@/types/card.type.ts";
import {useGameStore} from "@/stores/game.ts";

const SEPARATOR = ':'

// Per-player frame describing how to map a card laid out in a (un-rotated) template
// coordinate space into final screen coordinates. Center players (local / teammate)
// have no `side` entry — their zones are axis-aligned and used directly. Side players
// (the two opponents on the left / right) are rotated 90° around each card's center.
interface SideFrame {
  template: Record<PlayerZoneId, Rect>
  // Maps a template-space point (a card center) to a screen-space point.
  mapPoint: (cx: number, cy: number) => { x: number; y: number }
  // Extra rotation (deg) added to each card so it faces its seated player.
  angle: number
}

export function useLayout2v2(cards: MaybeRefOrGetter<readonly CardState[]>) {
  const store = useGameStore()
  const { playerIds, opponents, myUid } = store
  const { width: W, height: H, SIDEBAR_WIDTH } = useViewport()
  const { cardW, cardH } = useCardSize()

  // ── Layout functions (shared with useLayoutDual) ───────────────────────────────

  function layoutHand(zone: Rect, list: CardState[], out: Map<string, CardLayout>, flip: boolean) {
    const cw = cardW.value
    const ch = cardH.value
    const n = list.length
    if (n === 0) return

    const R = 800
    const maxAngleDeg = Math.min(12, n * 4)

    const arcCx = zone.x + zone.w / 2
    const arcCy = flip ? zone.y + zone.h / 2 - R : zone.y + zone.h / 2 + R

    list.forEach((card, i) => {
      const t = n === 1 ? 0 : (i / (n - 1)) * 2 - 1
      const angleDeg = t * maxAngleDeg
      const angleRad = angleDeg * (Math.PI / 180)
      const dy = flip ? R * Math.cos(angleRad) : -R * Math.cos(angleRad)
      out.set(card.cardId, {
        x: arcCx + R * Math.sin(angleRad) - cw / 2,
        y: arcCy + dy - ch / 2,
        w: cw, h: ch,
        rotation: 0,
        cssRotation: flip ? 180 + -angleDeg : angleDeg,
        z: i,
      })
    })
  }

  function layoutStackable(zone: Rect, list: CardState[], out: Map<string, CardLayout>) {
    const cw = cardW.value
    const ch = cardH.value
    const n = list.length
    if (n === 0) return
    const cx = zone.x + (zone.w - cw) / 2
    const cy = zone.y + (zone.h - ch) / 2
    const OFFSET = 1.5
    const MAX_DEPTH = 12
    const start = Math.max(0, n - MAX_DEPTH)
    for (let i = 0; i < n; i++) {
      if (i < start) continue
      const depth = n - 1 - i
      out.set(list[i].cardId, {
        x: cx - depth * OFFSET,
        y: cy - depth * OFFSET,
        w: cw, h: ch,
        rotation: 0,
        z: i,
      })
    }
  }

  function layoutSingle(zone: Rect, list: CardState[], out: Map<string, CardLayout>) {
    const cw = cardW.value
    const ch = cardH.value
    if (list.length === 0) return
    const top = list[list.length - 1]
    out.set(top.cardId, {
      x: zone.x + (zone.w - cw) / 2,
      y: zone.y + (zone.h - ch) / 2,
      w: cw, h: ch,
      rotation: top.state.exhausted ? 90 : 0,
      z: 0,
    })
  }

  function layoutRow(zone: Rect, list: CardState[], out: Map<string, CardLayout>, invertZ = false) {
    const cw = cardW.value
    const ch = cardH.value
    const ROW_GAP = 6
    const n = list.length
    if (n === 0) return

    const footprintW = list.map(c => {
      const base = c.state.exhausted ? ch : cw
      const groupExtra = (c.state.groupTo?.length ?? 0) * cw * 0.55
      return base + groupExtra
    })

    const naturalXs: number[] = [0]
    for (let i = 1; i < n; i++) naturalXs.push(naturalXs[i - 1] + footprintW[i - 1] + ROW_GAP)
    const naturalTotal = naturalXs[n - 1] + footprintW[n - 1]

    let xs: number[]
    if (naturalTotal <= zone.w) {
      const offset = zone.x + (zone.w - naturalTotal) / 2
      xs = naturalXs.map(x => x + offset)
    } else if (n === 1) {
      xs = [zone.x + (zone.w - footprintW[0]) / 2]
    } else {
      const lastX = zone.x + zone.w - footprintW[n - 1]
      const step = Math.max(1, (lastX - zone.x) / (n - 1))
      xs = Array.from({ length: n }, (_, i) => zone.x + i * step)
    }

    list.forEach((card, i) => {
      const z = invertZ ? (n - 1 - i) : i
      const groupShift = (card.state.groupTo?.length ?? 0) * cw * 0.55
      if (card.state.exhausted) {
        out.set(card.cardId, {
          x: xs[i] + groupShift + (ch - cw) / 2,
          y: zone.y + (zone.h - ch) / 2,
          w: cw, h: ch,
          rotation: 90,
          z,
        })
      } else {
        out.set(card.cardId, {
          x: xs[i] + groupShift,
          y: zone.y + (zone.h - ch) / 2,
          w: cw, h: ch,
          rotation: 0,
          z,
        })
      }
    })
  }

  function layoutReverseRow(zone: Rect, list: CardState[], out: Map<string, CardLayout>) {
    layoutRow(zone, list, out, true)
  }

  function layoutStack(zone: Rect, list: CardState[], out: Map<string, CardLayout>) {
    const n = list.length
    if (n === 0) return
    const PAD = 6
    const maxH = zone.h - PAD * 2
    const maxW = zone.w - PAD * 2
    let ch = maxH
    let cw = Math.round(ch * (cardW.value / cardH.value))
    if (cw > maxW) { cw = maxW; ch = Math.round(cw * (cardH.value / cardW.value)) }

    const MAX_VISIBLE = 6
    const ANGLE_STEP = -10
    const visible = n <= MAX_VISIBLE ? list : list.slice(n - MAX_VISIBLE)
    const count = visible.length
    const cx = zone.x + (zone.w - cw) / 2
    const cy = zone.y + (zone.h - ch) / 2

    visible.forEach((card, i) => {
      const distFromTop = count - 1 - i
      out.set(card.cardId, {
        x: cx, y: cy,
        w: cw, h: ch,
        rotation: 0,
        cssRotation: distFromTop * ANGLE_STEP,
        z: i,
      })
    })
  }

  // Apply the right layout function for a given zone into `out` (un-mapped / template space).
  function dispatch(zone: ZoneId, rect: Rect, list: CardState[], out: Map<string, CardLayout>, isOpponent: boolean) {
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
      case 'baron_nashor':
        layoutStackable(rect, list, out)
        break
      case 'battlefield_opponent':
      case 'battlefield_owner':
      case 'base':
      case 'baron_nashor_owner':
      case 'baron_nashor_opponent':
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

  // ── Geometry: zones (screen space) + side-player frames ─────────────────────────

  const geometry = computed(() => {
    const LEFT_X = SIDEBAR_WIDTH + OUTSIDE_MARGIN

    const cardSlot = {
      w: Math.round(cardH.value * DEFAULT_CARD_RATIO) + INSIDE_MARGIN * 2,
      h: cardH.value + INSIDE_MARGIN * 2,
    }

    const yp2h = -cardSlot.h * 0.20
    const yp2z = cardSlot.h * 0.80 + GAP
    const ybf = cardSlot.h * 1.80 + GAP * 2
    const bfH = H.value - 3.60 * cardSlot.h - 4 * GAP

    const STACK = { w: cardW.value * 3 }
    const deckSlot = { w: Math.round(cardSlot.w * 0.90), h: cardSlot.h }
    const bfCardH = cardH.value * BF_CARD_SCALE
    const bfCardW = cardW.value * BF_CARD_SCALE

    const local = myUid ?? ''
    const result: Record<string, Rect> = {}
    const sides: Record<string, SideFrame> = {}

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

    const teammate = playerIds.find(id => id !== local && !opponents.includes(id)) ?? playerIds[1]
    const opp1 = opponents[0]
    const opp2 = opponents[1]

    // ── Center column (teammate at top, local mirrored at bottom) ──
    const zoneRowFill2 = (W.value - OUTSIDE_MARGIN - LEFT_X) - 2 * cardSlot.w - 3 * GAP
    const sideCardSlot = { w: cardSlot.h, h: cardSlot.w }
    const SIDE_W = sideCardSlot.h * 1.80 + GAP * 2
    const CENTER_X = LEFT_X + SIDE_W + GAP
    const CENTER_RIGHT = W.value - OUTSIDE_MARGIN - SIDE_W - GAP
    const CENTER_W = CENTER_RIGHT - CENTER_X

    const centerRowFill = CENTER_W - 2 * cardSlot.w - 3 * GAP
    const BASE2 = { w: centerRowFill * 0.60, h: cardSlot.h }
    const RUNES2 = { w: centerRowFill * 0.40, h: cardSlot.h }
    const HAND2 = { w: (CENTER_W - 4 * deckSlot.w - 4 * GAP) * 0.60, h: cardSlot.h }
    const handX2 = CENTER_X + (CENTER_W - HAND2.w) / 2
    void zoneRowFill2

    const topCenter: Record<PlayerZoneId, Rect> = {
      banish:      { x: CENTER_X,                                            y: yp2h, ...deckSlot },
      discard:     { x: CENTER_X + deckSlot.w + GAP,                         y: yp2h, ...deckSlot },
      main_deck:   { x: CENTER_X + 2 * deckSlot.w + 2 * GAP,                 y: yp2h, ...deckSlot },
      hand:        { x: handX2,                                             y: yp2h, w: HAND2.w, h: HAND2.h },
      runes_deck:  { x: CENTER_RIGHT - deckSlot.w,                           y: yp2h, ...deckSlot },
      legend:      { x: CENTER_X,                                            y: yp2z, ...cardSlot },
      champion:    { x: CENTER_X + cardSlot.w + GAP,                         y: yp2z, ...cardSlot },
      base:        { x: CENTER_X + 2 * cardSlot.w + 2 * GAP,                 y: yp2z, w: BASE2.w, h: BASE2.h },
      runes:       { x: CENTER_X + 2 * cardSlot.w + 2 * GAP + BASE2.w + GAP, y: yp2z, w: RUNES2.w, h: RUNES2.h },
      battlefield: { x: 0, y: 0, w: 0, h: 0 },
    }

    const mirrorCenter = ({ x, y, w: zw, h: zh }: Rect): Rect => ({
      x: CENTER_RIGHT - (x - CENTER_X) - zw,
      y: H.value - y - zh,
      w: zw,
      h: zh,
    })

    // ── Side columns (opp1 rotated 90° left, opp2 rotated 90° right) ──
    const sideScale = CENTER_W > H.value ? H.value / CENTER_W : 1
    const rowOffset = (H.value - CENTER_W * sideScale) / 2

    const rotateLeft = ({ x: xt, y: yt, w: wt, h: ht }: Rect): Rect => ({
      x: LEFT_X + yt,
      y: rowOffset + (xt - CENTER_X) * sideScale,
      w: ht,
      h: wt * sideScale,
    })
    const rotateRight = ({ x: xt, y: yt, w: wt, h: ht }: Rect): Rect => ({
      x: W.value - OUTSIDE_MARGIN - yt - ht,
      y: rowOffset + (xt - CENTER_X) * sideScale,
      w: ht,
      h: wt * sideScale,
    })

    const syp2h2 = -sideCardSlot.h * 0.20
    const syp2z2 = sideCardSlot.h * 0.80 + GAP
    const sideDeckSlot = { w: cardSlot.h, h: deckSlot.w }
    const sideRowFill = CENTER_W - 2 * sideCardSlot.w - 3 * GAP
    const SIDE_BASE2 = { w: sideRowFill * 0.60, h: sideCardSlot.h }
    const SIDE_RUNES2 = { w: sideRowFill * 0.40, h: sideCardSlot.h }
    const SIDE_HAND2 = { w: (CENTER_W - 4 * sideCardSlot.w - 4 * GAP) * 0.60, h: sideCardSlot.h }
    const sideHandX2 = CENTER_X + (CENTER_W - SIDE_HAND2.w) / 2

    const sideCenter: Record<PlayerZoneId, Rect> = {
      banish:      { x: CENTER_X,                                                       y: syp2h2, ...sideDeckSlot },
      discard:     { x: CENTER_X + sideCardSlot.w + GAP,                                y: syp2h2, ...sideDeckSlot },
      main_deck:   { x: CENTER_X + 2 * sideCardSlot.w + 2 * GAP,                        y: syp2h2, ...sideDeckSlot },
      hand:        { x: sideHandX2,                                                     y: syp2h2, w: SIDE_HAND2.w, h: sideCardSlot.h },
      runes_deck:  { x: CENTER_RIGHT - sideCardSlot.w,                                  y: syp2h2, ...sideDeckSlot },
      legend:      { x: CENTER_X,                                                       y: syp2z2, ...sideCardSlot },
      champion:    { x: CENTER_X + sideCardSlot.w + GAP,                                y: syp2z2, ...sideCardSlot },
      base:        { x: CENTER_X + 2 * sideCardSlot.w + 2 * GAP,                        y: syp2z2, w: SIDE_BASE2.w, h: SIDE_BASE2.h },
      runes:       { x: CENTER_X + 2 * sideCardSlot.w + 2 * GAP + SIDE_BASE2.w + GAP,   y: syp2z2, w: SIDE_RUNES2.w, h: SIDE_RUNES2.h },
      battlefield: { x: 0, y: 0, w: 0, h: 0 },
    }

    emitPlayerRows(teammate,   topCenter,  v => v)
    emitPlayerRows(local,      topCenter,  mirrorCenter)
    if (opp1) emitPlayerRows(opp1, sideCenter, rotateLeft)
    if (opp2) emitPlayerRows(opp2, sideCenter, rotateRight)

    if (opp1) {
      sides[opp1] = {
        template: sideCenter,
        mapPoint: (cx, cy) => ({ x: LEFT_X + cy, y: rowOffset + (cx - CENTER_X) * sideScale }),
        angle: 90,
      }
    }
    if (opp2) {
      sides[opp2] = {
        template: sideCenter,
        mapPoint: (cx, cy) => ({ x: W.value - OUTSIDE_MARGIN - cy, y: rowOffset + (cx - CENTER_X) * sideScale }),
        angle: -90,
      }
    }

    // 2v2 always has exactly 3 battlefields: local | baron_nashor | teammate
    const bfW3 = (CENTER_W - 3 * GAP - STACK.w) / 3
    emitBF(local,          CENTER_X,                    bfW3, true)
    emitBF('baron_nashor', CENTER_X + bfW3 + GAP,       bfW3, true)
    emitBF(teammate,       CENTER_X + 2 * (bfW3 + GAP), bfW3, false)

    result['stack'] = { x: CENTER_RIGHT - STACK.w, y: ybf, w: STACK.w, h: bfH }

    return { zones: result, sides }
  })

  const zones = computed<Record<string, Rect>>(() => geometry.value.zones)

  // ── Card layouts ────────────────────────────────────────────────────────────────

  const layouts = computed<Map<string, CardLayout>>(() => {
    const out = new Map<string, CardLayout>()
    const cardList = toValue(cards)
    const local = myUid
    const { zones: Z, sides } = geometry.value

    // Build the set of card IDs that are grouped as children
    const childIds = new Set<string>()
    for (const c of cardList) {
      for (const childId of (c.state.groupTo ?? [])) childIds.add(childId)
    }

    const groups = new Map<string, CardState[]>()
    for (const c of cardList) {
      if (childIds.has(c.cardId)) continue
      const key = c.zoneId === 'stack' ? 'stack' : `${c.ownerId}${SEPARATOR}${c.zoneId}`
      let list = groups.get(key)
      if (!list) groups.set(key, (list = []))
      list.push(c)
    }

    for (const [key, list] of groups) {
      const playerId = key.split(SEPARATOR)[0]
      const zone = key.slice(key.indexOf(SEPARATOR) + 1) as ZoneId
      list.sort((a, b) => a.order - b.order)

      const side = sides[playerId]
      if (side) {
        // Side player: lay out in template space, then rotate each card into screen space.
        const tmplRect = side.template[zone as PlayerZoneId]
        if (!tmplRect || (tmplRect.w === 0 && tmplRect.h === 0)) continue
        const tmp = new Map<string, CardLayout>()
        dispatch(zone, tmplRect, list, tmp, true)
        for (const [cid, L] of tmp) {
          const ccx = L.x + L.w / 2
          const ccy = L.y + L.h / 2
          const p = side.mapPoint(ccx, ccy)
          out.set(cid, {
            x: p.x - L.w / 2,
            y: p.y - L.h / 2,
            w: L.w,
            h: L.h,
            rotation: L.rotation,
            cssRotation: (L.cssRotation ?? 0) + side.angle,
            z: L.z,
          })
        }
        continue
      }

      // Center player (local / teammate) or neutral zone (stack / baron).
      const rect = Z[key] ?? Z[`${playerId}_${zone}`] ?? Z[zone]
      if (!rect) continue
      const isOpponent = playerId !== local
      dispatch(zone, rect, list, out, isOpponent)
    }

    // Post-process grouped children for center players (mirrors useLayoutDual).
    for (const c of cardList) {
      if (!c.state.groupTo?.length) continue
      if (sides[c.ownerId]) continue
      const parentLayout = out.get(c.cardId)
      if (!parentLayout) continue
      const children = c.state.groupTo
        .map(id => cardList.find(cc => cc.cardId === id))
        .filter((cc): cc is CardState => !!cc)
      const cw = parentLayout.w
      const ch = parentLayout.h
      children.forEach((child, i) => {
        out.set(child.cardId, {
          x: parentLayout.x - cw * 0.55 * (i + 1),
          y: parentLayout.y + ch * 0.10,
          w: cw,
          h: ch,
          rotation: 0,
          z: parentLayout.z - 1 - i,
        })
      })
    }

    return out
  })

  // ── Player territories ──────────────────────────────────────────────────────────

  const playersZone = computed<Record<string, Rect>>(() => {
    const w = toValue(W)
    const h = toValue(H)
    const local = myUid

    const LEFT_X = SIDEBAR_WIDTH + OUTSIDE_MARGIN
    const cardSlotW = cardW.value + INSIDE_MARGIN * 2
    const SIDE_W = cardSlotW * 1.80 + GAP * 2
    const CENTER_X = LEFT_X + SIDE_W + GAP
    const CENTER_RIGHT = w - OUTSIDE_MARGIN - SIDE_W - GAP
    const CENTER_W = CENTER_RIGHT - CENTER_X
    const teammate = playerIds.find(id => id !== local && !opponents.includes(id)) ?? playerIds[1]
    const opp1 = opponents[0]
    const opp2 = opponents[1]

    const out: Record<string, Rect> = {
      [`${local}${SEPARATOR}zone`]:    { x: CENTER_X, y: h / 2, w: CENTER_W, h: h / 2 },
      [`${teammate}${SEPARATOR}zone`]: { x: CENTER_X, y: 0,     w: CENTER_W, h: h / 2 },
    }
    if (opp1) out[`${opp1}${SEPARATOR}zone`] = { x: LEFT_X,             y: 0, w: SIDE_W, h }
    if (opp2) out[`${opp2}${SEPARATOR}zone`] = { x: CENTER_RIGHT + GAP, y: 0, w: SIDE_W, h }
    return out
  })

  return {
    zones,
    layouts,
    playersZone,
  }
}
