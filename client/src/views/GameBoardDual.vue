<script lang="ts" setup>

import GameSidebarDual from "@/components/game/GameSidebarDual.vue";
import CardView from "@/components/game/CardView.vue";
import {useGameStore} from "@/stores/game.ts";
import {useLayout} from "@/composables/useLayout.ts";
import ZoneView from "@/components/game/ZoneView.vue";


// get cards from game store
const { } = useGameStore()
const { zones, layouts, playersZone } = useLayout([])

</script>

<template>
  <div class="w-screen h-screen flex bg-[#0a1628]">
    <GameSidebarDual/>

    <div class="flex-1">

      <!-- Players zone     -->
      <div class="players-layer">
        <div
            v-for="key in Object.keys(playersZone)"
            :key="key"
            class="player-zone"
            :style="{
          left:   playersZone[key].x + 'px',
          top:    playersZone[key].y + 'px',
          width:  playersZone[key].w + 'px',
          height: playersZone[key].h + 'px',
        }"
        />
      </div>

      <!-- Zones zone     -->
      <div class="zones-layer" style="z-index:2">
        <ZoneView
            v-for="key in Object.keys(zones)"
            :key="key"
            :rect="zones[key]"
        />
      </div>

      <!-- Cards zone     -->
      <div class="cards-layer" style="z-index:3">
        <template v-for="(card, i) in []" :key="i">
          <CardView
              v-if="layouts.get(card.id)"
              :card="card"
              :layout="layouts.get(card.id)!"
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
