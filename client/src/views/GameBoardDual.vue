<script lang="ts" setup>
import { computed, provide, ref, watch, onMounted, onUnmounted } from 'vue'
import GameSidebarDual from '@/components/game/GameSidebarDual.vue'
import GamePresenceOverlay from '@/components/game/GamePresenceOverlay.vue'
import CardView from '@/components/game/CardView.vue'
import ZoneView from '@/components/game/ZoneView.vue'
import TokenCreationPanel from '@/components/game/TokenCreationPanel.vue'
import DeckContextMenu from '@/components/game/DeckContextMenu.vue'
import VisionTray from '@/components/game/VisionTray.vue'
import RevealBanner from '@/components/game/RevealBanner.vue'
import ShowdownPanel from '@/components/game/ShowdownPanel.vue'
import { useGameStore } from '@/stores/game'
import { usePlayerPresence } from '@/composables/usePlayerPresence'
import { useLayout, SEPARATOR } from '@/composables/useLayout'
import { useViewport } from '@/composables/useViewport'
import { useDrag, DRAG_KEY, GAME_ACTIONS_KEY } from '@/composables/useDrag'
import { useBoardShortcuts } from '@/composables/useBoardShortcuts'
import { useGamePingArrow, PING_ARROW_KEY } from '@/composables/useGamePingArrow'
import { useDeckVision } from '@/composables/useDeckVision'
import type { Rect } from '@/types/card.type'
import type { CardState, CardType, GameAction, ShowdownData, ZoneId } from '@riftbound/shared'

const store = useGameStore()
const { width: vw, height: vh } = useViewport()

// ── Player presence ───────────────────────────────────────────────────────────
const { statusOf } = usePlayerPresence(
  () => store.gameId,
  () => store.myUid,
  () => store.playerIds,
)

const absentOpponent = computed(() => {
  const opp = store.opponents[0]
  if (!opp) return null
  const name = store.playerNames[opp]?.name ?? opp.slice(0, 6)
  // Voluntary quit takes priority over connection status
  if (store.leftPlayers.includes(opp)) return { name, status: 'gone' as const }
  const s = statusOf(opp)
  if (s !== 'online') return { name, status: s }
  return null
})

// ── Ping & Arrows ─────────────────────────────────────────────────────────────

const pingArrow = useGamePingArrow(
  () => store.gameId,
  () => store.myUid,
)
provide(PING_ARROW_KEY, pingArrow)

const deckVision = useDeckVision(
  () => store.gameId,
  () => store.myUid,
)

function arrowPath(sourceCardId: string, targetCardId: string): string {
  const src = layouts.value.get(sourceCardId)
  const tgt = layouts.value.get(targetCardId)
  if (!src || !tgt) return ''
  const ox = src.x + src.w / 2
  const oy = src.y + src.h / 2
  const tx = tgt.x + tgt.w / 2
  const ty = tgt.y + tgt.h / 2
  const dx = tx - ox
  const dy = ty - oy
  const dist = Math.sqrt(dx * dx + dy * dy)
  const bend = Math.min(dist * 0.35, 80)
  // Perpendicular offset for curve
  const px = -dy / dist * bend
  const py = dx / dist * bend
  const cpx = ox + dx * 0.5 + px
  const cpy = oy + dy * 0.5 + py
  return `M ${ox} ${oy} Q ${cpx} ${cpy}, ${tx} ${ty}`
}

// ── Token creation panel ──────────────────────────────────────────────────────

const TOKEN_ZONES = new Set<ZoneId>(['base', 'battlefield_owner', 'battlefield_opponent'])

const tokenPanelOpen = ref(false)
const tokenPanelX = ref(0)
const tokenPanelY = ref(0)
const tokenPanelZone = ref<ZoneId | null>(null)

function openTokenPanel(zoneId: ZoneId, x: number, y: number) {
  tokenPanelZone.value = zoneId
  tokenPanelX.value = x
  tokenPanelY.value = y
  tokenPanelOpen.value = true
}

function onTokenCreate(name: string, cardType: CardType, imageUrl: string, zoneId: ZoneId) {
  store.createToken(name, cardType, imageUrl, zoneId)
}

// ── Keyboard shortcuts ─────────────────────────────────────────────────────────

function onKeyDown(e: KeyboardEvent) {
  if (e.key === 'Enter' && pingArrow.isArrowMode.value) {
    e.preventDefault()
    pingArrow.confirmArrows()
    return
  }
  const tag = (e.target as HTMLElement).tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA') return
  if (e.key === ' ') {
    e.preventDefault()
    if (store.isMyTurn) store.endTurn()
    return
  }
  if (e.key === 't') {
    if (tokenPanelOpen.value) {
      tokenPanelOpen.value = false
      return
    }
    // Default to my battlefield_owner zone
    const myId = store.myUid
    if (!myId) return
    const zoneKey = `${myId}_battlefield_owner`
    const rect = zones.value[zoneKey]
    if (rect) {
      openTokenPanel('battlefield_owner', rect.x + rect.w / 2, rect.y + rect.h / 2)
    } else {
      // fallback: center of screen
      openTokenPanel('battlefield_owner', window.innerWidth / 2, window.innerHeight / 2)
    }
  }
}

