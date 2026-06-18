<template>
  <div class="game-card">
    <div v-if="$slots.header" class="game-card__header">
      <slot name="header" />
    </div>
    <div class="game-card__body">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.game-card {
  background: #060f1b;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 0;
  position: relative;
}

.game-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent 0%, #C8AA6E 50%, transparent 100%);
  opacity: 0.7;
  pointer-events: none;
  z-index: 1;
}

.game-card__header {
  border-bottom: 1px solid rgba(200, 170, 110, 0.12);
  flex-shrink: 0;
}

.game-card__body {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 0;
}
</style>
