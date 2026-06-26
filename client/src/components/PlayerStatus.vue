<script setup lang="ts">
import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()

const playerName = computed(() =>
  auth.user ? auth.user?.displayName : '--------'
)

const statusColor = computed(() => (auth.initialized ? '#00CCB9' : '#C8AA6E'))
const statusLabel = computed(() => (auth.initialized ? 'EN LIGNE' : 'CONNEXION…'))
</script>

<template>
  <div class="player-widget">
    <div class="player-widget__status-bar" :style="{ '--status-color': statusColor }" />

    <div class="player-widget__avatar">
      <svg class="avatar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <path stroke-linecap="round" stroke-linejoin="round"
          d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
      </svg>
    </div>

    <div class="player-widget__info">
      <span class="player-widget__name">{{ playerName }}</span>
      <div class="player-widget__status">
        <span class="player-widget__dot" :style="{ background: statusColor }" />
        <span class="player-widget__label" :style="{ color: statusColor }">{{ statusLabel }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.player-widget {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background: linear-gradient(135deg, #0a1828 0%, #060f1b 100%);
  border: 1px solid rgba(200, 170, 110, 0.2);
  padding: 0.6rem 1rem 0.75rem;
  overflow: hidden;
  position: relative;
}

.player-widget__status-bar {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, transparent, var(--status-color) 40%, var(--status-color) 60%, transparent);
  opacity: 0.7;
}

.player-widget__avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.2rem;
  height: 2.2rem;
  background: rgba(200, 170, 110, 0.08);
  border: 1px solid rgba(200, 170, 110, 0.2);
  color: #c8aa6e;
  flex-shrink: 0;
}

.avatar-icon {
  width: 1.25rem;
  height: 1.25rem;
}

.player-widget__info {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.player-widget__name {
  font-size: 0.875rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  color: #f2e5cd;
}

.player-widget__status {
  display: flex;
  align-items: center;
  gap: 0.3rem;
}

.player-widget__dot {
  width: 0.4rem;
  height: 0.4rem;
  border-radius: 50%;
}

.player-widget__label {
  font-size: 0.55rem;
  font-weight: 700;
  letter-spacing: 0.2em;
}
</style>
