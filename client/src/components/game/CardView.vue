<script setup lang="ts">

</script>

<template>
<div
    class="card"
>
  card view
</div>
</template>

<style scoped>
.card {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: auto;
  cursor: grab;
  touch-action: none;
  will-change: transform;
  transform-origin: 50% 50%;
  perspective: 800px;
  transition: transform 0.3s var(--ease);
}
</style>