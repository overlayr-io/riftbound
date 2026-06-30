<script lang="ts" setup>
import { computed, provide, ref, watch, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import GameSidebarDual from '@/components/game/GameSidebarDual.vue'
import GamePresenceOverlay from '@/components/game/GamePresenceOverlay.vue'
import CardView from '@/components/game/CardView.vue'
import ZoneView from '@/components/game/ZoneView.vue'
import PlaymatLayer from '@/components/game/PlaymatLayer.vue'
import TokenCreationPanel from '@/components/game/TokenCreationPanel.vue'
import DeckContextMenu from '@/components/game/DeckContextMenu.vue'
import RunesDeckContextMenu from '@/components/game/RunesDeckContextMenu.vue'
import HandContextMenu from '@/components/game/HandContextMenu.vue'
import VisionTray from '@/components/game/VisionTray.vue'
import ZoneTray from '@/components/game/ZoneTray.vue'
import type { ZoneTrayAction } from '@/components/game/ZoneTray.vue'
import RevealBanner from '@/components/game/RevealBanner.vue'
import KeywordPanel from '@/components/game/KeywordPanel.vue'
import XpCounter from '@/components/game/XpCounter.vue'
import { useGameStore } from '@/stores/game'
import { usePlayerPresence } from '@/composables/usePlayerPresence'
import { useLayout, SEPARATOR } from '@/composables/useLayout'
import { useViewport } from '@/composables/useViewport'
import { useDrag, DRAG_KEY, GAME_ACTIONS_KEY, KEYWORD_TARGET_KEY } from '@/composables/useDrag'
import { useBoardShortcuts } from '@/composables/useBoardShortcuts'
import { useGamePingArrow, PING_ARROW_KEY } from '@/composables/useGamePingArrow'
import { useDeckVision } from '@/composables/useDeckVision'
import { usePlaymat } from '@/composables/usePlaymat'
import type { Rect } from '@/types/card.type'
import type { CardState, CardType, GameAction, ZoneId } from '@riftbound/shared'
import baronPitImg from '@/assets/img/baron_pit.webp'
import brushImg from '@/assets/img/brush.webp'

const store = useGameStore()
const { width: vw, height: vh } = useViewport()
const router = useRouter()

// ── Player presence ─────────────────────────────────────────────────────────────
const { statusOf } = usePlayerPresence(
  () => store.gameId,
  () => store.myUid,
  () => store.playerIds,
)

// First opponent that is absent (disconnected / left) — drives the presence overlay.
const absentOpponent = computed(() => {
  for (const opp of store.opponents) {
    const name = store.playerNames[opp]?.name ?? opp.slice(0, 6)
    const s = statusOf(opp)
    if (s === 'online') continue
    if (store.leftPlayers.includes(opp)) return { name, status: 'gone' as const }
    return { name, status: s }
  }
  return null
})

async function handleOpponentQuit() {
  await store.leaveVoluntarily()
  router.push('/')
}

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
  const dist = Math.sqrt(dx * dx + dy * dy) || 1
  const bend = Math.min(dist * 0.35, 80)
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
  if (e.key === 'Escape') {
    if (keywordPanelOpen.value) { keywordPanelOpen.value = false; return }
    if (keywordTargetActive.value) { keywordTargetActive.value = false; pendingKeywords = []; return }
  }
  if (e.key === 't') {
    if (tokenPanelOpen.value) { tokenPanelOpen.value = false; return }
    const myId = store.myUid
    if (!myId) return
    const rect = zones.value[`${myId}_base`]
    if (rect) openTokenPanel('base', rect.x + rect.w / 2, rect.y + rect.h / 2)
    else openTokenPanel('base', window.innerWidth / 2, window.innerHeight / 2)
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
  key: 'k',
  hint: 'Keywords',
  onInstant: () => { keywordPanelOpen.value = true },
})

shortcuts.define({
  key: 'g',
  hint: 'Clique la carte parent',
  cardTarget: 'sequence',
  sequenceHints: ['Clique la carte à grouper', 'Clique la carte parent'],
  onSequence: ([child, parent]) => {
    store.applyAction({ type: 'GROUP_CARD', playerId: parent.controllerId, parentId: parent.cardId, childId: child.cardId })
  },
})

// ── Cards & layout ─────────────────────────────────────────────────────────────
const allCards = computed<readonly CardState[]>(() =>
  Object.values(store.currentRound?.cards ?? {}),
)

const { zones, layouts, playersZone } = useLayout(allCards)
const { resolved: playmat, vars: playmatVars } = usePlaymat('2v2')

