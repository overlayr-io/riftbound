<script setup lang="ts">
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import { publicApi } from '@/services/publicApi'

declare const __APP_VERSION__: string

const route = useRoute()
const open = ref(false)
const message = ref('')
const severity = ref('medium')
const sending = ref(false)
const done = ref(false)

async function submit() {
  if (!message.value.trim()) return
  sending.value = true
  try {
    await publicApi.bugReport({
      message: message.value.trim(),
      severity: severity.value,
      gameId: typeof route.params.gameId === 'string' ? route.params.gameId : null,
      clientVersion: typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev',
    })
    done.value = true
    message.value = ''
    setTimeout(() => { open.value = false; done.value = false }, 1500)
  } catch { /* noop */ }
  finally { sending.value = false }
}
</script>

<template>
  <div class="bug-widget">
    <button v-if="!open" class="bug-fab" title="Signaler un bug / Donner un avis" @click="open = true">🐛</button>

    <div v-else class="bug-panel">
      <div class="bug-head">
        <span>Signaler un bug / avis</span>
        <button class="x" @click="open = false">✕</button>
      </div>
      <template v-if="!done">
        <textarea v-model="message" rows="4" placeholder="Décris le problème ou ton retour…"></textarea>
        <div class="row">
          <select v-model="severity">
            <option value="low">Mineur</option>
            <option value="medium">Moyen</option>
            <option value="high">Important</option>
            <option value="critical">Bloquant</option>
          </select>
          <button class="send" :disabled="sending || !message.trim()" @click="submit">{{ sending ? '…' : 'Envoyer' }}</button>
        </div>
      </template>
      <p v-else class="ok">✓ Merci ! Rapport envoyé.</p>
    </div>
  </div>
</template>

<style scoped>
.bug-widget { position: fixed; bottom: 1rem; right: 1rem; z-index: 400; }
.bug-fab {
  width: 2.75rem; height: 2.75rem; border-radius: 50%; border: 1px solid rgba(200,170,110,0.4);
  background: rgba(10,21,37,0.9); color: #fff; font-size: 1.1rem; cursor: pointer;
  box-shadow: 0 6px 18px rgba(0,0,0,0.5); transition: transform 0.15s;
}
.bug-fab:hover { transform: scale(1.08); border-color: #c8aa6e; }
.bug-panel {
  width: 290px; background: linear-gradient(180deg, #0c121d, #0a0f18);
  border: 1px solid rgba(200,170,110,0.25); border-radius: 12px; padding: 1rem;
  box-shadow: 0 16px 40px rgba(0,0,0,0.6); color: #e8ebf0;
}
.bug-head { display: flex; justify-content: space-between; align-items: center; font-size: 0.82rem; color: #c8aa6e; margin-bottom: 0.7rem; }
.x { background: none; border: none; color: #8a93a5; cursor: pointer; }
textarea { width: 100%; background: #070b12; border: 1px solid #2a3445; border-radius: 8px; color: #fff; padding: 0.5rem; resize: vertical; font-family: inherit; }
.row { display: flex; gap: 0.5rem; margin-top: 0.6rem; }
select { flex: 1; background: #070b12; border: 1px solid #2a3445; border-radius: 8px; color: #fff; padding: 0.4rem; }
.send { background: linear-gradient(180deg,#f2e5cd,#c8aa6e 52%,#a3751e); color: #1a130a; font-weight: 700; border: none; border-radius: 8px; padding: 0.45rem 0.9rem; cursor: pointer; }
.send:disabled { opacity: 0.5; }
.ok { color: #4fd6a0; font-size: 0.85rem; text-align: center; padding: 0.5rem 0; }
</style>
