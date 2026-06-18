<script setup lang="ts">
defineProps<{
  variant?: 'primary' | 'locked' | 'ready' | 'disabled'
  disabled?: boolean
}>()

defineEmits<{ click: [] }>()
</script>

<template>
  <button
    class="action-btn"
    :class="`action-btn--${variant ?? 'primary'}`"
    :disabled="disabled || variant === 'disabled' || variant === 'locked'"
    @click="$emit('click')"
  >
    <slot />
  </button>
</template>

<style scoped>
.action-btn {
  width: 100%;
  padding: 0.75rem 1rem;
  font-size: 0.7rem;
  font-weight: 900;
  letter-spacing: 0.2em;
  border: 1px solid;
  cursor: pointer;
  transition: all 0.15s;
  flex-shrink: 0;
}

.action-btn--primary {
  background: rgba(200, 170, 110, 0.08);
  border-color: rgba(200, 170, 110, 0.5);
  color: #C8AA6E;
}

.action-btn--primary:hover:not(:disabled) {
  background: rgba(200, 170, 110, 0.15);
  border-color: #C8AA6E;
  color: #F2E5CD;
}

.action-btn--locked {
  background: rgba(0, 204, 185, 0.05);
  border-color: rgba(0, 204, 185, 0.3);
  color: #00CCB9;
  cursor: default;
  opacity: 0.7;
}

.action-btn--ready {
  background: rgba(0, 204, 185, 0.06);
  border-color: rgba(0, 204, 185, 0.35);
  color: #00CCB9;
}

.action-btn--ready:hover:not(:disabled) {
  background: rgba(220, 60, 60, 0.08);
  border-color: rgba(220, 80, 80, 0.4);
  color: #e06060;
}

.action-btn--disabled {
  background: rgba(40, 60, 80, 0.2);
  border-color: rgba(90, 110, 130, 0.2);
  color: #4a6a70;
  cursor: not-allowed;
}
</style>