onMounted(() => window.addEventListener('keydown', onKeyDown))
onUnmounted(() => window.removeEventListener('keydown', onKeyDown))

// ── Board shortcuts ───────────────────────────────────────────────────────────

const shortcuts = useBoardShortcuts()

shortcuts.define({
  key: 'd',
  hint: 'Choisi la carte à défausser',
  cardTarget: 'single',
  onSelect: (card) => {
    store.applyAction({ type: 'DISCARD_CARD', playerId: card.controllerId, cardId: card.cardId, fromZoneId: card.zoneId })
  },
})

shortcuts.define({
  key: 's',
  hint: 'Choisi la carte à mettre sur le stack',
  cardTarget: 'single',
  onSelect: (card) => { store.addToStack(card.cardId) },
})

shortcuts.define({
  key: 'g',
  hint: 'Clique la carte parent',
  cardTarget: 'sequence',
  sequenceHints: [
    'Clique la carte à grouper',
    'Clique la carte parent',
  ],
  onSequence: ([child, parent]) => {
    store.applyAction({ type: 'GROUP_CARD', playerId: parent.controllerId, parentId: parent.cardId, childId: child.cardId })
  },
})

// ── Cards ─────────────────────────────────────────────────────────────────────

const allCards = computed<readonly CardState[]>(() =>
  Object.values(store.currentRound?.cards ?? {}),
)

const { zones, layouts, playersZone } = useLayout(allCards)

// ── Drag ──────────────────────────────────────────────────────────────────────

const drag = useDrag(zones, allCards, store.applyAction)
provide(DRAG_KEY, drag)
provide(GAME_ACTIONS_KEY, { applyAction: store.applyAction })

const isDragging = computed(() => drag.dragging.value !== null)

function zoneDragState(key: string): 'valid' | 'invalid' | 'dim' | null {
  if (!isDragging.value) return null
  if (drag.hoveredZone.value === key) return drag.hoveredZoneValid.value ? 'valid' : 'invalid'
  return 'dim'
}

function zoneDragHint(key: string): string | null {
  if (drag.hoveredZone.value !== key) return null
  return drag.hoveredZoneValid.value ? zoneLabel(key) : '✕ Zone interdite'
}

// ── Zone click (draw / channel rune) ──────────────────────────────────────────

const ZONE_CLICK_ACTION: Record<string, (playerId: string, cardId: string, fromZoneId: ZoneId) => GameAction> = {
  main_deck:  (playerId, cardId, fromZoneId) => ({ type: 'DRAW_CARD',    playerId, cardId, fromZoneId }),
  runes_deck: (playerId, cardId) =>             ({ type: 'CHANNEL_CARD', playerId, cardId }),
}

function parseZoneKey(key: string): { owner: string | null; zone: string } {
  const ci = key.indexOf(':')
  if (ci !== -1) return { owner: key.slice(0, ci), zone: key.slice(ci + 1) }
  const ui = key.indexOf('_')
  if (ui !== -1) return { owner: key.slice(0, ui), zone: key.slice(ui + 1) }
  return { owner: null, zone: key }
}

function onZoneClick(key: string) {
  if (isDragging.value) return
  const { owner, zone } = parseZoneKey(key)
  if (!owner || owner !== store.myUid) return
  const makeAction = ZONE_CLICK_ACTION[zone]
  if (!makeAction) return
  const topCard = allCards.value
    .filter(c => c.ownerId === owner && c.zoneId === zone)
    .sort((a, b) => b.order - a.order)[0]
  if (!topCard) return
  store.applyAction(makeAction(owner, topCard.cardId, zone as ZoneId))
}

function resolveStack() {
  store.resolveStack()
}

// ── Deck context menu ─────────────────────────────────────────────────────────

const deckMenuVisible = ref(false)
const deckMenuX = ref(0)
const deckMenuY = ref(0)
const deckMenuKey = ref<string | null>(null)

function isDeckZone(key: string): boolean {
  const { owner, zone } = parseZoneKey(key)
  return !!owner && owner === store.myUid && zone === 'main_deck'
}

// Anti-cheat halo: an opponent is currently looking at the top of this deck.
function visionOnZone(key: string): { name: string; count: number } | null {
  const { owner, zone } = parseZoneKey(key)
  if (zone !== 'main_deck' || !owner || owner === store.myUid) return null
  const presence = deckVision.activeVisions.value[owner]
  if (!presence) return null
  return { name: store.actorName(owner), count: presence.count }
}

function deckCardsSorted(key: string) {
  const { owner, zone } = parseZoneKey(key)
  return allCards.value
    .filter(c => c.ownerId === owner && c.zoneId === zone)
    .sort((a, b) => b.order - a.order)
}

function deckCount(key: string): number {
  return deckCardsSorted(key).length
}

