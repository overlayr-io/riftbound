<script setup lang="ts">

import {Rect} from "@/types/card.type.ts";

interface ZoneViewProps {
  rect: Rect
  color?: string
}

const props = defineProps<ZoneViewProps>()

</script>

<template>
  <div
      class="zone"
      :style="{
          left:   rect.x + 'px',
          top:    rect.y + 'px',
          width:  rect.w + 'px',
          height: rect.h + 'px',
          ...(props.color ? {
            '--zone-border': `color-mix(in srgb, ${props.color} 35%, transparent)`,
            '--zone-bg':     `color-mix(in srgb, ${props.color} 6%, transparent)`,
          } : {}),
        }">

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
</style>
