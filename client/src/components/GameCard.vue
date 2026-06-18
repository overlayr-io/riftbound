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
