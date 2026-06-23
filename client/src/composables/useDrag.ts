import { ref, type ComputedRef, type InjectionKey, type Ref } from 'vue'
import type { Rect } from '@/types/card.type'
import type { CardState, GameAction, ZoneId } from '@riftbound/shared'

const RUNE_ZONES = new Set<string>(['runes', 'runes_deck'])
// battlefield (center card slot) is display-only — normal cards cannot be dragged there
const OWNER_FREE_ZONES = new Set<string>(['stack', 'baron_nashor'])

function parseZoneKey(key: string): { owner: string | null; zone: string } {
  const ci = key.indexOf(':')
  if (ci !== -1) return { owner: key.slice(0, ci), zone: key.slice(ci + 1) }
  const ui = key.indexOf('_')
  if (ui !== -1) return { owner: key.slice(0, ui), zone: key.slice(ui + 1) }
  return { owner: null, zone: key }
}

function isValidDrop(card: CardState, zoneKey: string): boolean {
  const { owner, zone } = parseZoneKey(zoneKey)
  // Center battlefield card slot — not a drag target for regular cards
  if (zone === 'battlefield') return false
  if (card.description.type === 'rune' && !RUNE_ZONES.has(zone)) return false
  if (card.description.type !== 'rune' && RUNE_ZONES.has(zone)) return false
  if (OWNER_FREE_ZONES.has(zone)) return true
  // battlefield_owner / battlefield_opponent: prefix is always the card owner's id
  // (emitBF uses attackerId for battlefield_opponent, so owner === card.ownerId holds for both)
  return owner === card.ownerId
}

export interface DragState {
  cardId: string
  ownerId: string
  x: number
  y: number
  w: number
  h: number
  rotation?: number
  cssRotation?: number
}

export interface DragContext {
  dragging: Ref<DragState | null>
  hoveredZone: Ref<string | null>
  hoveredZoneValid: Ref<boolean>
  onPointerDown: (
    e: PointerEvent,
    cardId: string,
    ownerId: string,
    layout: { x: number; y: number; w: number; h: number; rotation?: number; cssRotation?: number },
    onClick?: () => void,
  ) => void
}

export const DRAG_KEY = Symbol('drag') as InjectionKey<DragContext>

export interface GameActionsContext {
  applyAction: (action: GameAction) => void
}

export const GAME_ACTIONS_KEY = Symbol('game-actions') as InjectionKey<GameActionsContext>

export function useDrag(
  zones: ComputedRef<Record<string, Rect>>,
  cards: ComputedRef<readonly CardState[]>,
  applyAction: (action: GameAction) => void,
): DragContext {
  const dragging = ref<DragState | null>(null)
  const hoveredZone = ref<string | null>(null)
  const hoveredZoneValid = ref(false)

  // Distance threshold to enter drag mode
  const DRAG_THRESHOLD = 6
  // Max duration of a "tap" — hold longer without moving = no action on release
  const CLICK_MAX_MS = 220

  let offsetX = 0
  let offsetY = 0
  let startX = 0
  let startY = 0
  let pointerDownAt = 0
  let isDragging = false
  // Snapshot of the card's zone at pointer-down, to skip Firestore write on same-zone drop
  let originZone: string | null = null
  let pendingCardId: string | null = null
  let pendingOwnerId: string | null = null
  let pendingLayout: { x: number; y: number; w: number; h: number; rotation?: number; cssRotation?: number } | null = null
  let pendingClick: (() => void) | undefined
  let captureEl: HTMLElement | null = null

  function onPointerDown(
    e: PointerEvent,
    cardId: string,
    ownerId: string,
    layout: { x: number; y: number; w: number; h: number; rotation?: number; cssRotation?: number },
    onClick?: () => void,
  ) {
    e.preventDefault()
    offsetX = e.clientX - layout.x
    offsetY = e.clientY - layout.y
    startX = e.clientX
    startY = e.clientY
    pointerDownAt = Date.now()
    isDragging = false
    pendingClick = onClick
    pendingCardId = cardId
    pendingOwnerId = ownerId
    pendingLayout = layout
    hoveredZone.value = null
    hoveredZoneValid.value = false

    // Snapshot the card's current zone for same-zone drop detection
    const card = cards.value.find(c => c.cardId === cardId)
    originZone = card?.zoneId ?? null

    captureEl = e.currentTarget as HTMLElement
    try { captureEl.setPointerCapture(e.pointerId) } catch { /* synthetic events */ }
    captureEl.addEventListener('pointermove', onMove as EventListener)
    captureEl.addEventListener('pointerup', onUp as EventListener)
    captureEl.addEventListener('pointercancel', onCancel as EventListener)
  }

  function onMove(e: PointerEvent) {
    const dx = e.clientX - startX
    const dy = e.clientY - startY

    if (!isDragging) {
      if (Math.sqrt(dx * dx + dy * dy) <= DRAG_THRESHOLD) return
      // Threshold exceeded → enter drag mode
      isDragging = true
      dragging.value = {
        cardId: pendingCardId!,
        ownerId: pendingOwnerId!,
        x: e.clientX - offsetX,
        y: e.clientY - offsetY,
        w: pendingLayout!.w,
        h: pendingLayout!.h,
        rotation: pendingLayout!.rotation,
        cssRotation: pendingLayout!.cssRotation,
      }
    }

    dragging.value = { ...dragging.value!, x: e.clientX - offsetX, y: e.clientY - offsetY }
    const zone = hitTest(e.clientX, e.clientY)
    hoveredZone.value = zone
    const card = cards.value.find(c => c.cardId === pendingCardId) ?? null
    hoveredZoneValid.value = zone !== null && card !== null && isValidDrop(card, zone)
  }

  function cleanup() {
    captureEl?.removeEventListener('pointermove', onMove as EventListener)
    captureEl?.removeEventListener('pointerup', onUp as EventListener)
    captureEl?.removeEventListener('pointercancel', onCancel as EventListener)
    captureEl = null
    dragging.value = null
    hoveredZone.value = null
    hoveredZoneValid.value = false
    isDragging = false
    pendingCardId = null
    pendingOwnerId = null
    pendingLayout = null
    pendingClick = undefined
    originZone = null
  }

  function onUp(_e: PointerEvent) {
    if (!isDragging) {
      // No drag started — decide between click and hold-and-release
      const elapsed = Date.now() - pointerDownAt
      if (elapsed < CLICK_MAX_MS) {
        const cb = pendingClick
        cleanup()
        cb?.()
        return
      }
      // Held without moving → no action
      cleanup()
      return
    }

    // Drag ended — only write to Firestore if the zone actually changed
    if (dragging.value && hoveredZone.value && hoveredZoneValid.value) {
      const { zone } = parseZoneKey(hoveredZone.value)
      if (zone !== originZone) {
        applyAction({
          type: 'MOVE_CARD',
          playerId: dragging.value.ownerId,
          cardId: dragging.value.cardId,
          fromZoneId: originZone as ZoneId,
          toZoneId: zone as ZoneId,
        })
      }
    }

    cleanup()
  }

  function onCancel() {
    cleanup()
  }

  function hitTest(px: number, py: number): string | null {
    let best: string | null = null
    let bestArea = Infinity
    for (const [key, rect] of Object.entries(zones.value)) {
      if (px >= rect.x && px <= rect.x + rect.w && py >= rect.y && py <= rect.y + rect.h) {
        const area = rect.w * rect.h
        if (area < bestArea) { bestArea = area; best = key }
      }
    }
    return best
  }

  return { dragging, hoveredZone, hoveredZoneValid, onPointerDown }
}
