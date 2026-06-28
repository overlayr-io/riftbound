<script setup lang="ts">
import { computed, ref } from 'vue'
import { KEYWORDS } from '@/config/keywords'

defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  close: []
  apply: [keywords: string[], cardId?: string]
  startTargeting: [keywords: string[]]
}>()

const selected = ref<Set<string>>(new Set())

const groupedKeywords = computed(() => {
  const groups = new Map<string, typeof KEYWORDS>()

  for (const keyword of KEYWORDS) {
    if (!groups.has(keyword.color)) {
      groups.set(keyword.color, [])
    }

    groups.get(keyword.color)!.push(keyword)
  }

  return [...groups.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([color, keywords]) => ({
        color,
        keywords: [...keywords].sort((a, b) => a.name.localeCompare(b.name))
      }))
})

function toggle(name: string) {
  if (selected.value.has(name)) {
    selected.value.delete(name)
  } else {
    selected.value.add(name)
  }

  selected.value = new Set(selected.value)
}

function onStartTargeting() {
  if (selected.value.size === 0) return

  emit('startTargeting', [...selected.value])
  selected.value = new Set()
}

function onOverlay(e: MouseEvent) {
  if (e.target === e.currentTarget) emit('close')
}
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="kw-overlay" @mousedown="onOverlay">
      <div class="kw-panel">
        <div class="kw-header">
          <span class="kw-title">KEYWORDS</span>
          <button class="kw-close" @click="emit('close')">✕</button>
        </div>

        <div class="kw-content">
          <div
              v-for="group in groupedKeywords"
              :key="group.color"
              class="kw-group"
          >
            <div
                class="kw-group-divider"
                :style="{ '--group-color': group.color }"
            />

            <div class="kw-grid">
              <button
                  v-for="kw in group.keywords"
                  :key="kw.name"
                  class="kw-badge"
                  :class="{ 'kw-badge--active': selected.has(kw.name) }"
                  :style="{ '--kw-color': kw.color }"
                  @click.stop="toggle(kw.name)"
              >
                {{ kw.name }}
              </button>
            </div>
          </div>
        </div>

        <div class="kw-footer">
          <button
              class="kw-btn kw-btn--apply"
              :disabled="selected.size === 0"
              @click="onStartTargeting"
          >
            Cibler une carte
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.kw-overlay {
  position: fixed;
  inset: 0;
  z-index: 9050;
}

.kw-panel {
  position: absolute;
  top: 40px;
  left: 45%;
  transform: translateX(-50%);
  width: 320px;
  background: linear-gradient(160deg, #0d1c2e 0%, #060d1a 100%);
  border: 1px solid rgba(200, 170, 110, 0.28);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.75);
  user-select: none;
}

.kw-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-bottom: 1px solid rgba(200, 170, 110, 0.15);
}

.kw-title {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.1em;
  color: #C8AA6E;
}

.kw-close {
  background: none;
  border: none;
  color: rgba(200, 170, 110, 0.5);
  cursor: pointer;
  font-size: 12px;
  line-height: 1;
  padding: 2px 4px;
  transition: color 0.15s;
}

.kw-close:hover {
  color: #C8AA6E;
}

.kw-content {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.kw-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.kw-group-divider {
  height: 2px;
  border-radius: 999px;
  background: var(--group-color);
  opacity: 0.8;
}

.kw-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.kw-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 4px 10px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.06em;
  color: rgba(255, 255, 255, 0.65);
  background: var(--kw-color);
  border: 1px solid color-mix(in srgb, var(--kw-color) 40%, transparent);
  cursor: pointer;
  transition: all 0.15s;
  clip-path: polygon(6px 0%, 100% 0%, calc(100% - 6px) 100%, 0% 100%);
}

.kw-badge:hover {
  color: #fff;
  background: color-mix(in srgb, var(--kw-color) 20%, transparent);
  border-color: color-mix(in srgb, var(--kw-color) 70%, transparent);
}

.kw-badge--active {
  color: #fff;
  background: color-mix(in srgb, var(--kw-color) 45%, rgba(0, 0, 0, 0.3));
  border-color: var(--kw-color);
  box-shadow: 0 0 8px color-mix(in srgb, var(--kw-color) 50%, transparent);
}

.kw-footer {
  padding: 8px 12px 10px;
  border-top: 1px solid rgba(200, 170, 110, 0.12);
}

.kw-btn {
  width: 100%;
  padding: 7px 0;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.05em;
  cursor: pointer;
  border: none;
  transition: background 0.15s, color 0.15s;
}

.kw-btn--apply {
  background: rgba(200, 170, 110, 0.18);
  color: #C8AA6E;
  border: 1px solid rgba(200, 170, 110, 0.3);
}

.kw-btn--apply:hover:not(:disabled) {
  background: rgba(200, 170, 110, 0.28);
  color: #F2E5CD;
}

.kw-btn--apply:disabled {
  opacity: 0.35;
  cursor: default;
}
</style>