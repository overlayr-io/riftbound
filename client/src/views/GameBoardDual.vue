<script lang="ts" setup>

import GameSidebarDual from "@/components/game/GameSidebarDual.vue";
import CardView from "@/components/game/CardView.vue";
import {useGameStore} from "@/stores/game.ts";
import {useLayout, SEPARATOR} from "@/composables/useLayout.ts";
import {useViewport} from "@/composables/useViewport.ts";
import ZoneView from "@/components/game/ZoneView.vue";
import type {Rect} from "@/types/card.type.ts";
import {computed, onMounted, ref} from "vue";
import type {Card, CardState, DeckList, ZoneId} from "@riftbound/shared";
import {DeckParser} from "@/utils/deckParser.ts";

const store = useGameStore()
const { width: vw, height: vh } = useViewport()

// ── Dev mode: import default deck on mount ────────────────────────────────────

const DEV_DECK = "Legend:\n1 Kha'Zix, Voidreaver\n\nChampion:\n1 Kha'Zix, Evolving Hunter\n\nMainDeck:\n3 Grim Resolve\n3 Irresistible Faefolk\n3 Void Assault\n\nBattlefields:\n1 Monastery of Hirana\n1 The Arena's Greatest\n1 Star Spring\n\nRunes:\n7 Body Rune\n5 Chaos Rune"

const devCards = ref<readonly CardState[]>([])

function deckToCardStates(deck: DeckList, ownerId: string): CardState[] {
  const cards: CardState[] = []
  let order = 0

  function fromCard(c: Card, zoneId: ZoneId): CardState {
    return {
      cardId: c.id,
      baseCardId: c.baseCardId,
      description: { name: c.name, type: c.type, imageUrl: c.imageUrl },
      ownerId,
      controllerId: ownerId,
      zoneId,
      order: order++,
      state: { exhausted: false, counters: null, damages: null, buffs: null, visibleTo: 'ALL', groupTo: [] },
      isToken: false,
    }
  }

  if (deck.legend)   cards.push(fromCard(deck.legend,   'legend'))
  if (deck.champion) cards.push(fromCard(deck.champion, 'champion'))
  for (const c of deck.mainDeck) cards.push(fromCard(c, 'main_deck'))
  for (const c of deck.runes)    cards.push(fromCard(c, 'runes_deck'))
  for (const c of deck.battlefields) cards.push(fromCard(c, 'banish'))

  return cards
}

if (import.meta.env.DEV) {
  onMounted(async () => {
    if (Object.keys(store.currentRound?.cards ?? {}).length > 0) return
    const deck = await new DeckParser().parse(DEV_DECK)
    devCards.value = deckToCardStates(deck, store.myUid ?? 'dev_local')
  })
}

// ── Cards ─────────────────────────────────────────────────────────────────────

const allCards = computed<readonly CardState[]>(() => {
  const storeCards = Object.values(store.currentRound?.cards ?? {})
  if (storeCards.length > 0) return storeCards
  if (import.meta.env.DEV) return devCards.value
  return []
})

const { zones, layouts, playersZone } = useLayout(allCards)

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
    <GameSidebarDual/>

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

          <!-- Battlefield -->
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
        <template v-for="card in allCards" :key="card.cardId">
          <CardView
              v-if="layouts.get(card.cardId)"
              :card="card"
              :layout="layouts.get(card.cardId)!"
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
