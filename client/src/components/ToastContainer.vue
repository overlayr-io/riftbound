<script setup lang="ts">
import { useToast } from '@/stores/toast'

const { toasts, remove } = useToast()

const ICONS: Record<string, string> = {
  error:   'M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z',
  warning: 'M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z',
  success: 'M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  info:    'M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z',
}
</script>

<template>
  <Teleport to="body">
    <div class="toast-stack">
      <TransitionGroup name="toast">
        <div
          v-for="toast in toasts"
          :key="toast.id"
          class="toast"
          :class="`toast--${toast.type}`"
          @click="remove(toast.id)"
        >
          <span class="toast__border" />

          <svg class="toast__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" :d="ICONS[toast.type]" />
          </svg>

          <span class="toast__message">{{ toast.message }}</span>

          <button class="toast__close" @click.stop="remove(toast.id)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
.toast-stack {
  position: fixed;
  bottom: 1.5rem;
  right: 1.5rem;
  z-index: 9999;
  display: flex;
  flex-direction: column-reverse;
  gap: 0.75rem;
  pointer-events: none;
}

.toast {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.875rem 1rem 0.875rem 1rem;
  min-width: 18rem;
  max-width: 26rem;
  cursor: pointer;
  pointer-events: all;

  background: linear-gradient(135deg, #0d1e2e 0%, #060f1b 100%);
  clip-path: polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px));
}

/* accent border via pseudo + color vars */
.toast__border {
  position: absolute;
  inset: 0;
  clip-path: polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px));
  pointer-events: none;
}
.toast--error   .toast__border { box-shadow: inset 0 0 0 1.5px #c0392b, inset 0 0 20px rgba(192, 57, 43, 0.15); }
.toast--warning .toast__border { box-shadow: inset 0 0 0 1.5px #c8aa6e, inset 0 0 20px rgba(200, 170, 110, 0.15); }
.toast--success .toast__border { box-shadow: inset 0 0 0 1.5px #1abc9c, inset 0 0 20px rgba(26, 188, 156, 0.15); }
.toast--info    .toast__border { box-shadow: inset 0 0 0 1.5px #4a90d9, inset 0 0 20px rgba(74, 144, 217, 0.15); }

.toast__icon {
  flex-shrink: 0;
  width: 1.25rem;
  height: 1.25rem;
}
.toast--error   .toast__icon { color: #e74c3c; }
.toast--warning .toast__icon { color: #c8aa6e; }
.toast--success .toast__icon { color: #1abc9c; }
.toast--info    .toast__icon { color: #4a90d9; }

.toast__message {
  flex: 1;
  font-size: 0.8rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  color: #e8dcc8;
  line-height: 1.4;
}

.toast__close {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.1rem;
  height: 1.1rem;
  background: none;
  border: none;
  cursor: pointer;
  color: rgba(200, 170, 110, 0.4);
  padding: 0;
  transition: color 0.2s;
}
.toast__close:hover {
  color: #c8aa6e;
}
.toast__close svg {
  width: 100%;
  height: 100%;
}

/* glow à l'entrée selon le type */
.toast--error   { filter: drop-shadow(0 0 12px rgba(192, 57, 43, 0.25)); }
.toast--warning { filter: drop-shadow(0 0 12px rgba(200, 170, 110, 0.2)); }
.toast--success { filter: drop-shadow(0 0 12px rgba(26, 188, 156, 0.2)); }
.toast--info    { filter: drop-shadow(0 0 12px rgba(74, 144, 217, 0.2)); }

/* transitions */
.toast-enter-active { transition: all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1); }
.toast-leave-active { transition: all 0.25s ease-in; }
.toast-enter-from   { opacity: 0; transform: translateX(2rem) scale(0.95); }
.toast-leave-to     { opacity: 0; transform: translateX(1rem) scale(0.95); }
.toast-move         { transition: transform 0.3s ease; }
</style>
