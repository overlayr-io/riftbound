<script lang="ts" setup>

import CardView from "@/components/game/CardView.vue";
import {useGameStore} from "@/stores/game.ts";
import {useLayout, SEPARATOR} from "@/composables/useLayout.ts";
import {useViewport} from "@/composables/useViewport.ts";
import ZoneView from "@/components/game/ZoneView.vue";
import { useBoardShortcuts } from '@/composables/useBoardShortcuts'
import type {Rect} from "@/types/card.type.ts";

const store = useGameStore()

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
  key: 's',
  hint: 'Choisi la carte à mettre sur le stack',
  cardTarget: 'single',
  onSelect: (card) => { store.addToStack(card.cardId) },
})
const { playerIds } = store
const { zones, layouts, playersZone } = useLayout([])
const { width: vw, height: vh } = useViewport()

// ── Player colors (random, stable for the session) ────────────────────────
const PALETTE = ['#4fc3f7', '#ef5350', '#66bb6a', '#ffa726']
const shuffled = [...PALETTE].sort(() => Math.random() - 0.5)
const playerColors: Record<string, string> = Object.fromEntries(
  playerIds.map((id: string, i: number) => [id, shuffled[i % shuffled.length]])
)

// Extract player ID from any zone key (format: pid_zone or pid:zone)
function playerIdFromKey(key: string): string | null {
  for (const id of playerIds) {
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

// Extend player-zone rects slightly past screen edges so the outer border clips cleanly
const BLEED = 8
function bleedRect(rect: Rect): Rect {
  let { x, y, w, h } = rect
  if (x < 50)                    { x -= BLEED; w += BLEED }
  if (x + w > vw.value - 50)    { w += BLEED }
  if (y < 10)                    { y -= BLEED; h += BLEED }
  if (y + h > vh.value - 10)    { h += BLEED }
  return { x, y, w, h }
}

</script>

<template>
  <div class="w-screen h-screen flex bg-[#0a1628]">
    <div class="flex-1">

      <!-- Players zone -->
      <div class="players-layer">
        <template v-for="(rect, key) in playersZone" :key="key">

          <!-- Territory -->
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

          <!-- Battlefield (si présent) -->
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

      <!-- Zones -->
      <div class="zones-layer">
        <ZoneView
            v-for="(rect, key) in zones"
            :key="key"
            :id="String(key)"
            :rect="rect"
            :color="colorOfZoneKey(String(key))"
        />
      </div>

      <!-- Cards -->
      <div class="cards-layer">
        <template v-for="(card, i) in []" :key="i">
          <CardView
              v-if="layouts.get(card.id)"
              :card="card"
              :layout="layouts.get(card.id)!"
              :current-player-id="store.myUid ?? ''"
          />
        </template>
      </div>
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
</style>
