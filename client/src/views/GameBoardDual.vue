<script lang="ts" setup>
import { computed, provide, onMounted, onUnmounted } from 'vue'
import GameSidebarDual from '@/components/game/GameSidebarDual.vue'
import CardView from '@/components/game/CardView.vue'
import ZoneView from '@/components/game/ZoneView.vue'
import { useGameStore } from '@/stores/game'
import { useLayout, SEPARATOR } from '@/composables/useLayout'
import { useViewport } from '@/composables/useViewport'
import { useDrag, DRAG_KEY, GAME_ACTIONS_KEY } from '@/composables/useDrag'
import { useBoardShortcuts } from '@/composables/useBoardShortcuts'
import { useGamePingArrow, PING_ARROW_KEY } from '@/composables/useGamePingArrow'
import type { Rect } from '@/types/card.type'
import type { CardState, GameAction, ZoneId } from '@riftbound/shared'

const store = useGameStore()
const { width: vw, height: vh } = useViewport()

// ── Ping & Arrows ─────────────────────────────────────────────────────────────

const pingArrow = useGamePingArrow(
  () => store.gameId,
  () => store.myUid,
)
provide(PING_ARROW_KEY, pingArrow)

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

function onKeyDown(e: KeyboardEvent) {
  if (e.key === 'Enter' && pingArrow.isArrowMode.value) {
    e.preventDefault()
    pingArrow.confirmArrows()
  }
}

onMounted(() => window.addEventListener('keydown', onKeyDown))
onUnmounted(() => window.removeEventListener('keydown', onKeyDown))

// ── Keyboard shortcuts ────────────────────────────────────────────────────────

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

function isClickableZone(key: string): boolean {
  if (isDragging.value) return false
  const { owner, zone } = parseZoneKey(key)
  return !!owner && owner === store.myUid && zone in ZONE_CLICK_ACTION
}

// ── Zone labels & counts ───────────────────────────────────────────────────────

const ZONE_DISPLAY: Record<string, string> = {
  hand: 'Main', main_deck: 'Deck', discard: 'Défausse', banish: 'Exil',
  runes_deck: 'Runes', legend: 'Légende', champion: 'Champion',
  base: 'Base', runes: 'Runes', battlefield: 'Champ de bataille', stack: 'Stack',
}

const LABELED_ZONES = new Set(['runes_deck', 'legend', 'champion', 'main_deck', 'discard', 'banish', 'battlefield_owner', 'battlefield_opponent'])

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

function labelSide(key: string): 'top' | 'bottom' {
  const { owner } = parseZoneKey(key)
  return owner === store.myUid ? 'top' : 'bottom'
}

const zoneCounts = computed(() => {
  const out: Record<string, number> = {}
  for (const card of allCards.value) {
    const key = `${card.ownerId}_${card.zoneId}`
    out[key] = (out[key] ?? 0) + 1
  }
  return out
})

const stackCount = computed(() => allCards.value.filter(c => c.zoneId === 'stack').length)

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
          :color="colorOfZoneKey(String(key))"
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
              {{ zoneCounts[String(key)] ?? 0 }}
            </div>
          </div>

          <!-- Click overlay for drawable zones (above cards) -->
          <div
            v-if="isClickableZone(String(key)) && rect.w > 0"
            class="zone-overlay zone-click-overlay"
            style="pointer-events: auto"
            :style="{ left: rect.x + 'px', top: rect.y + 'px', width: rect.w + 'px', height: rect.h + 'px' }"
            @click="onZoneClick(String(key))"
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

/* Zone labels */
.zone-name {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  font-size: 9px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.45);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  white-space: nowrap;
  pointer-events: none;
}

.zone-name--top    { top: 5px; }
.zone-name--bottom { bottom: 5px; }

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
