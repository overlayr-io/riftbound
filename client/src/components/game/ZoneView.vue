<script setup lang="ts">

import {Rect} from "@/types/card.type.ts";

interface ZoneViewProps {
  rect: Rect
}

defineProps<ZoneViewProps>()

</script>

<template>
  <div
      class="zone"
      :class="{}"
      :style="{
          left:   rect.x + 'px',
          top:    rect.y + 'px',
          width:  rect.w + 'px',
          height: rect.h + 'px',
        }">

  </div>
</template>

<style scoped>
.zone {
  position: fixed;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 6px;
  transition: border-color 0.15s, background 0.15s;
}
</style>