// ── Player colors (random, stable for the session) ──────────────────────────
const PALETTE = ['#4fc3f7', '#ef5350', '#66bb6a', '#ffa726']
const shuffled = [...PALETTE].sort(() => Math.random() - 0.5)
const playerColors: Record<string, string> = Object.fromEntries(
  store.playerIds.map((id, i) => [id, shuffled[i % shuffled.length]]),
)

function playerIdFromKey(key: string): string | null {
  for (const id of store.playerIds) {
    if (key.startsWith(id + '_') || key.startsWith(id + SEPARATOR)) return id
  }
  return null
}

function colorOfPlayerId(pid: string): string {
  return playerColors[pid] ?? '#ffffff'
}

function bfKey(zoneKey: string): string {
  const pid = playerIdFromKey(zoneKey) ?? zoneKey.split(SEPARATOR)[0]
  return pid + SEPARATOR + 'battlefield'
}

// ── Ivern Brush ───────────────────────────────────────────────────────────────
const hasIvernLegend = computed(() => {
  const myId = store.myUid
  return allCards.value.some(c => c.ownerId === myId && c.zoneId === 'legend' && c.description.name === 'Ivern, Green Father')
})

const brushTokens = computed(() =>
  allCards.value.filter(c => c.isToken && c.zoneId === 'battlefield' && c.description.name === 'Brush'),
)
const isBrushActive = computed(() => brushTokens.value.length > 0)

const brushDeleteMenuX = ref(0)
const brushDeleteMenuY = ref(0)
const brushDeleteMenuOpen = ref(false)
const brushDeleteTargetId = ref<string | null>(null)

function onBattlefieldCardClick(targetOwnerId: string) {
  if (!hasIvernLegend.value) return
  const existing = allCards.value.find(c => c.isToken && c.ownerId === targetOwnerId && c.zoneId === 'battlefield' && c.description.name === 'Brush')
  if (existing) store.destroyToken(existing.cardId)
  else store.createToken('Brush', 'battlefield', brushImg, 'battlefield', false, targetOwnerId)
}

function onBrushTokenContextMenu(e: MouseEvent, cardId: string) {
  brushDeleteMenuX.value = e.clientX
  brushDeleteMenuY.value = e.clientY
  brushDeleteTargetId.value = cardId
  brushDeleteMenuOpen.value = true
}

function deleteBrushToken() {
  if (brushDeleteTargetId.value) store.destroyToken(brushDeleteTargetId.value)
  brushDeleteMenuOpen.value = false
  brushDeleteTargetId.value = null
}

// ── Drag ──────────────────────────────────────────────────────────────────────
const drag = useDrag(zones, allCards, store.applyAction)
provide(DRAG_KEY, drag)
provide(GAME_ACTIONS_KEY, { applyAction: store.applyAction })

// ── Keyword panel ─────────────────────────────────────────────────────────────
const keywordPanelOpen = ref(false)
const keywordTargetActive = ref(false)
let pendingKeywords: string[] = []

function onKeywordStartTargeting(keywords: string[]) {
  pendingKeywords = keywords
  keywordPanelOpen.value = false
  keywordTargetActive.value = true
}

function onKeywordCardClick(card: CardState) {
  store.applyAction({ type: 'SET_KEYWORDS', playerId: card.controllerId, cardId: card.cardId, keywords: pendingKeywords })
  keywordTargetActive.value = false
  pendingKeywords = []
}

provide(KEYWORD_TARGET_KEY, { active: keywordTargetActive, onCardClick: onKeywordCardClick })

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
  main_deck:  (playerId, cardId, fromZoneId) => ({ type: 'DRAW_CARD', playerId, cardId, fromZoneId }),
  runes_deck: (playerId, cardId) => ({ type: 'CHANNEL_CARD', playerId, cardId }),
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

function isRunesDeckZone(key: string): boolean {
  const { owner, zone } = parseZoneKey(key)
  return !!owner && owner === store.myUid && zone === 'runes_deck'
}

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

// ── Runes deck context menu ───────────────────────────────────────────────────
const runesDeckMenuVisible = ref(false)
const runesDeckMenuX = ref(0)
const runesDeckMenuY = ref(0)
const runesDeckMenuKey = ref<string | null>(null)

function onRunesDeckContextMenu(e: MouseEvent, key: string) {
  if (!isRunesDeckZone(key)) return
  e.preventDefault()
  runesDeckMenuKey.value = key
  runesDeckMenuX.value = e.clientX
  runesDeckMenuY.value = e.clientY
  runesDeckMenuVisible.value = true
}

function onRunesDeckDrawRunes(count: number) {
  const key = runesDeckMenuKey.value
  if (!key) return
  const { owner } = parseZoneKey(key)
  const sorted = deckCardsSorted(key)
  const bottom = sorted.slice(-count).reverse()
  const uid = owner ?? ''
  const who = store.actorName(uid)
  for (const card of bottom) {
    store.applyAction({ type: 'CHANNEL_CARD', playerId: uid, cardId: card.cardId })
  }
  store.writeLog(`${who} a pioché ${bottom.length} rune${bottom.length > 1 ? 's' : ''} en dessous de son deck de runes`, uid)
}