function onDeckContextMenu(e: MouseEvent, key: string) {
  if (!isDeckZone(key)) return
  e.preventDefault()
  deckMenuKey.value = key
  deckMenuX.value = e.clientX
  deckMenuY.value = e.clientY
  deckMenuVisible.value = true
}

// ── Vision / Reveal tray ──────────────────────────────────────────────────────

const trayOpen = ref(false)
const trayMode = ref<'vision' | 'reveal'>('vision')
// Ordered card ids currently in the tray ([0] = top of deck).
const trayCardIds = ref<string[]>([])
// Snapshot of the deck order (ids) when the tray opened, to detect a reorder.
const trayOriginalDeck = ref<string[]>([])

// Per-session counters for the closing log summary.
let trayLookedCount = 0
let trayHandCount = 0

const trayCards = computed<CardState[]>(() =>
  trayCardIds.value
    .map(id => store.currentRound?.cards[id])
    .filter((c): c is CardState => !!c),
)

function openTray(count: number, mode: 'vision' | 'reveal') {
  const key = deckMenuKey.value
  if (!key) return
  const { zone } = parseZoneKey(key)
  const top = deckCardsSorted(key).slice(0, count)
  if (!top.length) return

  trayMode.value = mode
  trayCardIds.value = top.map(c => c.cardId)
  trayOriginalDeck.value = deckCardsSorted(key).map(c => c.cardId)
  trayLookedCount = top.length
  trayHandCount = 0
  trayOpen.value = true
  void zone

  const uid = store.myUid ?? ''
  const who = store.actorName(uid)
  if (mode === 'vision') {
    deckVision.setVisionPresence(top.length)
    store.writeLog(`${who} fait une vision sur ${top.length} carte${top.length > 1 ? 's' : ''} du dessus de son deck`, uid)
  } else {
    deckVision.broadcastReveal(top.map(c => c.cardId))
    store.writeLog(`${who} révèle ${top.length} carte${top.length > 1 ? 's' : ''} à l'adversaire`, uid)
  }
}

function onDeckVision(count: number) { openTray(count, 'vision') }
function onDeckReveal(count: number) { openTray(count, 'reveal') }

function onTrayAction(cardId: string, action: 'top' | 'bottom' | 'hand' | 'reveal' | 'discard') {
  const uid = store.myUid ?? ''
  const who = store.actorName(uid)
  switch (action) {
    case 'top':
      store.sendToDeck(cardId, 'main_deck', 'top', trayMode.value === 'vision')
      if (trayMode.value === 'vision') store.writeLog(`${who} a replacé une carte sur le dessus de son deck`, uid)
      break
    case 'bottom':
      store.sendToDeck(cardId, 'main_deck', 'bottom', trayMode.value === 'vision')
      if (trayMode.value === 'vision') store.writeLog(`${who} a replacé une carte sous son deck`, uid)
      break
    case 'hand':
      if (trayMode.value === 'vision') {
        store.moveToHandSilent(cardId)
        // hand count tracked, logged in closeTray summary
      } else {
        store.applyAction({ type: 'MOVE_TO_HAND', playerId: uid, cardId, fromZoneId: 'main_deck' })
      }
      trayHandCount++
      break
    case 'reveal':
      deckVision.broadcastReveal([cardId])
      store.writeLog(`${who} a montré une carte à l'adversaire`, uid)
      break
    case 'discard':
      store.applyAction({ type: 'DISCARD_CARD', playerId: uid, cardId, fromZoneId: 'main_deck' })
      break
  }
  // Remove the handled card from the tray; close when empty.
  trayCardIds.value = trayCardIds.value.filter(id => id !== cardId)
  if (!trayCardIds.value.length) closeTray()
}

function trayRevealedIds(): string[] {
  // Cards already revealed this session stay in the broadcast set.
  const key = deckMenuKey.value
  if (!key) return []
  return deckCardsSorted(key)
    .filter(c => c.state.visibleTo === 'ALL')
    .map(c => c.cardId)
}

function closeTray() {
  const uid = store.myUid ?? ''
  if (trayMode.value === 'vision' && trayLookedCount > 0) {
    const key = deckMenuKey.value
    const reordered = key
      ? deckCardsSorted(key).map(c => c.cardId).join(',') !== trayOriginalDeck.value.join(',')
      : false
    if (reordered && trayHandCount === 0) {
      store.writeLog(`${store.actorName(uid)} a réordonné son deck`, uid)
    }
    if (trayHandCount > 0) {
      store.writeLog(`${store.actorName(uid)} a mis ${trayHandCount} carte(s) en main`, uid)
    }
    deckVision.clearVisionPresence()
  }
  trayOpen.value = false
  trayCardIds.value = []
}

const trayCanAddMore = computed(() => {
  const key = deckMenuKey.value
  if (!key) return false
  return deckCardsSorted(key).some(c => !trayCardIds.value.includes(c.cardId))
})

