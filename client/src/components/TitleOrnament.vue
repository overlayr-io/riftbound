<template>
  <div class="title-ornament">
    <span class="ornament-line" />
    <span class="ornament-diamond">◆</span>
    <span class="ornament-line ornament-line--right" />
  </div>
</template>

<style scoped>
.title-ornament {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  max-width: 28rem;
}
.ornament-line {
  flex: 1;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(200, 170, 110, 0.45));
}
.ornament-line--right {
  background: linear-gradient(90deg, rgba(200, 170, 110, 0.45), transparent);
}
.ornament-diamond {
  color: #c8aa6e;
  font-size: 0.5rem;
  opacity: 0.7;
}
</style>
