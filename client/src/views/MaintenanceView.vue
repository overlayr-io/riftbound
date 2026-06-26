<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { publicApi } from '@/services/publicApi'

const router = useRouter()
const message = ref('Le jeu est en maintenance. Reviens bientôt.')

async function check() {
  try {
    const m = await publicApi.maintenance()
    if (!m.enabled) { router.replace('/'); return }
    if (m.message) message.value = m.message
  } catch { /* noop */ }
}
onMounted(check)
</script>

<template>
  <div class="maint">
    <div class="card">
      <div class="brand">RIFTBOUND TCG</div>
      <div class="cog">⚙</div>
      <h1>Maintenance en cours</h1>
      <p>{{ message }}</p>
      <button class="retry" @click="check">Réessayer</button>
    </div>
  </div>
</template>

<style scoped>
.maint { width: 100vw; height: 100vh; display: flex; align-items: center; justify-content: center; background: radial-gradient(ellipse 140% 90% at 50% 25%, #091629 0%, #030810 65%); color: #e8ebf0; }
.card { text-align: center; max-width: 420px; padding: 2rem; }
.brand { font-size: 1.3rem; font-weight: 900; letter-spacing: 0.14em; background: linear-gradient(180deg, #f2e5cd, #c8aa6e 52%, #a3751e); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; margin-bottom: 1.5rem; }
.cog { font-size: 3rem; color: #c8aa6e; animation: spin 4s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
h1 { font-size: 1.3rem; color: #f2e5cd; margin: 1rem 0 0.5rem; }
p { color: #aeb4c0; line-height: 1.5; }
.retry { margin-top: 1.5rem; background: #161d2b; border: 1px solid #2a3445; color: #fff; padding: 0.55rem 1.2rem; border-radius: 8px; cursor: pointer; }
.retry:hover { border-color: #c8aa6e; }
</style>