// ── Vision / Reveal tray ──────────────────────────────────────────────────────
const trayOpen = ref(false)
const trayMode = ref<'vision' | 'reveal'>('vision')
const trayCardIds = ref<string[]>([])
const trayOriginalDeck = ref<string[]>([])
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
  const top = deckCardsSorted(key).slice(0, count)
  if (!top.length) return
  trayMode.value = mode
  trayCardIds.value = top.map(c => c.cardId)
  trayOriginalDeck.value = deckCardsSorted(key).map(c => c.cardId)
  trayLookedCount = top.length
  trayHandCount = 0
  trayOpen.value = true

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

function onTrayAction(cardId: string, action: 'top' | 'bottom' | 'hand' | 'reveal' | 'discard' | 'stack') {
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
      if (trayMode.value === 'vision') store.moveToHandSilent(cardId)
      else store.applyAction({ type: 'MOVE_TO_HAND', playerId: uid, cardId, fromZoneId: 'main_deck' })
      trayHandCount++
      break
    case 'reveal':
      deckVision.broadcastReveal([cardId])
      store.writeLog(`${who} a montré une carte à l'adversaire`, uid)
      break
    case 'discard':
      store.applyAction({ type: 'DISCARD_CARD', playerId: uid, cardId, fromZoneId: 'main_deck' })
      break
    case 'stack':
      store.applyAction({ type: 'MOVE_CARD', playerId: uid, cardId, fromZoneId: 'main_deck', toZoneId: 'stack' })
      break
  }
  if (action !== 'reveal') {
    trayCardIds.value = trayCardIds.value.filter(id => id !== cardId)
    if (!trayCardIds.value.length) closeTray()
  }
}

function trayRevealedIds(): string[] {
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
    if (reordered && trayHandCount === 0) store.writeLog(`${store.actorName(uid)} a réordonné son deck`, uid)
    if (trayHandCount > 0) store.writeLog(`${store.actorName(uid)} a mis ${trayHandCount} carte(s) en main`, uid)
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

function onDeckDrawBottom(count: number) {
  const key = deckMenuKey.value
  if (!key) return
  const { owner, zone } = parseZoneKey(key)
  const bottom = deckCardsSorted(key).slice(-count).reverse()
  for (const card of bottom) {
    store.applyAction({ type: 'DRAW_CARD', playerId: owner ?? '', cardId: card.cardId, fromZoneId: zone as ZoneId })
  }
}

// ── Reveal banner (other players' reveals) ────────────────────────────────────
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
  const rect = zones.value[`${ev.playerId}_main_deck`]
  if (!rect) return { x: window.innerWidth - 24, y: window.innerHeight - 24 }
  return { x: rect.x + rect.w, y: rect.y }
})

function dismissReveal() {
  const ev = incomingReveal.value
  if (!ev) return
  if (ev.playerId === store.myUid) deckVision.clearReveal()
  else revealDismissedKey.value = ev.playerId + ':' + ev.ts
}

function isClickableZone(key: string): boolean {
  if (isDragging.value) return false
  const { owner, zone } = parseZoneKey(key)
  return !!owner && owner === store.myUid && zone in ZONE_CLICK_ACTION
}

