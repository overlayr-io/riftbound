<script lang="ts" setup>

import { ref, provide } from 'vue'
import CardView from "@/components/game/CardView.vue";
import {useGameStore} from "@/stores/game.ts";
import {useLayout, SEPARATOR} from "@/composables/useLayout.ts";
import {useViewport} from "@/composables/useViewport.ts";
import ZoneView from "@/components/game/ZoneView.vue";
import PlaymatLayer from "@/components/game/PlaymatLayer.vue"
import XpCounter from "@/components/game/XpCounter.vue";
import { useBoardShortcuts } from '@/composables/useBoardShortcuts'
import { usePlaymat } from '@/composables/usePlaymat'
import { KEYWORD_TARGET_KEY } from '@/composables/useDrag'
import KeywordPanel from '@/components/game/KeywordPanel.vue'
import type {Rect} from "@/types/card.type.ts";
import type { CardState } from '@riftbound/shared';

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

shortcuts.define({
  key: 'k',
  hint: 'Keywords',
  onInstant: () => { keywordPanelOpen.value = true },
})

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

const { playerIds } = store
const { zones, layouts, playersZone } = useLayout([])
const { resolved: playmat, vars: playmatVars } = usePlaymat('ffa')
const { width: vw, height: vh } = useViewport()

// ── Player colors (random, stable for the session) ────────────────────────
const PALETTE = ['#4fc3f7', '#ef5350', '#66bb6a', '#ffa726']
const shuffled = [...PALETTE].sort(() => Math.random() - 0.5)
const playerColors: Record<string, string> = Object.fromEntries(
  playerIds.map((id: string, i: number) => [id, shuffled[i % shuffled.length]])
)

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

function colorOf(zoneKey: string): string {
  return playerColors[playerIdFromKey(zoneKey) ?? ''] ?? '#ffffff'
}

function bfKey(zoneKey: string): string {
  const pid = playerIdFromKey(zoneKey) ?? zoneKey.split(SEPARATOR)[0]
  return pid + SEPARATOR + 'battlefield'
}

const XP_W = 72
const XP_H = 54

function xpCounterRect(pid: string) {
  const deckRect = zones.value[`${pid}_main_deck`]
  const handRect = zones.value[`${pid}_hand`]
  if (!deckRect || !handRect) return null
  const cx = (deckRect.x + deckRect.w + handRect.x) / 2
  return { x: cx - XP_W / 2, y: deckRect.y + (deckRect.h - XP_H) / 2, w: XP_W, h: XP_H }
}

function xpOf(pid: string): number {
  return store.currentRound?.players[pid]?.xp ?? 0
}

function onXpChange(pid: string, newXp: number) {
  store.setXp(pid, newXp)
}

const BLEED = 8
function bleedRect(rect: Rect): Rect {
  let { x, y, w, h } = rect
  if (x < 50)                 { x -= BLEED; w += BLEED }
  if (x + w > vw.value - 50) { w += BLEED }
  if (y < 10)                 { y -= BLEED; h += BLEED }
  if (y + h > vh.value - 10) { h += BLEED }
  return { x, y, w, h }
}

</script>

<template>
  <div class="w-screen h-screen flex bg-[#0a1628]" :style="playmatVars">
    <PlaymatLayer :resolved="playmat" />
    <div class="flex-1">

      <!-- Players zone -->
      <div class="players-layer">
        <template v-for="(rect, key) in playersZone" :key="key">

          <!-- Side / territory -->
          <div
              class="player-zone"
              :style="{
                left:   bleedRect(rect).x + 'px',
                top:    bleedRect(rect).y + 'px',
                width:  bleedRect(rect).w + 'px',
                height: bleedRect(rect).h + 'px',
                '--player-color': colorOf(String(key)),
              }"
          />

          <!-- Battlefield (si présent pour ce joueur) -->
          <div
              v-if="zones[bfKey(String(key))]"
              class="player-battlefield"
              :style="{
                left:   zones[bfKey(String(key))].x + 'px',
                top:    zones[bfKey(String(key))].y + 'px',
                width:  zones[bfKey(String(key))].w + 'px',
                height: zones[bfKey(String(key))].h + 'px',
                '--player-color': colorOf(String(key)),
              }"
          />
        </template>
      </div>

      <!-- XP counters -->
      <template v-for="pid in playerIds" :key="'xp-' + pid">
        <XpCounter
          v-if="xpCounterRect(pid)"
          :player-id="pid"
          :player-name="store.playerNames?.[pid]?.name ?? pid.slice(0, 6)"
          :xp="xpOf(pid)"
          :rect="xpCounterRect(pid)!"
          :can-edit="pid === store.myUid"
          style="z-index: 4"
          @change="onXpChange"
        />
      </template>

      <!-- Zones -->
      <div class="zones-layer" style="z-index:2">
        <ZoneView
            v-for="(rect, key) in zones"
            :key="key"
            :id="String(key)"
            :rect="rect"
            :color="colorOfZoneKey(String(key))"
        />
      </div>

      <!-- Cards -->
      <div class="cards-layer" style="z-index:3">
        <template v-for="(card, i) in ([] as CardState[])" :key="i">
          <CardView
              v-if="layouts.get(card.cardId)"
              :card="card"
              :layout="layouts.get(card.cardId)!"
              :current-player-id="store.myUid ?? ''"
          />
        </template>
      </div>
    </div>
    <KeywordPanel
      :open="keywordPanelOpen"
      @close="keywordPanelOpen = false"
      @start-targeting="onKeywordStartTargeting"
    />
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
  border: 1px solid color-mix(in srgb, var(--player-color) 35%, transparent);
  background: color-mix(in srgb, var(--player-color) 4%, transparent);
  border-radius: 6px;
}

.player-battlefield {
  position: fixed;
  border: 1px dashed color-mix(in srgb, var(--player-color) 45%, transparent);
  background: color-mix(in srgb, var(--player-color) 7%, transparent);
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
