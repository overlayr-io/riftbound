<script setup lang="ts">

import {useViewport} from "@/composables/useViewport.ts";

const { SIDEBAR_WIDTH } = useViewport()

</script>

<template>
<div class="sidebar" :style="{ width: `${SIDEBAR_WIDTH}px` }">
  sidebar
</div>
</template>

<style scoped>

.sidebar {
  @apply flex flex-col items-center z-50 shrink-0;
  background: linear-gradient(180deg, #060f1b 0%, #040a14 100%);
  border-right: 1px solid rgba(200, 170, 110, 0.1);
  padding: 0.5rem 0;
  gap: 0.25rem;
  transition: border-right-color 0.4s ease, box-shadow 0.4s ease;
}
</style>