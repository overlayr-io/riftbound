<template>
  <div class="root">
    <div class="bg-grid" />
    <div class="bg-vignette" />

    <div class="content">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.root {
  position: relative;
  width: 100vw;
  height: 100vh;
  background: radial-gradient(ellipse 140% 90% at 50% 25%, #091629 0%, #030810 65%);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.bg-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(200, 170, 110, 0.025) 1px, transparent 1px),
    linear-gradient(90deg, rgba(200, 170, 110, 0.025) 1px, transparent 1px);
  background-size: 64px 64px;
  pointer-events: none;
}

.bg-vignette {
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse 80% 70% at 50% 50%, transparent 25%, rgba(2, 5, 12, 0.85) 100%);
  pointer-events: none;
}

.content {
  position: relative;
  z-index: 10;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
