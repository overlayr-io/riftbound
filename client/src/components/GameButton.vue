<script setup lang="ts">
defineProps<{
  variant?: 'primary' | 'secondary'
  disabled?: boolean
  comingSoon?: boolean
}>()

defineEmits<{
  click: []
}>()
</script>

<template>
  <button
    class="game-btn"
    :class="[`game-btn--${variant ?? 'primary'}`, { 'game-btn--disabled': disabled || comingSoon }]"
    :disabled="disabled || comingSoon"
    @click="$emit('click')"
  >
    <span class="game-btn__bg" />
    <span class="game-btn__content">
      <slot />
      <span v-if="comingSoon" class="game-btn__soon">BIENTÔT</span>
    </span>
    <span class="game-btn__glow" />
  </button>
</template>

<style scoped>
.game-btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  background: none;
  border: none;
  cursor: pointer;
  outline: none;
  width: 100%;
  max-width: 24rem;
}
.game-btn--disabled {
  cursor: default;
  opacity: 0.6;
}

/* bg layer */
.game-btn__bg {
  position: absolute;
  inset: 0;
  transition: filter 0.2s, box-shadow 0.2s;
}
.game-btn--primary .game-btn__bg {
  background: linear-gradient(180deg, #1a2e48 0%, #060f1b 100%);
  border: 1.5px solid #c8aa6e;
  box-shadow: inset 0 0 24px rgba(200, 170, 110, 0.1);
}
.game-btn--secondary .game-btn__bg {
  background: linear-gradient(180deg, #0d1e2e 0%, #060f1b 100%);
  border: 1.5px solid rgba(200, 170, 110, 0.35);
  box-shadow: inset 0 0 16px rgba(200, 170, 110, 0.05);
}
.game-btn:not(.game-btn--disabled):hover .game-btn__bg {
  filter: brightness(1.2);
  box-shadow: inset 0 0 24px rgba(200, 170, 110, 0.15), 0 0 32px rgba(200, 170, 110, 0.15);
}
.game-btn:not(.game-btn--disabled):active .game-btn__bg {
  filter: brightness(0.9);
}

/* content */
.game-btn__content {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 1rem 3rem;
  font-weight: 900;
  letter-spacing: 0.3em;
  transition: color 0.2s;
  white-space: nowrap;
}
.game-btn--primary .game-btn__content {
  font-size: 1.5rem;
  padding: 1.1rem 3.5rem;
  letter-spacing: 0.35em;
  color: #f2e5cd;
}
.game-btn--secondary .game-btn__content {
  font-size: 1rem;
  color: #8aabb0;
}
.game-btn:not(.game-btn--disabled):hover .game-btn--primary.game-btn__content,
.game-btn--primary:not(.game-btn--disabled):hover .game-btn__content {
  color: #ffffff;
}
.game-btn--secondary:not(.game-btn--disabled):hover .game-btn__content {
  color: #c8aa6e;
}

/* coming soon badge */
.game-btn__soon {
  font-size: 0.55rem;
  letter-spacing: 0.2em;
  color: #c8aa6e;
  opacity: 0.75;
  border: 1px solid rgba(200, 170, 110, 0.4);
  padding: 0.15rem 0.45rem;
}

/* glow */
.game-btn__glow {
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse at 50% 120%, rgba(200, 170, 110, 0.12) 0%, transparent 65%);
  pointer-events: none;
}

.game-btn:not(.game-btn--disabled):active {
  transform: scale(0.97);
}
</style>
