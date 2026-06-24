<script setup lang="ts">
import type { Rect } from '@/types/card.type'

defineProps<{
  rect: Rect
  dragState?: 'valid' | 'invalid' | 'dim' | null
  clickable?: boolean
  hint?: string | null
  noFrame?: boolean
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
    }"
  >
    <div v-if="!noFrame" class="zone-frame" />
    <div v-if="!noFrame" class="zone-bg" />
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
  border-radius: 2px;
  transition: opacity 0.15s;
}

/* Subtle fill */
.zone-bg {
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.025);
  transition: background 0.15s;
}

/* Gold corner brackets */
.zone-frame {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    linear-gradient(#C8AA6E, #C8AA6E) top    left  / 10px 1.5px no-repeat,
    linear-gradient(#C8AA6E, #C8AA6E) top    left  / 1.5px 10px no-repeat,
    linear-gradient(#C8AA6E, #C8AA6E) top    right / 10px 1.5px no-repeat,
    linear-gradient(#C8AA6E, #C8AA6E) top    right / 1.5px 10px no-repeat,
    linear-gradient(#C8AA6E, #C8AA6E) bottom left  / 10px 1.5px no-repeat,
    linear-gradient(#C8AA6E, #C8AA6E) bottom left  / 1.5px 10px no-repeat,
    linear-gradient(#C8AA6E, #C8AA6E) bottom right / 10px 1.5px no-repeat,
    linear-gradient(#C8AA6E, #C8AA6E) bottom right / 1.5px 10px no-repeat;
  opacity: 0.45;
  transition: opacity 0.15s;
}

.zone--drag-dim {
  opacity: 0.4;
}

.zone--drop-valid .zone-bg {
  background: rgba(100, 200, 255, 0.08);
}
.zone--drop-valid .zone-frame {
  background:
    linear-gradient(rgba(100,200,255,0.9), rgba(100,200,255,0.9)) top    left  / 10px 1.5px no-repeat,
    linear-gradient(rgba(100,200,255,0.9), rgba(100,200,255,0.9)) top    left  / 1.5px 10px no-repeat,
    linear-gradient(rgba(100,200,255,0.9), rgba(100,200,255,0.9)) top    right / 10px 1.5px no-repeat,
    linear-gradient(rgba(100,200,255,0.9), rgba(100,200,255,0.9)) top    right / 1.5px 10px no-repeat,
    linear-gradient(rgba(100,200,255,0.9), rgba(100,200,255,0.9)) bottom left  / 10px 1.5px no-repeat,
    linear-gradient(rgba(100,200,255,0.9), rgba(100,200,255,0.9)) bottom left  / 1.5px 10px no-repeat,
    linear-gradient(rgba(100,200,255,0.9), rgba(100,200,255,0.9)) bottom right / 10px 1.5px no-repeat,
    linear-gradient(rgba(100,200,255,0.9), rgba(100,200,255,0.9)) bottom right / 1.5px 10px no-repeat;
  opacity: 1;
}

.zone--drop-invalid .zone-bg {
  background: rgba(255, 70, 70, 0.08);
}
.zone--drop-invalid .zone-frame {
  background:
    linear-gradient(rgba(255,70,70,0.9), rgba(255,70,70,0.9)) top    left  / 10px 1.5px no-repeat,
    linear-gradient(rgba(255,70,70,0.9), rgba(255,70,70,0.9)) top    left  / 1.5px 10px no-repeat,
    linear-gradient(rgba(255,70,70,0.9), rgba(255,70,70,0.9)) top    right / 10px 1.5px no-repeat,
    linear-gradient(rgba(255,70,70,0.9), rgba(255,70,70,0.9)) top    right / 1.5px 10px no-repeat,
    linear-gradient(rgba(255,70,70,0.9), rgba(255,70,70,0.9)) bottom left  / 10px 1.5px no-repeat,
    linear-gradient(rgba(255,70,70,0.9), rgba(255,70,70,0.9)) bottom left  / 1.5px 10px no-repeat,
    linear-gradient(rgba(255,70,70,0.9), rgba(255,70,70,0.9)) bottom right / 10px 1.5px no-repeat,
    linear-gradient(rgba(255,70,70,0.9), rgba(255,70,70,0.9)) bottom right / 1.5px 10px no-repeat;
  opacity: 1;
}

.zone--clickable:hover .zone-bg {
  background: rgba(255, 255, 255, 0.04);
}
.zone--clickable:hover .zone-frame {
  opacity: 0.75;
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
  z-index: 2;
}

.drop-hint--valid   { color: rgba(100, 200, 255, 0.9); }
.drop-hint--invalid { color: rgba(255, 100, 100, 0.9); }
</style>
