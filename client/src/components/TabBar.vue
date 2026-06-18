<script setup lang="ts">
interface Tab {
  id: string
  label: string
}

defineProps<{
  modelValue: string
  tabs: Tab[]
  disabled?: boolean
}>()

const emit = defineEmits<{ 'update:modelValue': [id: string] }>()
</script>

<template>
  <div class="tab-bar">
    <button
      v-for="tab in tabs"
      :key="tab.id"
      class="tab-bar__tab"
      :class="{ 'tab-bar__tab--active': modelValue === tab.id }"
      :disabled="disabled"
      @click="!disabled && emit('update:modelValue', tab.id)"
    >
      {{ tab.label }}
    </button>
  </div>
</template>

<style scoped>
.tab-bar {
  display: flex;
}

.tab-bar__tab {
  flex: 1;
  padding: 0.875rem 1rem;
  font-size: 0.6rem;
  font-weight: 700;
  letter-spacing: 0.2em;
  color: #4a6a70;
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s;
}

.tab-bar__tab:hover:not(:disabled) {
  color: #8aabb0;
}

.tab-bar__tab--active {
  color: #C8AA6E;
  border-bottom-color: #C8AA6E;
}

.tab-bar__tab:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
</style>
