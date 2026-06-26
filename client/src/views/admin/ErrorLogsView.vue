<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { adminSupportApi, type ErrorLogDto } from '@/services/adminSupportApi'

const errors = ref<ErrorLogDto[]>([])
const loading = ref(false)
const expanded = ref<string | null>(null)

async function load() {
  loading.value = true
  try { errors.value = await adminSupportApi.listErrors() } finally { loading.value = false }
}
function fmt(iso: string) { return new Date(iso).toLocaleString('fr-FR') }

onMounted(load)
</script>

<template>
  <div>
    <header class="page-head">
      <div>
        <p class="adm-eyebrow">Transversal</p>
        <h1 class="adm-title">Capture d'erreurs</h1>
      </div>
      <button class="adm-btn adm-btn--ghost" @click="load">↻ Actualiser</button>
    </header>
    <p class="hint">Erreurs serveur 5xx + erreurs client, dédupliquées (1/min par signature) et plafonnées pour préserver le quota Firestore.</p>

    <div class="adm-card panel">
      <div v-if="loading" class="adm-state"><div class="adm-spinner" /> Chargement…</div>
      <div v-else-if="errors.length === 0" class="adm-state"><span class="empty">◆</span> Aucune erreur capturée 🎉</div>
      <table v-else class="adm-table">
        <thead><tr><th>Date</th><th>Source</th><th>Code</th><th>Message</th><th>Chemin</th></tr></thead>
        <tbody>
          <template v-for="e in errors" :key="e.id">
            <tr class="clickable" @click="expanded = expanded === e.id ? null : e.id">
              <td class="adm-mono nowrap">{{ fmt(e.at) }}</td>
              <td><span class="adm-chip" :class="e.source === 'server' ? 'adm-chip--danger' : 'adm-chip--gold'">{{ e.source }}</span></td>
              <td class="adm-mono">{{ e.statusCode ?? '—' }}</td>
              <td class="msg">{{ e.message }}</td>
              <td class="adm-mono">{{ e.method }} {{ e.path }}</td>
            </tr>
            <tr v-if="expanded === e.id && e.stack">
              <td colspan="5"><pre class="stack">{{ e.stack }}</pre></td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.page-head { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 0.75rem; }
.page-head .adm-eyebrow { margin-bottom: 0.35rem; }
.hint { color: var(--adm-text-dim); font-size: 0.82rem; margin-bottom: 1.25rem; }
.panel { padding: 0; overflow: hidden; }
.nowrap { white-space: nowrap; }
.clickable { cursor: pointer; }
.msg { max-width: 360px; }
.stack { white-space: pre-wrap; font-size: 0.72rem; color: var(--adm-text-dim); margin: 0; padding: 0.5rem; background: #070b12; border-radius: 6px; }
.empty { color: var(--adm-gold); opacity: 0.5; }
</style>
