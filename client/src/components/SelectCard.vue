<script setup lang="ts">
defineProps<{
  label: string
  description?: string
  active?: boolean
  disabled?: boolean
  badge?: string
}>()

defineEmits<{ select: [] }>()
</script>

<template>
  <button
    class="select-card"
    :class="{ 'select-card--active': active, 'select-card--disabled': disabled }"
    :disabled="disabled"
    @click="$emit('select')"
  >
    <span v-if="badge" class="select-card__badge">{{ badge }}</span>
    <span class="select-card__label">{{ label }}</span>
    <span v-if="description" class="select-card__desc">{{ description }}</span>
  </button>
</template>

<style scoped>
.select-card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.2rem;
  padding: 0.6rem 0.4rem;
  background: rgba(6, 15, 27, 0.8);
  border: 1px solid rgba(90, 110, 130, 0.2);
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}

.select-card:hover:not(:disabled) {
  border-color: rgba(200, 170, 110, 0.35);
}

.select-card--active {
  border-color: #C8AA6E;
  background: rgba(200, 170, 110, 0.08);
}

.select-card--disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.select-card__label {
  font-size: 0.7rem;
  font-weight: 900;
  letter-spacing: 0.15em;
  color: #F2E5CD;
}

.select-card--active .select-card__label {
  color: #C8AA6E;
}

.select-card__desc {
  font-size: 0.55rem;
  color: #4a6a70;
  letter-spacing: 0.05em;
}

.select-card__badge {
  position: absolute;
  top: 0.2rem;
  right: 0.3rem;
  font-size: 0.45rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  color: #C8AA6E;
  opacity: 0.7;
}
</style>
