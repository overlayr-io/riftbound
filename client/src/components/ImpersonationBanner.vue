<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()

async function stop() {
  await auth.signOut()
  window.location.href = '/'
}
</script>

<template>
  <div v-if="auth.isImpersonating" class="imp-banner">
    <span class="imp-text">
      👁 Mode « voir comme » — session de <strong>{{ auth.impersonatedUid?.slice(0, 10) }}</strong>
    </span>
    <button class="imp-quit" @click="stop">Quitter</button>
  </div>
</template>

<style scoped>
.imp-banner {
  position: fixed;
  top: 0; left: 0; right: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 0.5rem 1rem;
  background: repeating-linear-gradient(45deg, #5c2e2e, #5c2e2e 12px, #6b2f2f 12px, #6b2f2f 24px);
  color: #ffe0e0;
  font-size: 0.85rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  box-shadow: 0 2px 12px rgba(0,0,0,0.5);
}
.imp-text strong { color: #fff; }
.imp-quit {
  background: #fff; color: #6b2f2f; border: none; border-radius: 6px;
  padding: 0.3rem 0.8rem; font-weight: 700; cursor: pointer;
}
.imp-quit:hover { background: #ffe0e0; }
</style>