function onTrayAddOne() {
  const key = deckMenuKey.value
  if (!key) return
  const remaining = deckCardsSorted(key).filter(c => !trayCardIds.value.includes(c.cardId))
  const next = remaining[0]
  if (!next) return
  trayCardIds.value = [...trayCardIds.value, next.cardId]
  trayLookedCount++
  const uid = store.myUid ?? ''
  const who = store.actorName(uid)
  if (trayMode.value === 'reveal') {
    deckVision.broadcastReveal([...trayRevealedIds(), next.cardId])
    store.writeLog(`${who} a révélé une carte supplémentaire à l'adversaire`, uid)
  } else {
    deckVision.setVisionPresence(trayCardIds.value.length)
    store.writeLog(`${who} a regardé une carte supplémentaire du dessus de son deck`, uid)
  }
}

function onTrayRecycleAll() {
  const key = deckMenuKey.value
  if (!key) return
  const { zone } = parseZoneKey(key)
  for (const cardId of [...trayCardIds.value]) {
    store.sendToDeck(cardId, zone as ZoneId, 'bottom', trayMode.value === 'vision')
  }
  store.shuffleDeck(zone as ZoneId)
  const uid = store.myUid ?? ''
  store.writeLog(`${store.actorName(uid)} a recyclé ${trayCardIds.value.length} carte(s) en dessous de son deck et a mélangé`, uid)
  trayCardIds.value = []
  deckVision.clearVisionPresence()
  trayOpen.value = false
}

function onDeckDraw(count: number) {
  const key = deckMenuKey.value
  if (!key) return
  const { owner, zone } = parseZoneKey(key)
  const top = deckCardsSorted(key).slice(0, count)
  for (const card of top) {
    store.applyAction({ type: 'DRAW_CARD', playerId: owner ?? '', cardId: card.cardId, fromZoneId: zone as ZoneId })
  }
}

// ── Reveal banner (opponents' view of other players' reveals) ──────────────────

const revealDismissedKey = ref<string | null>(null)

const incomingReveal = computed(() => {
  const myId = store.myUid
  for (const ev of Object.values(deckVision.reveals.value)) {
    if (ev.playerId !== myId) return ev
  }
  return null
})

const incomingRevealCards = computed<CardState[]>(() => {
  const ev = incomingReveal.value
  if (!ev) return []
  const key = ev.playerId + ':' + ev.ts
  if (key === revealDismissedKey.value) return []
  return ev.cardIds
    .map(id => store.currentRound?.cards[id])
    .filter((c): c is CardState => !!c)
})

const revealAnchor = computed(() => {
  const ev = incomingReveal.value
  if (!ev) return { x: 0, y: 0 }
  const key = `${ev.playerId}_main_deck`
  const rect = zones.value[key]
  if (!rect) return { x: window.innerWidth - 24, y: window.innerHeight - 24 }
  return { x: rect.x + rect.w, y: rect.y }
})

function dismissReveal() {
  const ev = incomingReveal.value
  if (!ev) return
  if (ev.playerId === store.myUid) {
    deckVision.clearReveal()
  } else {
    revealDismissedKey.value = ev.playerId + ':' + ev.ts
  }
}

function isClickableZone(key: string): boolean {
  if (isDragging.value) return false
  const { owner, zone } = parseZoneKey(key)
  return !!owner && owner === store.myUid && zone in ZONE_CLICK_ACTION
}

function isTokenZone(key: string): boolean {
  const { owner, zone } = parseZoneKey(key)
  if (!TOKEN_ZONES.has(zone as ZoneId)) return false
  // Show + button on my own zones only (base, battlefield_owner, battlefield_opponent are keyed by their owner)
  // For battlefield_opponent the zone belongs to opponent but we still allow token creation on it
  if (zone === 'battlefield_opponent') return !!owner && owner === store.myUid
  return !!owner && owner === store.myUid
}

function onTokenZonePlus(key: string, event: MouseEvent) {
  const { zone } = parseZoneKey(key)
  const rect = zones.value[key]
  if (!rect) return
  const btnEl = event.currentTarget as HTMLElement
  const bRect = btnEl.getBoundingClientRect()
  openTokenPanel(zone as ZoneId, bRect.left + bRect.width / 2, bRect.top - 4)
}

// ── Zone labels & counts ───────────────────────────────────────────────────────

const ZONE_DISPLAY: Record<string, string> = {
  hand: 'Main', main_deck: 'Deck', discard: 'Défausse', banish: 'Bannis',
  runes_deck: 'Runes', legend: 'Légende', champion: 'Champion',
  base: 'Base', runes: 'Runes', battlefield: 'Champ de bataille', stack: 'Stack',
}

const LABELED_ZONES = new Set(['runes_deck', 'legend', 'champion', 'main_deck', 'discard', 'banish', 'battlefield_owner', 'battlefield_opponent', 'base', 'runes'])

function zoneLabel(key: string): string {
  const { zone } = parseZoneKey(key)
  if (zone === 'battlefield_owner') return 'Mon battlefield'
  if (zone === 'battlefield_opponent') {
    const oppId = store.opponents[0]
    const oppName = oppId ? (store.playerNames[oppId]?.name ?? oppId.slice(0, 6)) : '?'
    return `Battlefield de ${oppName}`
  }
  return ZONE_DISPLAY[zone] ?? zone
}

