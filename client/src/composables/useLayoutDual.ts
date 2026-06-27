import {CardState, PlayerZoneId, ZoneId} from "@riftbound/shared";
import {computed, type MaybeRefOrGetter, toValue} from "vue";
import {BF_CARD_SCALE, DEFAULT_CARD_RATIO, GAP, INSIDE_MARGIN, OUTSIDE_MARGIN, useCardSize} from "@/composables/useCardSize.ts";
import {useViewport} from "@/composables/useViewport.ts";
import {CardLayout, Rect} from "@/types/card.type.ts";
import {useGameStore} from "@/stores/game.ts";

const SEPARATOR = ':'

export function useLayoutDual(cards: MaybeRefOrGetter<readonly CardState[]>) {
  const store = useGameStore()
  const { width: W, height: H, SIDEBAR_WIDTH } = useViewport()
  const { cardW, cardH } = useCardSize()

  // ── Layout functions ──────────────────────────────────────────────────────────

  // Circular arc hand fan. R=800 gives a gentle curve; maxAngle = min(12°, n×4°).
  // flip=true for opponent: arc curves upward and cards appear upside-down (cssRotation 180°).
  function layoutHand(zone: Rect, cards: CardState[], out: Map<string, CardLayout>, flip: boolean) {
    const cw = cardW.value
    const ch = cardH.value
    const n = cards.length
    if (n === 0) return

    const R = 800
    const maxAngleDeg = Math.min(12, n * 4)

    const arcCx = zone.x + zone.w / 2
    const arcCy = flip
      ? zone.y + zone.h / 2 - R   // arc center above zone → cards curve upward
      : zone.y + zone.h / 2 + R   // arc center below zone → cards curve downward

    cards.forEach((card, i) => {
      const t = n === 1 ? 0 : (i / (n - 1)) * 2 - 1   // -1 … +1
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

  // Stack with top card centered and up to 2 ghost cards peeking behind.
  function layoutStackable(zone: Rect, cards: CardState[], out: Map<string, CardLayout>) {
    const cw = cardW.value
    const ch = cardH.value
    const n = cards.length
    if (n === 0) return

    const cx = zone.x + (zone.w - cw) / 2
    const cy = zone.y + (zone.h - ch) / 2
    const OFFSET = 1.5
    const MAX_DEPTH = 12
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

  // Horizontal row, centered. Cards keep their natural size on overflow: gap is reduced
  // (step-based compression) so cards overlap rather than shrink.
  function layoutRow(zone: Rect, cards: CardState[], out: Map<string, CardLayout>, invertZ = false) {
    const cw = cardW.value
    const ch = cardH.value
    const GAP = 6
    const n = cards.length
    if (n === 0) return

    // Exhausted card lies on its side → takes ch as horizontal footprint
    const footprintW = cards.map(c => {
      const base = c.state.exhausted ? ch : cw
      const groupExtra = (c.state.groupTo?.length ?? 0) * cw * 0.55
      return base + groupExtra
    })

    const naturalXs: number[] = [0]
    for (let i = 1; i < n; i++) naturalXs.push(naturalXs[i - 1] + footprintW[i - 1] + GAP)
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

    cards.forEach((card, i) => {
      const z = invertZ ? (n - 1 - i) : i
      // Parent cards with children: shift right within their footprint to leave space on the left for children
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

  function layoutReverseRow(zone: Rect, cards: CardState[], out: Map<string, CardLayout>) {
    layoutRow(zone, cards, out, true)
  }

  // Overlapping fan: all cards at same center, older cards rotated −10° each (cssRotation).
  // Max 6 visible. Cards are sized to fill the zone while keeping aspect ratio.
  function layoutStack(zone: Rect, cards: CardState[], out: Map<string, CardLayout>) {
    const n = cards.length
    if (n === 0) return

    const PAD = 6
    const maxH = zone.h - PAD * 2
    const maxW = zone.w - PAD * 2
    let ch = maxH
    let cw = Math.round(ch * (cardW.value / cardH.value))
    if (cw > maxW) { cw = maxW; ch = Math.round(cw * (cardH.value / cardW.value)) }

    const MAX_VISIBLE = 6
    const ANGLE_STEP  = -10

    const visible = n <= MAX_VISIBLE ? cards : cards.slice(n - MAX_VISIBLE)
    const count   = visible.length
    const cx = zone.x + (zone.w - cw) / 2
    const cy = zone.y + (zone.h - ch) / 2

    visible.forEach((card, i) => {
      const distFromTop = count - 1 - i  // 0 = top card (straight), grows going back
      out.set(card.cardId, {
        x: cx, y: cy,
        w: cw, h: ch,
        rotation: 0,
        cssRotation: distFromTop * ANGLE_STEP,
        z: i,
      })
    })
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
    const opponent = store.opponents[0] ?? ''
    if (!local || !opponent) return {}
    const result: Record<string, Rect> = {}

    // ownerId   = who owns this physical battlefield (their cards go in battlefield_owner row)
    // attackerId = the opposing player (their cards go in battlefield_opponent row on THIS field)
    // The key insight: battlefield_opponent is prefixed by attackerId so that
    // local player's cards on opponent's bf are keyed as `localId:battlefield_opponent`
    const emitBF = (ownerId: string, attackerId: string, x: number, w: number, ownerAtBottom: boolean) => {
      result[`${ownerId}${SEPARATOR}battlefield`] = { x, y: ybf, w, h: bfH }
      result[`${ownerId}_battlefield`] = {
        x: x + (w - bfCardH) / 2,
        y: ybf + (bfH - bfCardW) / 2,
        w: bfCardH,
        h: bfCardW,
      }
      result[`${ownerId}${SEPARATOR}battlefield_owner`] = {
        x: x + GAP,
        y: ownerAtBottom ? ybf + bfH - cardSlot.h - INSIDE_MARGIN : ybf + INSIDE_MARGIN,
        w: w - 2 * GAP,
        h: cardSlot.h,
      }
      // attackerId prefix: localId's attacking cards live on the opponent's physical battlefield
      result[`${attackerId}${SEPARATOR}battlefield_opponent`] = {
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

    const cardList = toValue(cards)
    // Zone persists once activated (Baron Nashor in base triggers it; Baron Pit token keeps it alive)
    const hasBaronNashor = cardList.some(
      c => (c.description.name === 'Baron Nashor' && c.zoneId === 'base')
        || (c.isToken && c.description.name === 'Baron Pit')
    )

    const emitNeutralBF = (x: number, w: number) => {
      result['baron_nashor:battlefield'] = { x, y: ybf, w, h: bfH }
      // Center zone — where the Baron Pit token card appears (same area as the card indicator)
      result['baron_nashor'] = {
        x: x + (w - bfCardH) / 2,
        y: ybf + (bfH - bfCardW) / 2,
        w: bfCardH,
        h: bfCardW,
      }
      result['baron_nashor_owner'] = {
        x: x + GAP,
        y: ybf + bfH - cardSlot.h - INSIDE_MARGIN,
        w: w - 2 * GAP,
        h: cardSlot.h,
      }
      result['baron_nashor_opponent'] = {
        x: x + GAP,
        y: ybf + INSIDE_MARGIN,
        w: w - 2 * GAP,
        h: cardSlot.h,
      }
    }

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
      champion:    { x: LEFT_X,                                              y: yp2z, ...cardSlot },
      legend:      { x: LEFT_X + cardSlot.w + GAP,                           y: yp2z, ...cardSlot },
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

    emitBF(local ?? '', opponent, LEFT_X, bfW, true)
    if (hasBaronNashor) {
      emitNeutralBF(LEFT_X + bfW + GAP, bfW)
    }
    emitBF(opponent, local ?? '', LEFT_X + (hasBaronNashor ? 2 : 1) * (bfW + GAP), bfW, false)

    result['stack'] = { x: W.value - OUTSIDE_MARGIN - STACK.w, y: ybf, w: STACK.w, h: bfH }

    return result
  })

  // ── Card layouts ──────────────────────────────────────────────────────────────

  const layouts = computed<Map<string, CardLayout>>(() => {
    const out = new Map<string, CardLayout>()
    const cardList = toValue(cards)
    const myUid = store.myUid

    // Build the set of card IDs that are grouped as children
    const childIds = new Set<string>()
    for (const c of cardList) {
      for (const childId of (c.state.groupTo ?? [])) childIds.add(childId)
    }

    const groups = new Map<string, CardState[]>()
    for (const c of cardList) {
      if (childIds.has(c.cardId)) continue  // skip grouped children from zone layout
      // Stack is owner-agnostic: all cards share one group so they all get the same rotation
      const key = c.zoneId === 'stack'
        ? 'stack'
        : `${c.ownerId}${SEPARATOR}${c.zoneId}`
      let list = groups.get(key)
      if (!list) groups.set(key, (list = []))
      list.push(c)
    }

    for (const [key, list] of groups) {
      const playerId = key.split(SEPARATOR)[0]
      const zone = key.slice(key.indexOf(SEPARATOR) + 1) as ZoneId
      // Zones for player rows use underscore separator, battlefield zones use colon
      // Fallback chain: colon key → underscore key → bare zone name (e.g. 'stack')
      const rect = zones.value[key] ?? zones.value[`${playerId}_${zone}`] ?? zones.value[zone]
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

    // Post-process: position grouped children to the side of their parent.
    // Local player zones are mirrored (x grows leftward), so offset direction is flipped.
    for (const c of cardList) {
      if (!c.state.groupTo?.length) continue
      const parentLayout = out.get(c.cardId)
      if (!parentLayout) continue

      const children = c.state.groupTo
        .map(id => cardList.find(cc => cc.cardId === id))
        .filter((cc): cc is CardState => !!cc)

      const cw = parentLayout.w
      const ch = parentLayout.h
      // Children spread to the left, each offset by 0.55×cw further
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
