<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { publicApi } from '@/services/publicApi'
import { useAuthStore } from '@/stores/auth'

const CONSENT_VERSION = '1'
const KEY = 'riftbound_consent'
const auth = useAuthStore()
const visible = ref(false)

onMounted(() => {
  if (localStorage.getItem(KEY) !== CONSENT_VERSION) visible.value = true
})

async function accept() {
  localStorage.setItem(KEY, CONSENT_VERSION)
  visible.value = false
  await auth.waitForInit()
  try { await publicApi.consent(CONSENT_VERSION) } catch { /* journal best-effort */ }
}
</script>

<template>
  <div v-if="visible" class="consent">
    <span class="txt">
      Overlayr enregistre certaines données de jeu pour fonctionner correctement avec la possibilité de les supprimer à tout moment.
    </span>
    <button class="accept" @click="accept">J'ai compris</button>
  </div>
</template>

<style scoped>
.consent {
  position: fixed; bottom: 0; left: 0; right: 0; z-index: 450;
  display: flex; align-items: center; justify-content: center; gap: 1rem; flex-wrap: wrap;
  padding: 0.7rem 1.2rem; background: rgba(6,13,9,0.96); border-top: 1px solid rgba(200,170,110,0.25);
  color: #aeb4c0; font-size: 0.8rem;
}
.txt { max-width: 640px; }
.accept { background: linear-gradient(180deg,#f2e5cd,#c8aa6e 52%,#a3751e); color: #1a130a; font-weight: 700; border: none; border-radius: 8px; padding: 0.4rem 1rem; cursor: pointer; white-space: nowrap; }
</style>