// Deck-type zones: bottom for top player (opponent), top for bottom player (local).
// All other labeled zones: always bottom (label sits on lower border).
const DECK_ZONES = new Set(['runes_deck', 'main_deck', 'discard', 'banish'])

function labelSide(key: string): 'top' | 'bottom' {
  const { owner, zone } = parseZoneKey(key)
  if (DECK_ZONES.has(zone)) {
    return owner === store.myUid ? 'top' : 'bottom'
  }
  return 'bottom'
}

const zoneCounts = computed(() => {
  const out: Record<string, number> = {}
  for (const card of allCards.value) {
    const key = `${card.ownerId}_${card.zoneId}`
    out[key] = (out[key] ?? 0) + 1
  }
  return out
})

// Rune zone exhausted stats: maps "{playerId}_runes" → { exhausted, total }
const runeStats = computed(() => {
  const out: Record<string, { exhausted: number; total: number }> = {}
  for (const card of allCards.value) {
    if (card.zoneId !== 'runes') continue
    const key = `${card.ownerId}_runes`
    if (!out[key]) out[key] = { exhausted: 0, total: 0 }
    out[key].total++
    if (card.state.exhausted) out[key].exhausted++
  }
  return out
})

const stackCount = computed(() => allCards.value.filter(c => c.zoneId === 'stack').length)

// ── Showdown panels ────────────────────────────────────────────────────────────
// Stored in Firestore → both players see the same state in real-time.
// Auto-created when I move cards onto the opponent's battlefield (I'm the attacker).

const showdownPanels = computed(() => {
  const myId = store.myUid
  const oppId = store.opponents[0]
  if (!myId || !oppId) return []

  return Object.entries(store.currentRound?.showdowns ?? {})
    .map(([bfOwnerId, sd]) => {
      const rect = zones.value[`${bfOwnerId}${SEPARATOR}battlefield`]
      if (!rect) return null
      const oppIdInSd = sd.attackerId === myId ? sd.bfOwnerId : sd.attackerId
      return { bfOwnerId, rect, sd, opponentName: store.actorName(oppIdInSd) }
    })
    .filter((p): p is NonNullable<typeof p> => p !== null)
})

function panelPos(rect: Rect): { x: number; y: number } {
  return { x: rect.x + rect.w * 0.62 + 16, y: rect.y + rect.h / 2 }
}

// Auto-create showdown when I move cards to opponent's BF (I = attacker, I go first)
watch(
  () => {
    const myId = store.myUid
    const oppId = store.opponents[0]
    if (!myId || !oppId) return 0
    return zoneCounts.value[`${myId}_battlefield_opponent`] ?? 0
  },
  (count) => {
    const myId = store.myUid
    const oppId = store.opponents[0]
    if (!myId || !oppId || count === 0) return
    if (store.currentRound?.showdowns?.[oppId]) return  // already exists

    store.writeLog(`${store.actorName(myId)} attaque le battlefield`, myId)
    store.setShowdown(oppId, {
      bfOwnerId: oppId,
      attackerId: myId,
      currentTurnId: myId,   // attacker has focus first
      passCount: 0,
      ended: false,
      startedAt: Date.now(),
    })
  },
)

function onPass(sd: ShowdownData) {
  const myId = store.myUid ?? ''
  const opponent = sd.currentTurnId === sd.attackerId ? sd.bfOwnerId : sd.attackerId
  const nextPass = sd.passCount + 1

  store.writeLog(`${store.actorName(myId)} passe`, myId)

  if (nextPass >= 2) {
    store.writeLog('Showdown terminé', null)
    store.setShowdown(sd.bfOwnerId, { ...sd, passCount: 2, ended: true })
  } else {
    store.setShowdown(sd.bfOwnerId, { ...sd, passCount: nextPass, currentTurnId: opponent })
  }
}

function onConquer(sd: ShowdownData) {
  const myId = store.myUid ?? ''
  store.setScore(myId, (store.myState?.score ?? 0) + 1)
  store.writeLog(`${store.actorName(myId)} conquiert le battlefield et marque 1 point`, myId)
  store.clearShowdown(sd.bfOwnerId)
}

function onCloseShowdown(sd: ShowdownData) {
  store.clearShowdown(sd.bfOwnerId)
}


// ── Player colors ─────────────────────────────────────────────────────────────

const PALETTE = ['#4fc3f7', '#ef5350', '#66bb6a', '#ffa726']
const shuffled = [...PALETTE].sort(() => Math.random() - 0.5)
const playerColors: Record<string, string> = Object.fromEntries(
  store.playerIds.map((id: string, i: number) => [id, shuffled[i % shuffled.length]])
)

function playerIdFromKey(key: string): string | null {
  for (const id of store.playerIds) {
    if (key.startsWith(id + '_') || key.startsWith(id + SEPARATOR)) return id
  }
  return null
}

function colorOfZoneKey(key: string): string | undefined {
  const pid = playerIdFromKey(key)
  return pid ? playerColors[pid] : undefined
}

