<script setup lang="ts">
import PlayerStatus from '@/components/PlayerStatus.vue'
</script>

<template>
  <div class="root">
    <div class="bg-grid" />
    <div class="bg-vignette" />

    <div class="corner corner--tl" />
    <div class="corner corner--tr" />
    <div class="corner corner--bl" />
    <div class="corner corner--br" />

    <div class="deco-line deco-line--top" />
    <div class="deco-line deco-line--bottom" />

    <PlayerStatus class="player-status" />

    <div class="content">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.root {
  position: relative;
  width: 100vw;
  height: 100vh;
  background: radial-gradient(ellipse 140% 90% at 50% 25%, #091629 0%, #030810 65%);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.bg-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(200, 170, 110, 0.025) 1px, transparent 1px),
    linear-gradient(90deg, rgba(200, 170, 110, 0.025) 1px, transparent 1px);
  background-size: 64px 64px;
  pointer-events: none;
}

.bg-vignette {
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse 80% 70% at 50% 50%, transparent 25%, rgba(2, 5, 12, 0.85) 100%);
  pointer-events: none;
}

.deco-line {
  position: absolute;
  left: 2rem;
  right: 2rem;
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(200, 170, 110, 0.4) 25%,
    rgba(200, 204, 185, 0.15) 50%,
    rgba(200, 170, 110, 0.4) 75%,
    transparent
  );
  pointer-events: none;
}
.deco-line--top    { top: 2rem; }
.deco-line--bottom { bottom: 2rem; }

.corner {
  position: absolute;
  width: 72px;
  height: 72px;
  pointer-events: none;
  opacity: 0.7;
}
.corner--tl { top: 2rem;    left: 2rem;    border-top: 1.5px solid #c8aa6e; border-left: 1.5px solid #c8aa6e; }
.corner--tr { top: 2rem;    right: 2rem;   border-top: 1.5px solid #c8aa6e; border-right: 1.5px solid #c8aa6e; }
.corner--bl { bottom: 2rem; left: 2rem;    border-bottom: 1.5px solid #c8aa6e; border-left: 1.5px solid #c8aa6e; }
.corner--br { bottom: 2rem; right: 2rem;   border-bottom: 1.5px solid #c8aa6e; border-right: 1.5px solid #c8aa6e; }

.player-status {
  position: absolute;
  top: 2.5rem;
  right: 2.5rem;
  z-index: 20;
}

.content {
  position: relative;
  z-index: 10;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