function isTokenZone(key: string): boolean {
  const { owner, zone } = parseZoneKey(key)
  if (!TOKEN_ZONES.has(zone as ZoneId)) return false
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

const LABELED_ZONES = new Set(['hand', 'runes_deck', 'legend', 'champion', 'main_deck', 'discard', 'banish', 'battlefield_owner', 'battlefield_opponent', 'base', 'runes', 'baron_nashor_owner', 'baron_nashor_opponent'])

function zoneLabel(key: string): string {
  const { owner, zone } = parseZoneKey(key)
  if (zone === 'baron_nashor_owner') return 'Baron Nashor'
  if (zone === 'baron_nashor_opponent') return 'Attaquants'
  if (zone === 'battlefield_owner') {
    return owner === store.myUid ? 'Mon battlefield' : `Battlefield de ${store.playerNames[owner ?? '']?.name ?? (owner ?? '').slice(0, 6)}`
  }
  if (zone === 'battlefield_opponent') return 'Attaquants'
  return ZONE_DISPLAY[zone] ?? zone
}

const DECK_ZONES = new Set(['runes_deck', 'main_deck', 'discard', 'banish'])

function labelSide(key: string): 'top' | 'bottom' {
  const { owner, zone } = parseZoneKey(key)
  if (DECK_ZONES.has(zone) || zone === 'hand') {
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

// Baron Nashor → Baron Pit token in baron_nashor zone
watch(
  () => allCards.value.filter(c => c.description.name === 'Baron Nashor' && c.zoneId === 'base'),
  (baronCards) => {
    const myId = store.myUid
    for (const card of baronCards) {
      if (card.ownerId !== myId) continue
      const exists = allCards.value.some(c => c.isToken && c.zoneId === 'baron_nashor' && c.description.name === 'Baron Pit')
      if (exists) continue
      store.createToken('Baron Pit', 'battlefield', baronPitImg, 'baron_nashor', false)
    }
  },
  { deep: false },
)

// ── Discard / Banish trays (mine, interactive) ─────────────────────────────────
const discardTrayOpen = ref(false)
const banishTrayOpen = ref(false)

const discardTrayCards = computed(() => {
  const uid = store.myUid
  if (!uid) return []
  return allCards.value.filter(c => c.ownerId === uid && c.zoneId === 'discard').slice().sort((a, b) => b.order - a.order)
})

const banishTrayCards = computed(() => {
  const uid = store.myUid
  if (!uid) return []
  return allCards.value.filter(c => c.ownerId === uid && c.zoneId === 'banish').slice().sort((a, b) => b.order - a.order)
})

// Other players' trays (read-only)
const otherTrayOpen = ref(false)
const otherTrayPlayerId = ref<string | null>(null)
const otherTrayZone = ref<'discard' | 'banish'>('discard')

const otherTrayCards = computed(() => {
  const pid = otherTrayPlayerId.value
  if (!pid) return []
  return allCards.value.filter(c => c.ownerId === pid && c.zoneId === otherTrayZone.value).slice().sort((a, b) => b.order - a.order)
})

const otherTrayTitle = computed(() => {
  const pid = otherTrayPlayerId.value
  const name = pid ? (store.playerNames[pid]?.name ?? pid.slice(0, 6)) : ''
  const label = otherTrayZone.value === 'discard' ? 'Défausse' : 'Bannis'
  return `${label} de ${name} — ${otherTrayCards.value.length} carte${otherTrayCards.value.length !== 1 ? 's' : ''}`
})

function openOtherTray(key: string, zone: 'discard' | 'banish') {
  const { owner } = parseZoneKey(key)
  if (!owner) return
  otherTrayPlayerId.value = owner
  otherTrayZone.value = zone
  otherTrayOpen.value = true
}

function onDiscardTrayAction(cardId: string, action: ZoneTrayAction) {
  const uid = store.myUid ?? ''
  const who = store.actorName(uid)
  switch (action) {
    case 'top':
      store.sendToDeck(cardId, 'main_deck', 'top', false)
      store.writeLog(`${who} a remis une carte sur le dessus de son deck depuis la défausse`, uid)
      break
    case 'bottom':
      store.sendToDeck(cardId, 'main_deck', 'bottom', false)
      store.writeLog(`${who} a remis une carte sous son deck depuis la défausse`, uid)
      break
    case 'hand':
      store.applyAction({ type: 'MOVE_TO_HAND', playerId: uid, cardId, fromZoneId: 'discard' })
      store.writeLog(`${who} a remis une carte en main depuis la défausse`, uid)
      break
    case 'banish':
      store.applyAction({ type: 'BANISH_CARD', playerId: uid, cardId, fromZoneId: 'discard' })
      store.writeLog(`${who} a banni une carte depuis la défausse`, uid)
      break
    case 'stack':
      store.applyAction({ type: 'MOVE_CARD', playerId: uid, cardId, fromZoneId: 'discard', toZoneId: 'stack' })
      store.writeLog(`${who} a mis une carte sur le stack depuis la défausse`, uid)
      break
  }
}

function onBanishTrayAction(cardId: string, action: ZoneTrayAction) {
  const uid = store.myUid ?? ''
  const who = store.actorName(uid)
  switch (action) {
    case 'top':
      store.sendToDeck(cardId, 'main_deck', 'top', false)
      store.writeLog(`${who} a remis une carte sur le dessus de son deck depuis les bannis`, uid)
      break
    case 'bottom':
      store.sendToDeck(cardId, 'main_deck', 'bottom', false)
      store.writeLog(`${who} a remis une carte sous son deck depuis les bannis`, uid)
      break
    case 'hand':
      store.applyAction({ type: 'MOVE_TO_HAND', playerId: uid, cardId, fromZoneId: 'banish' })
      store.writeLog(`${who} a remis une carte en main depuis les bannis`, uid)
      break
    case 'discard':
      store.applyAction({ type: 'DISCARD_CARD', playerId: uid, cardId, fromZoneId: 'banish' })
      store.writeLog(`${who} a défaussé une carte depuis les bannis`, uid)
      break
    case 'stack':
      store.applyAction({ type: 'MOVE_CARD', playerId: uid, cardId, fromZoneId: 'banish', toZoneId: 'stack' })
      store.writeLog(`${who} a mis une carte sur le stack depuis les bannis`, uid)
      break
  }
}

function isDiscardZone(key: string): boolean {
  const { owner, zone } = parseZoneKey(key)
  return !!owner && owner === store.myUid && zone === 'discard'
}

function isBanishZone(key: string): boolean {
  const { owner, zone } = parseZoneKey(key)
  return !!owner && owner === store.myUid && zone === 'banish'
}

function isOtherDiscardZone(key: string): boolean {
  const { owner, zone } = parseZoneKey(key)
  return !!owner && owner !== store.myUid && store.playerIds.includes(owner) && zone === 'discard'
}

function isOtherBanishZone(key: string): boolean {
  const { owner, zone } = parseZoneKey(key)
  return !!owner && owner !== store.myUid && store.playerIds.includes(owner) && zone === 'banish'
}

// ── Hand actions ───────────────────────────────────────────────────────────────
const handMenuVisible = ref(false)
const handMenuX = ref(0)
const handMenuY = ref(0)

function openHandMenu(e: MouseEvent) {
  handMenuX.value = e.clientX
  handMenuY.value = e.clientY
  handMenuVisible.value = true
}

function revealHand() {
  const uid = store.myUid
  if (!uid) return
  for (const card of allCards.value.filter(c => c.ownerId === uid && c.zoneId === 'hand')) {
    store.applyAction({ type: 'REVEAL_CARD', playerId: uid, cardId: card.cardId })
  }
}

function hideHand() {
  const uid = store.myUid
  if (!uid) return
  for (const card of allCards.value.filter(c => c.ownerId === uid && c.zoneId === 'hand')) {
    store.applyAction({ type: 'REVEAL_CARD_FOR_SELF', playerId: uid, cardId: card.cardId })
  }
}

function shuffleMyHand() {
  const uid = store.myUid
  if (!uid) return
  store.shuffleHand(uid)
}

// ── XP counters ───────────────────────────────────────────────────────────────
const XP_W = 72
const XP_H = 54

function xpCounterRect(playerId: string): Rect | null {
  const deckRect = zones.value[`${playerId}_main_deck`]
  const handRect = zones.value[`${playerId}_hand`]
  if (!deckRect || !handRect) return null
  const gapLeft = Math.min(deckRect.x + deckRect.w, handRect.x + handRect.w)
  const gapRight = Math.max(deckRect.x, handRect.x)
  if (gapRight - gapLeft < XP_W) return null
  const cx = (gapLeft + gapRight) / 2
  return { x: cx - XP_W / 2, y: deckRect.y + (deckRect.h - XP_H) / 2, w: XP_W, h: XP_H }
}

function xpOf(playerId: string): number {
  return store.currentRound?.players[playerId]?.xp ?? 0
}

function onXpChange(playerId: string, newXp: number) {
  store.setXp(playerId, newXp)
}

const BLEED = 8
function bleedRect(rect: Rect): Rect {
  let { x, y, w, h } = rect
  if (x < 50) { x -= BLEED; w += BLEED }
  if (x + w > vw.value - 50) { w += BLEED }
  if (y < 10) { y -= BLEED; h += BLEED }
  if (y + h > vh.value - 10) { h += BLEED }
  return { x, y, w, h }
}
</script>

<template>
  <div class="w-screen h-screen flex bg-[#0a1628]" :style="playmatVars">
    <PlaymatLayer :resolved="playmat" />
    <GameSidebarDual @clear-arrows="pingArrow.clearMyArrows()" />

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
              '--player-color': colorOfPlayerId(playerIdFromKey(String(key)) ?? ''),
            }"
          />
          <div
            v-if="zones[bfKey(String(key))]"
            class="player-battlefield"
            :style="{
              left:   zones[bfKey(String(key))].x + 'px',
              top:    zones[bfKey(String(key))].y + 'px',
              width:  zones[bfKey(String(key))].w + 'px',
              height: zones[bfKey(String(key))].h + 'px',
              '--player-color': colorOfPlayerId(playerIdFromKey(String(key)) ?? ''),
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

      <!-- Zone overlays (z:4) -->
      <div class="overlays-layer" style="z-index:4; pointer-events:none">
        <template v-for="(rect, key) in zones" :key="'ov-' + key">

          <div
            v-if="LABELED_ZONES.has(parseZoneKey(String(key)).zone) && rect.w > 0"
            class="zone-overlay"
            :style="{ left: rect.x + 'px', top: rect.y + 'px', width: rect.w + 'px', height: rect.h + 'px' }"
          >
            <span class="zone-name" :class="labelSide(String(key)) === 'top' ? 'zone-name--top' : 'zone-name--bottom'">
              {{ zoneLabel(String(key)) }}
            </span>
            <div
              v-if="!(key.endsWith('legend') || key.endsWith('champion') || key.endsWith('owner') || key.endsWith('opponent') || key.endsWith('base'))"
              class="zone-count"
              :class="labelSide(String(key)) === 'top' ? 'zone-count--top-right' : 'zone-count--bottom-left'"
            >
              <template v-if="parseZoneKey(String(key)).zone === 'runes' && runeStats[String(key)]">
                {{ runeStats[String(key)].total - runeStats[String(key)].exhausted }}/{{ runeStats[String(key)].total }}
              </template>
              <template v-else>
                {{ zoneCounts[String(key)] ?? 0 }}
              </template>
            </div>
          </div>

          <div
            v-if="isClickableZone(String(key)) && rect.w > 0"
            class="zone-overlay zone-click-overlay"
            style="pointer-events: auto"
            :style="{ left: rect.x + 'px', top: rect.y + 'px', width: rect.w + 'px', height: rect.h + 'px' }"
            @click="onZoneClick(String(key))"
            @contextmenu="isRunesDeckZone(String(key)) ? onRunesDeckContextMenu($event, String(key)) : onDeckContextMenu($event, String(key))"
          />

          <div
            v-if="parseZoneKey(String(key)).zone === 'stack' && stackCount > 0"
            class="zone-overlay"
            style="pointer-events: none"
            :style="{ left: rect.x + 'px', top: rect.y + 'px', width: rect.w + 'px', height: rect.h + 'px' }"
          >
            <button class="resolve-btn" style="pointer-events: auto" @click="resolveStack()">Résoudre</button>
          </div>

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

          <div
            v-if="isDiscardZone(String(key)) && rect.w > 0"
            class="zone-overlay zone-click-overlay"
            style="pointer-events: auto"
            :style="{ left: rect.x + 'px', top: rect.y + 'px', width: rect.w + 'px', height: rect.h + 'px' }"
            @click="discardTrayOpen = true"
          />

          <div
            v-if="isBanishZone(String(key)) && rect.w > 0"
            class="zone-overlay zone-click-overlay"
            style="pointer-events: auto"
            :style="{ left: rect.x + 'px', top: rect.y + 'px', width: rect.w + 'px', height: rect.h + 'px' }"
            @click="banishTrayOpen = true"
          />

          <div
            v-if="isOtherDiscardZone(String(key)) && rect.w > 0"
            class="zone-overlay zone-click-overlay"
            style="pointer-events: auto"
            :style="{ left: rect.x + 'px', top: rect.y + 'px', width: rect.w + 'px', height: rect.h + 'px' }"
            @click="openOtherTray(String(key), 'discard')"
          />

          <div
            v-if="isOtherBanishZone(String(key)) && rect.w > 0"
            class="zone-overlay zone-click-overlay"
            style="pointer-events: auto"
            :style="{ left: rect.x + 'px', top: rect.y + 'px', width: rect.w + 'px', height: rect.h + 'px' }"
            @click="openOtherTray(String(key), 'banish')"
          />

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

        <!-- Hand action trigger (my hand) -->
        <div
          v-if="zones[`${store.myUid}_hand`]"
          class="zone-overlay"
          style="pointer-events: none"
          :style="{
            left:   zones[`${store.myUid}_hand`].x + 'px',
            top:    zones[`${store.myUid}_hand`].y + 'px',
            width:  zones[`${store.myUid}_hand`].w + 'px',
            height: zones[`${store.myUid}_hand`].h + 'px',
          }"
        >
          <button class="hand-menu-trigger" style="pointer-events: auto" @click="openHandMenu">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="5" r="1.5" fill="currentColor"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/><circle cx="12" cy="19" r="1.5" fill="currentColor"/></svg>
            Main
          </button>
        </div>

      </div>

      <!-- XP counters -->
      <template v-for="pid in store.playerIds" :key="'xp-' + pid">
        <XpCounter
          v-if="xpCounterRect(pid)"
          :player-id="pid"
          :player-name="store.playerNames[pid]?.name ?? pid.slice(0, 6)"
          :xp="xpOf(pid)"
          :rect="xpCounterRect(pid)!"
          :can-edit="pid === store.myUid"
          style="z-index: 4"
          @change="onXpChange"
        />
      </template>

      <!-- Cards layer (z:3) -->
      <div class="cards-layer">
        <template v-for="card in allCards" :key="card.cardId">
          <CardView
            v-if="layouts.get(card.cardId)"
            :card="card"
            :layout="layouts.get(card.cardId)!"
            :current-player-id="store.myUid ?? ''"
            :disable-zoom="isBrushActive && (card.zoneId === 'battlefield_owner' || card.zoneId === 'battlefield_opponent')"
          />
        </template>
      </div>

      <!-- SVG arrows overlay (z:5) -->
      <svg class="arrows-layer" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <marker id="ah-local-2v2" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill="rgba(255,112,67,0.95)"/>
          </marker>
          <marker id="ah-remote-2v2" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill="rgba(239,83,80,0.95)"/>
          </marker>
        </defs>

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
            marker-end="url(#ah-local-2v2)"
            class="arrow-path"
          />
        </template>

        <template v-for="group in pingArrow.arrowGroups.value" :key="group.sourceCardId">
          <path
            v-for="targetId in group.targetCardIds"
            :key="group.sourceCardId + '-' + targetId"
            :d="arrowPath(group.sourceCardId, targetId)"
            stroke="rgba(239,83,80,0.9)"
            stroke-width="2.5"
            fill="none"
            stroke-linecap="round"
            marker-end="url(#ah-remote-2v2)"
            class="arrow-path arrow-path--solid"
          />
        </template>
      </svg>

      <!-- Hand context menu -->
      <HandContextMenu
        :visible="handMenuVisible"
        :x="handMenuX"
        :y="handMenuY"
        @close="handMenuVisible = false"
        @reveal-all="revealHand"
        @hide-self="hideHand"
        @shuffle="shuffleMyHand"
      />

      <!-- Ivern: clic sur le battlefield → Brush -->
      <template v-if="hasIvernLegend">
        <div
          v-for="pid in store.playerIds"
          :key="'ivern-bf-' + pid"
          v-show="zones[`${pid}_battlefield`]?.w > 0"
          class="battlefield-ivern-click"
          :style="{
            left:   (zones[`${pid}_battlefield`]?.x ?? 0) + 'px',
            top:    (zones[`${pid}_battlefield`]?.y ?? 0) + 'px',
            width:  (zones[`${pid}_battlefield`]?.w ?? 0) + 'px',
            height: (zones[`${pid}_battlefield`]?.h ?? 0) + 'px',
          }"
          @click="onBattlefieldCardClick(pid)"
        />
      </template>

      <!-- Brush tokens: clic droit → supprimer -->
      <template v-for="bt in brushTokens" :key="'brush-ctx-' + bt.cardId">
        <div
          v-if="layouts.get(bt.cardId)"
          class="brush-ctx-overlay"
          :style="{
            left:   layouts.get(bt.cardId)!.x + 'px',
            top:    layouts.get(bt.cardId)!.y + 'px',
            width:  layouts.get(bt.cardId)!.w + 'px',
            height: layouts.get(bt.cardId)!.h + 'px',
          }"
          @contextmenu.prevent="onBrushTokenContextMenu($event, bt.cardId)"
        />
      </template>
      <div
        v-if="brushDeleteMenuOpen"
        class="bf-context-menu"
        :style="{ left: brushDeleteMenuX + 'px', top: brushDeleteMenuY + 'px' }"
        @click.stop
      >
        <button @click="deleteBrushToken">Supprimer Brush</button>
      </div>
      <div v-if="brushDeleteMenuOpen" class="context-dismiss" @click="brushDeleteMenuOpen = false" @contextmenu.prevent="brushDeleteMenuOpen = false" />

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
        @draw-bottom="onDeckDrawBottom"
      />

      <!-- Runes deck context menu -->
      <RunesDeckContextMenu
        :visible="runesDeckMenuVisible"
        :x="runesDeckMenuX"
        :y="runesDeckMenuY"
        :deck-count="runesDeckMenuKey ? deckCount(runesDeckMenuKey) : 0"
        @close="runesDeckMenuVisible = false"
        @draw-runes="onRunesDeckDrawRunes"
      />

      <!-- Vision / Reveal tray -->
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

      <!-- Reveal banner -->
      <RevealBanner
        v-if="incomingRevealCards.length"
        :cards="incomingRevealCards"
        :revealer-name="incomingReveal ? store.actorName(incomingReveal.playerId) : ''"
        :anchor-x="revealAnchor.x"
        :anchor-y="revealAnchor.y"
        @done="dismissReveal"
      />

      <!-- Discard tray (mine) -->
      <ZoneTray
        :open="discardTrayOpen"
        :cards="discardTrayCards"
        :title="`Défausse — ${discardTrayCards.length} carte${discardTrayCards.length !== 1 ? 's' : ''}`"
        :actions="['hand', 'top', 'bottom', 'banish', 'stack']"
        @action="onDiscardTrayAction"
        @close="discardTrayOpen = false"
      />

      <!-- Banish tray (mine) -->
      <ZoneTray
        :open="banishTrayOpen"
        :cards="banishTrayCards"
        :title="`Bannis — ${banishTrayCards.length} carte${banishTrayCards.length !== 1 ? 's' : ''}`"
        :actions="['hand', 'top', 'bottom', 'discard', 'stack']"
        @action="onBanishTrayAction"
        @close="banishTrayOpen = false"
      />

      <!-- Other player's tray (read-only) -->
      <ZoneTray
        :open="otherTrayOpen"
        :cards="otherTrayCards"
        :title="otherTrayTitle"
        :actions="[]"
        @close="otherTrayOpen = false"
      />

      <!-- Keyword panel -->
      <KeywordPanel
        :open="keywordPanelOpen"
        @close="keywordPanelOpen = false"
        @start-targeting="onKeywordStartTargeting"
      />

      <!-- Token creation panel -->
      <TokenCreationPanel
        v-model:open="tokenPanelOpen"
        :x="tokenPanelX"
        :y="tokenPanelY"
        :target-zone="tokenPanelZone"
        @create="onTokenCreate"
      />

      <!-- Presence overlay -->
      <GamePresenceOverlay
        v-if="absentOpponent"
        :player-name="absentOpponent.name"
        :status="absentOpponent.status"
        @quit="handleOpponentQuit"
      />

      <!-- Arrow mode confirm -->
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
  border: 1px solid color-mix(in srgb, var(--player-color) 30%, transparent);
  background: color-mix(in srgb, var(--player-color) 3%, transparent);
  border-radius: 6px;
}