function colorOfPlayerId(pid: string): string {
  return playerColors[pid] ?? '#ffffff'
}

function bfKey(zoneKey: string): string {
  const pid = playerIdFromKey(zoneKey) ?? zoneKey.split(SEPARATOR)[0]
  return pid + SEPARATOR + 'battlefield'
}

const BLEED = 8
function bleedRect(rect: Rect): Rect {
  let { x, y, w, h } = rect
  if (x < 50)                   { x -= BLEED; w += BLEED }
  if (x + w > vw.value - 50)   { w += BLEED }
  if (y < 10)                   { y -= BLEED; h += BLEED }
  if (y + h > vh.value - 10)   { h += BLEED }
  return { x, y, w, h }
}
</script>

<template>
  <div class="w-screen h-screen flex bg-[#0a1628]">
    <GameSidebarDual @clear-arrows="pingArrow.clearMyArrows()"/>

    <div class="flex-1">

      <!-- Player territories -->
      <div class="players-layer">
        <template v-for="(rect, key) in playersZone" :key="key">
          <div
            class="player-zone"
            :style="{
              left:   bleedRect(rect).x + 'px',
              top:    bleedRect(rect).y + 'px',
              width:  bleedRect(rect).w + 'px',
              height: bleedRect(rect).h + 'px',
            }"
          />
        </template>
      </div>

      <!-- Zones layer (z:2) -->
      <div class="zones-layer">
        <ZoneView
          v-for="(rect, key) in zones"
          :key="key"
          :rect="rect"
          :no-frame="['battlefield', 'hand'].includes(parseZoneKey(String(key)).zone)"
          :drag-state="zoneDragState(String(key))"
          :hint="zoneDragHint(String(key))"
          :clickable="isClickableZone(String(key))"
          @click="onZoneClick(String(key))"
        />
      </div>

      <!-- Zone overlays: labels + counts + click targets (z:4) -->
      <div class="overlays-layer" style="z-index:4; pointer-events:none">
        <template v-for="(rect, key) in zones" :key="'ov-' + key">

          <!-- Zone label + count badge -->
          <div
            v-if="LABELED_ZONES.has(parseZoneKey(String(key)).zone) && rect.w > 0"
            class="zone-overlay"
            :style="{ left: rect.x + 'px', top: rect.y + 'px', width: rect.w + 'px', height: rect.h + 'px' }"
          >
            <span class="zone-name" :class="labelSide(String(key)) === 'top' ? 'zone-name--top' : 'zone-name--bottom'">
              {{ zoneLabel(String(key)) }}
            </span>
            <div class="zone-count" :class="labelSide(String(key)) === 'top' ? 'zone-count--top-right' : 'zone-count--bottom-left'">
              <template v-if="parseZoneKey(String(key)).zone === 'runes' && runeStats[String(key)]">
                {{ runeStats[String(key)].total - runeStats[String(key)].exhausted }}/{{ runeStats[String(key)].total }}
              </template>
              <template v-else>
                {{ zoneCounts[String(key)] ?? 0 }}
              </template>
            </div>
          </div>

          <!-- Click overlay for drawable zones (above cards) -->
          <div
            v-if="isClickableZone(String(key)) && rect.w > 0"
            class="zone-overlay zone-click-overlay"
            style="pointer-events: auto"
            :style="{ left: rect.x + 'px', top: rect.y + 'px', width: rect.w + 'px', height: rect.h + 'px' }"
            @click="onZoneClick(String(key))"
            @contextmenu="onDeckContextMenu($event, String(key))"
          />

          <!-- Résoudre button for stack zone -->
          <div
            v-if="parseZoneKey(String(key)).zone === 'stack' && stackCount > 0"
            class="zone-overlay"
            style="pointer-events: none"
            :style="{ left: rect.x + 'px', top: rect.y + 'px', width: rect.w + 'px', height: rect.h + 'px' }"
          >
            <button class="resolve-btn" style="pointer-events: auto" @click="resolveStack()">Résoudre</button>
          </div>

          <!-- Token + button for base / battlefield zones -->
          <div
            v-if="isTokenZone(String(key)) && rect.w > 0"
            class="zone-overlay"
            style="pointer-events: none"
            :style="{ left: rect.x + 'px', top: rect.y + 'px', width: rect.w + 'px', height: rect.h + 'px' }"
          >
            <button
              class="token-add-btn"
              style="pointer-events: auto"
              title="Créer un token (T)"
              @click="onTokenZonePlus(String(key), $event)"
            >+</button>
          </div>

          <!-- Anti-cheat halo: opponent is looking at the top of their deck -->
          <div
            v-if="visionOnZone(String(key)) && rect.w > 0"
            class="zone-overlay vision-halo"
            style="pointer-events: none"
            :style="{ left: rect.x + 'px', top: rect.y + 'px', width: rect.w + 'px', height: rect.h + 'px' }"
          >
            <div class="vision-halo-label">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              {{ visionOnZone(String(key))!.name }} regarde {{ visionOnZone(String(key))!.count }} carte{{ visionOnZone(String(key))!.count > 1 ? 's' : '' }}…
            </div>
          </div>

        </template>
      </div>

      <!-- Cards layer (z:3) -->
      <div class="cards-layer">
        <template v-for="card in allCards" :key="card.cardId">
          <CardView
            v-if="layouts.get(card.cardId)"
            :card="card"
            :layout="layouts.get(card.cardId)!"
            :current-player-id="store.myUid ?? ''"
          />
        </template>
      </div>

      <!-- SVG arrows overlay (z:5) -->
      <svg class="arrows-layer" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <marker id="ah-local" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill="rgba(255,112,67,0.95)"/>
          </marker>
          <marker id="ah-remote" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill="rgba(239,83,80,0.95)"/>
          </marker>
        </defs>

        <!-- Local targets (arrow mode in progress) -->
        <template v-if="pingArrow.isArrowMode.value && pingArrow.localSourceCardId.value">
          <path
            v-for="targetId in pingArrow.localTargets.value"
            :key="'local-' + targetId"
            :d="arrowPath(pingArrow.localSourceCardId.value!, targetId)"
            stroke="rgba(255,112,67,0.85)"
            stroke-width="2"
            fill="none"
            stroke-dasharray="7 4"
            stroke-linecap="round"
            marker-end="url(#ah-local)"
            class="arrow-path"
          />
        </template>

        <!-- Confirmed arrows (from RTDB) -->
        <template v-for="group in pingArrow.arrowGroups.value" :key="group.sourceCardId">
          <path
            v-for="targetId in group.targetCardIds"
            :key="group.sourceCardId + '-' + targetId"
            :d="arrowPath(group.sourceCardId, targetId)"
            stroke="rgba(239,83,80,0.9)"
            stroke-width="2.5"
            fill="none"
            stroke-linecap="round"
            marker-end="url(#ah-remote)"
            class="arrow-path arrow-path--solid"
          />
        </template>
      </svg>

      <!-- Deck context menu -->
      <DeckContextMenu
        :visible="deckMenuVisible"
        :x="deckMenuX"
        :y="deckMenuY"
        :deck-count="deckMenuKey ? deckCount(deckMenuKey) : 0"
        @close="deckMenuVisible = false"
        @vision="onDeckVision"
        @reveal="onDeckReveal"
        @draw="onDeckDraw"
      />

      <!-- Vision / Reveal tray (the acting player's own view) -->
      <VisionTray
        :open="trayOpen"
        :cards="trayCards"
        :mode="trayMode"
        :can-add-more="trayCanAddMore"
        @action="onTrayAction"
        @add-one="onTrayAddOne"
        @recycle-all="onTrayRecycleAll"
        @close="closeTray"
      />

      <!-- Reveal banner (other players' reveals, 2-phase) -->
      <RevealBanner
        v-if="incomingRevealCards.length"
        :cards="incomingRevealCards"
        :revealer-name="incomingReveal ? store.actorName(incomingReveal.playerId) : ''"
        :anchor-x="revealAnchor.x"
        :anchor-y="revealAnchor.y"
        @done="dismissReveal"
      />

      <!-- Showdown panels (synced via Firestore, auto-created on move) -->
      <ShowdownPanel
        v-for="panel in showdownPanels"
        :key="'sd-' + panel.bfOwnerId"
        :showdown="panel.sd"
        :my-id="store.myUid ?? ''"
        :opponent-name="panel.opponentName"
        :x="panelPos(panel.rect).x"
        :y="panelPos(panel.rect).y"
        @pass="onPass(panel.sd)"
        @conquer="onConquer(panel.sd)"
        @close="onCloseShowdown(panel.sd)"
      />

      <!-- Token creation panel -->
      <TokenCreationPanel
        v-model:open="tokenPanelOpen"
        :x="tokenPanelX"
        :y="tokenPanelY"
        :target-zone="tokenPanelZone"
        @create="onTokenCreate"
      />

      <!-- Presence overlay (opponent disconnected / left) -->
      <GamePresenceOverlay
        v-if="absentOpponent"
        :player-name="absentOpponent.name"
        :status="absentOpponent.status"
      />

      <!-- Arrow mode confirm button (z:10) -->
      <Transition name="arrow-ok">
        <div v-if="pingArrow.isArrowMode.value" class="arrow-ok-bar">
          <button class="arrow-ok-btn" @click="pingArrow.confirmArrows()">OK</button>
          <button class="arrow-cancel-btn" @click="pingArrow.cancelArrowMode()">✕</button>
        </div>
      </Transition>

    </div>
  </div>
</template>

<style scoped>
.players-layer {
  position: fixed;
  z-index: 1;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}

.player-zone {
  position: fixed;
}

.zones-layer {
  position: fixed;
  z-index: 2;
  inset: 0;
}

.cards-layer {
  position: fixed;
  z-index: 3;
  inset: 0;
}

.overlays-layer {
  position: fixed;
  inset: 0;
}

.zone-overlay {
  position: fixed;
}

.zone-click-overlay {
  cursor: pointer;
  border-radius: 6px;
}

.zone-click-overlay:hover {
  background: rgba(255, 255, 255, 0.06);
}

/* Anti-cheat vision halo */
.vision-halo {
  border-radius: 6px;
  box-shadow: 0 0 0 3px rgba(200, 170, 110, 0.35), 0 0 18px rgba(200, 170, 110, 0.4);
  border: 1px solid #C8AA6E;
  animation: vision-pulse 1.4s ease-in-out infinite;
}

@keyframes vision-pulse {
  0%, 100% { box-shadow: 0 0 0 3px rgba(200, 170, 110, 0.3), 0 0 14px rgba(200, 170, 110, 0.3); }
  50%      { box-shadow: 0 0 0 4px rgba(200, 170, 110, 0.5), 0 0 22px rgba(200, 170, 110, 0.55); }
}

.vision-halo-label {
  position: absolute;
  bottom: calc(100% + 6px);
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
  padding: 5px 10px;
  background: rgba(13, 28, 46, 0.94);
  border: 1px solid rgba(200, 170, 110, 0.3);
  border-radius: 6px;
  color: #F2E5CD;
  font-size: 11px;
}
.vision-halo-label svg { color: #C8AA6E; flex-shrink: 0; }

/* Zone labels */
.zone-name {
  position: absolute;
  left: 0;
  right: 0;
  text-align: center;
  font-size: 9px;
  font-weight: 600;
  color: #6a8a90;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  white-space: nowrap;
  pointer-events: none;
  line-height: 1;
  user-select: none;
}

.zone-name--top    { top: 3px; }
.zone-name--bottom { bottom: 3px; }

/* Card count badge */
.zone-count {
  position: absolute;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.25);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.8);
  pointer-events: none;
}

.zone-count--top-right   { top: 4px;    right: 4px; }
.zone-count--bottom-left { bottom: 4px; left: 4px; }

/* Token + button */
.token-add-btn {
  position: absolute;
  top: 4px;
  left: 4px;
  width: 18px;
  height: 18px;
  border-radius: 4px;
  background: rgba(200, 170, 110, 0.18);
  border: 1px solid rgba(200, 170, 110, 0.55);
  color: #C8AA6E;
  font-size: 14px;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  opacity: 0.75;
  transition: opacity 0.15s, background 0.15s, border-color 0.15s, box-shadow 0.15s;
  box-shadow: 0 0 4px rgba(200, 170, 110, 0.2);
}
.token-add-btn:hover {
  opacity: 1;
  background: rgba(200, 170, 110, 0.3);
  border-color: #C8AA6E;
  box-shadow: 0 0 8px rgba(200, 170, 110, 0.4);
}

/* SVG arrows overlay */
.arrows-layer {
  position: fixed;
  inset: 0;
  z-index: 5;
  pointer-events: none;
  width: 100%;
  height: 100%;
  overflow: visible;
}

.arrow-path {
  filter: drop-shadow(0 0 4px rgba(255, 112, 67, 0.4));
}

.arrow-path--solid {
  filter: drop-shadow(0 0 5px rgba(239, 83, 80, 0.5));
  animation: arrow-appear 0.3s ease-out;
}

@keyframes arrow-appear {
  from { opacity: 0; stroke-dashoffset: 200; }
  to   { opacity: 1; stroke-dashoffset: 0; }
}

/* Arrow mode OK bar */
.arrow-ok-bar {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  background: rgba(6, 15, 27, 0.92);
  border: 1px solid rgba(255, 112, 67, 0.5);
  border-radius: 8px;
  backdrop-filter: blur(8px);
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.5);
}

