<script setup lang="ts">
import type { Rect } from '@/types/card.type'

defineProps<{
  rect: Rect
  color?: string
  dragState?: 'valid' | 'invalid' | 'dim' | null
  clickable?: boolean
  hint?: string | null
}>()
</script>

<template>
  <div
    class="zone"
    :class="{
      'zone--drop-valid':   dragState === 'valid',
      'zone--drop-invalid': dragState === 'invalid',
      'zone--drag-dim':     dragState === 'dim',
      'zone--clickable':    clickable,
    }"
    :style="{
      left:   rect.x + 'px',
      top:    rect.y + 'px',
      width:  rect.w + 'px',
      height: rect.h + 'px',
      ...(color ? {
        '--zone-border': `color-mix(in srgb, ${color} 35%, transparent)`,
        '--zone-bg':     `color-mix(in srgb, ${color} 6%, transparent)`,
      } : {}),
    }"
  >
    <div
      v-if="hint"
      class="drop-hint"
      :class="dragState === 'valid' ? 'drop-hint--valid' : 'drop-hint--invalid'"
    >
      {{ hint }}
    </div>
  </div>
</template>

<style scoped>
.zone {
  position: fixed;
  border: 1px solid var(--zone-border, rgba(255, 255, 255, 0.12));
  background: var(--zone-bg, transparent);
  border-radius: 6px;
  transition: border-color 0.15s, background 0.15s;
}

.zone--drag-dim {
  border-color: rgba(255, 255, 255, 0.05);
  opacity: 0.6;
}

.zone--drop-valid {
  border-color: rgba(100, 200, 255, 0.8) !important;
  background: rgba(100, 200, 255, 0.08) !important;
  box-shadow: inset 0 0 0 1px rgba(100, 200, 255, 0.3);
}

.zone--drop-invalid {
  border-color: rgba(255, 70, 70, 0.8) !important;
  background: rgba(255, 70, 70, 0.08) !important;
  box-shadow: inset 0 0 0 1px rgba(255, 70, 70, 0.3);
}

.zone--clickable {
  cursor: pointer;
}

.zone--clickable:hover {
  border-color: rgba(255, 255, 255, 0.35);
  background: rgba(255, 255, 255, 0.04);
}

.drop-hint {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  pointer-events: none;
}

.drop-hint--valid   { color: rgba(100, 200, 255, 0.9); }
.drop-hint--invalid { color: rgba(255, 100, 100, 0.9); }
</style>