.player-battlefield {
  position: fixed;
  border: 1px dashed color-mix(in srgb, var(--player-color) 40%, transparent);
  background: color-mix(in srgb, var(--player-color) 6%, transparent);
  border-radius: 4px;
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

.zone-name {
  position: absolute;
  left: 0;
  right: 0;
  text-align: center;
  font-size: 9px;
  font-weight: 600;
  color: var(--playmat-zone-label, #6a8a90);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  white-space: nowrap;
  pointer-events: none;
  line-height: 1;
  user-select: none;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.6);
}

.zone-name--top    { top: 3px; }
.zone-name--bottom { bottom: 3px; }

.zone-count {
  position: absolute;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.25);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.8);
  pointer-events: none;
}

.zone-count--top-right   { top: 4px;    right: 4px; }
.zone-count--bottom-left { bottom: 4px; left: 4px; }

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

.battlefield-ivern-click {
  position: fixed;
  z-index: 10;
  cursor: pointer;
  border-radius: 4px;
}

.brush-ctx-overlay {
  position: fixed;
  z-index: 10;
  cursor: context-menu;
}

.bf-context-menu {
  position: fixed;
  z-index: 100;
  background: #1a2a3a;
  border: 1px solid #4a6a8a;
  border-radius: 6px;
  padding: 4px;
}