.arrow-ok-btn {
  padding: 6px 20px;
  border: 1px solid rgba(255, 112, 67, 0.6);
  background: rgba(255, 112, 67, 0.12);
  color: #ff7043;
  font-size: 0.7rem;
  font-weight: 900;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  cursor: pointer;
  border-radius: 4px;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
}

.arrow-ok-btn:hover {
  background: rgba(255, 112, 67, 0.25);
  border-color: #ff7043;
  color: #ffab91;
}

.arrow-cancel-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: transparent;
  color: rgba(255, 255, 255, 0.4);
  font-size: 0.75rem;
  cursor: pointer;
  border-radius: 4px;
  transition: background 0.15s, color 0.15s;
}

.arrow-cancel-btn:hover {
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.7);
}

.arrow-ok-enter-active,
.arrow-ok-leave-active {
  transition: opacity 0.2s, transform 0.2s;
}

.arrow-ok-enter-from,
.arrow-ok-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(12px);
}

/* Resolve stack button */
.resolve-btn {
  position: absolute;
  bottom: 10px;
  left: 50%;
  transform: translateX(-50%);
  padding: 10px 20px;
  border: 1px solid rgba(200, 170, 110, 0.5);
  background: rgba(200, 170, 110, 0.08);
  color: #C8AA6E;
  font-size: 0.7rem;
  font-weight: 900;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
}

.resolve-btn:hover {
  background: rgba(200, 170, 110, 0.15);
  border-color: #C8AA6E;
  color: #F2E5CD;
}

</style>
