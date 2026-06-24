<script setup lang="ts">
defineProps<{ open: boolean }>()
const emit = defineEmits<{ cancel: []; confirm: [] }>()
</script>

<template>
  <Teleport to="body">
    <Transition name="quit-overlay">
      <div
        v-if="open"
        class="quit-backdrop"
        @mousedown.self="emit('cancel')"
      >
        <div class="quit-panel">
          <div class="quit-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75"/>
            </svg>
          </div>

          <h2 class="quit-title">Quitter la partie ?</h2>
          <p class="quit-sub">Tu seras déconnecté et redirigé vers l'accueil. La partie continuera sans toi.</p>

          <div class="quit-actions">
            <button class="quit-btn quit-btn--cancel" @click="emit('cancel')">
              Annuler
            </button>
            <button class="quit-btn quit-btn--confirm" @click="emit('confirm')">
              Quitter
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.quit-backdrop {
  position: fixed;
  inset: 0;
  z-index: 9100;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(2, 9, 28, 0.80);
  backdrop-filter: blur(5px);
}
.quit-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.25rem;
  padding: 2.5rem 2rem;
  width: 340px;
  background: linear-gradient(160deg, #0d1c2e 0%, #060d1a 100%);
  border: 1px solid rgba(200, 80, 80, 0.3);
  box-shadow: 0 20px 60px rgba(0,0,0,0.8), 0 0 40px rgba(200,80,80,0.08);
  text-align: center;
}
.quit-icon {
  width: 52px;
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(200, 80, 80, 0.1);
  border: 1px solid rgba(200, 80, 80, 0.28);
  border-radius: 50%;
  color: #e06060;
  animation: quit-pulse 2s ease-in-out infinite;
}
.quit-icon svg { width: 22px; height: 22px; }
.quit-title {
  font-size: 1rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: #F2E5CD;
  margin: 0;
}
.quit-sub {
  font-size: 0.75rem;
  color: #6a8a90;
  line-height: 1.55;
  margin: 0;
}
.quit-actions {
  display: flex;
  gap: 0.75rem;
  width: 100%;
}
.quit-btn {
  flex: 1;
  padding: 0.6rem 0;
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  border-radius: 2px;
  cursor: pointer;
  transition: filter 0.15s, background 0.15s;
}
.quit-btn:active { transform: scale(0.97); }
.quit-btn--cancel {
  background: transparent;
  color: #8aabb0;
  border: 1px solid rgba(200, 170, 110, 0.2);
}
.quit-btn--cancel:hover { border-color: rgba(200,170,110,0.5); color: #F2E5CD; }
.quit-btn--confirm {
  background: rgba(200, 60, 60, 0.15);
  color: #e06060;
  border: 1px solid rgba(200, 60, 60, 0.4);
}
.quit-btn--confirm:hover { background: rgba(200,60,60,0.28); filter: brightness(1.1); }

@keyframes quit-pulse {
  0%, 100% { box-shadow: 0 0 0 0   rgba(200, 80, 80, 0.3); }
  50%       { box-shadow: 0 0 0 8px rgba(200, 80, 80, 0);   }
}

.quit-overlay-enter-from, .quit-overlay-leave-to  { opacity: 0; transform: scale(0.96) translateY(8px); }
.quit-overlay-enter-active, .quit-overlay-leave-active { transition: opacity 0.18s, transform 0.18s; }
</style>
