<script setup lang="ts">
import { computed } from 'vue'
import type { ResolvedPlaymat } from '@/stores/playmat'

const props = defineProps<{ resolved: ResolvedPlaymat }>()

const fullStyle = computed(() => props.resolved.imageUrl
  ? { backgroundImage: `url(${props.resolved.imageUrl})` }
  : { background: props.resolved.backgroundCss ?? '#0a1628' })

// Moitié-moitié (1v1) : l'image du joueur courant couvre SA moitié (bas).
// La moitié adverse (haut) reste neutre tant que la diffusion temps réel du
// choix adverse n'est pas branchée (décision « mixte »).
const myHalfStyle = computed(() => props.resolved.imageUrl
  ? { backgroundImage: `url(${props.resolved.imageUrl})` }
  : { background: props.resolved.backgroundCss ?? '#0a1628' })
</script>

<template>
  <div class="playmat-root">
    <template v-if="resolved.halfMode">
      <div class="playmat-half playmat-half--opponent" />
      <div class="playmat-half playmat-half--me" :style="myHalfStyle" />
      <div class="playmat-seam" />
    </template>
    <div v-else class="playmat-full" :style="fullStyle" />
    <div class="playmat-scrim" />
  </div>
</template>

<style scoped>
.playmat-root {
  position: fixed;
  inset: 0;
  z-index: 0;            /* sous players-layer (z:1), zones (z:2), cartes */
  overflow: hidden;
  pointer-events: none;
}

.playmat-full,
.playmat-half {
  position: absolute;
  left: 0;
  width: 100%;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
}
.playmat-full { inset: 0; }

.playmat-half--opponent {
  top: 0;
  height: 50%;
  background: radial-gradient(ellipse 140% 90% at 50% 75%, #091629 0%, #030810 70%);
}
.playmat-half--me {
  bottom: 0;
  height: 50%;
}
.playmat-seam {
  position: absolute;
  left: 0; right: 0; top: 50%;
  height: 1px;
  transform: translateY(-0.5px);
  background: linear-gradient(90deg, transparent, rgba(200,170,110,0.35) 50%, transparent);
}

/* Voile sombre léger : garde les cartes lisibles sur images chargées. */
.playmat-scrim {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse 80% 70% at 50% 50%, transparent 35%, rgba(2,5,12,0.55) 100%);
}
</style>