.bf-context-menu button {
  display: block;
  width: 100%;
  padding: 6px 12px;
  color: #e0e8f0;
  background: transparent;
  border: none;
  cursor: pointer;
  text-align: left;
  white-space: nowrap;
}

.bf-context-menu button:hover { background: #2a3a4a; }

.context-dismiss {
  position: fixed;
  z-index: 99;
  inset: 0;
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

.resolve-btn {
  position: absolute;
  bottom: 10px;
  left: 50%;
  transform: translateX(-50%);
  padding: 10px 20px;
  border: 1px solid rgba(200, 170, 110, 0.5);
  background: rgb(200 170 110 / 0.72);
  color: #ffffff;
  font-size: 0.7rem;
  font-weight: 900;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
  width: 80%;
}

.resolve-btn:hover {
  background: rgb(200 170 110 / 0.48);
  border-color: #C8AA6E;
  color: #F2E5CD;
}

.hand-menu-trigger {
  position: absolute;
  top: 0;
  right: 0;
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 0 10px;
  height: 22px;
  background: linear-gradient(160deg, #0d1c2e 0%, #060d1a 100%);
  border: 1px solid rgba(200, 170, 110, 0.22);
  border-radius: 0;
  color: rgba(200, 170, 110, 0.6);
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  font-family: inherit;
  cursor: pointer;
  user-select: none;
  white-space: nowrap;
  opacity: 0.7;
  transition: opacity 0.15s, background 0.15s, color 0.15s, border-color 0.15s;
}

.hand-menu-trigger:hover {
  opacity: 1;
  background: linear-gradient(160deg, #0f2236 0%, #081020 100%);
  color: #C8AA6E;
  border-color: rgba(200, 170, 110, 0.45);
}
</style>
