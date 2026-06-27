<template>
  <Teleport to="body">
    <Transition name="turn-fade">
      <div v-if="visible" class="turn-overlay">
        <span class="turn-text" :class="isMyTurnText ? 'my-turn' : 'opp-turn'">
          {{ text }}
        </span>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  visible: boolean
  text: string
}>()

const isMyTurnText = computed(() => props.text === 'VOTRE TOUR')
</script>

<style scoped>
.turn-overlay {
  position: fixed;
  inset: 0;
  z-index: 9500;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.55);
  pointer-events: none;
}

.turn-text {
  font-size: 3.75rem;
  font-weight: 900;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  font-family: inherit;
}

.turn-text.my-turn {
  color: #F2E5CD;
  text-shadow:
    0 0 20px rgba(242, 229, 205, 0.8),
    0 0 40px rgba(200, 170, 110, 0.6),
    0 2px 8px rgba(0, 0, 0, 0.8);
}

.turn-text.opp-turn {
  color: #C8AA6E;
  text-shadow:
    0 0 16px rgba(200, 170, 110, 0.5),
    0 2px 8px rgba(0, 0, 0, 0.8);
}

.turn-fade-enter-active {
  transition: opacity 0.3s ease;
}
.turn-fade-leave-active {
  transition: opacity 0.5s ease;
}
.turn-fade-enter-from,
.turn-fade-leave-to {
  opacity: 0;
}
</style>
