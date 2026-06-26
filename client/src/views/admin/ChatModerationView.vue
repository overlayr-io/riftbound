<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { adminOpsApi, type MessageReportDto } from '@/services/adminOpsApi'

const reports = ref<MessageReportDto[]>([])
const loading = ref(false)
const msg = ref<string | null>(null)
const words = ref('')

async function load() {
  loading.value = true
  try {
    reports.value = await adminOpsApi.listReports('open')
    words.value = (await adminOpsApi.getChatConfig()).extraBlockedWords.join(', ')
  } finally { loading.value = false }
}
async function saveWords() {
  const list = words.value.split(',').map((w) => w.trim()).filter(Boolean)
  await adminOpsApi.setChatConfig(list)
  msg.value = `${list.length} mot(s) bloqué(s) enregistré(s).`
}
async function resolve(r: MessageReportDto, deleteMessage: boolean) {
  await adminOpsApi.resolveReport(r.id, deleteMessage)
  msg.value = deleteMessage ? 'Message supprimé.' : 'Signalement ignoré.'
  await load()
}
async function mute(uid: string) {
  await adminOpsApi.mute(uid, true)
  msg.value = `Joueur ${uid.slice(0, 8)} mute.`
}
function fmt(iso: string) { return new Date(iso).toLocaleString('fr-FR') }

onMounted(load)
</script>

<template>
  <div>
    <header class="page-head">
      <p class="adm-eyebrow">Domaine D · modération</p>
      <h1 class="adm-title">Modération chat</h1>
    </header>

    <p v-if="msg" class="flash">{{ msg }}</p>

    <div class="adm-card block">
      <div class="section-title">Filtre de gros mots <span class="muted">· en plus du dictionnaire</span></div>
      <div class="filter-row">
        <input v-model="words" class="adm-input grow" placeholder="mots séparés par des virgules" />
        <button class="adm-btn adm-btn--primary" @click="saveWords">Enregistrer</button>
      </div>
    </div>

    <div class="adm-card block">
      <div class="section-title">Messages signalés (ouverts)</div>
      <div v-if="loading" class="adm-state"><div class="adm-spinner" /> Chargement…</div>
      <div v-else-if="reports.length === 0" class="adm-state"><span class="empty">◆</span> Aucun signalement ouvert.</div>
      <table v-else class="adm-table">
        <thead><tr><th>Date</th><th>Scope</th><th>Message</th><th>Auteur</th><th>Raison</th><th>Actions</th></tr></thead>
        <tbody>
          <tr v-for="r in reports" :key="r.id">
            <td class="adm-mono nowrap">{{ fmt(r.createdAt) }}</td>
            <td><span class="adm-chip">{{ r.scope }}</span></td>
            <td class="msg-text">{{ r.messageText || '—' }}</td>
            <td class="adm-mono">{{ r.targetUid.slice(0, 8) || '—' }}</td>
            <td class="muted">{{ r.reason || '—' }}</td>
            <td class="actions">
              <button class="adm-btn danger-btn mini" @click="resolve(r, true)">Supprimer</button>
              <button class="adm-btn adm-btn--ghost mini" @click="resolve(r, false)">Ignorer</button>
              <button v-if="r.targetUid" class="adm-btn adm-btn--ghost mini" @click="mute(r.targetUid)">Mute</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.page-head { margin-bottom: 1.5rem; }
.page-head .adm-eyebrow { margin-bottom: 0.35rem; }
.block { padding: 1.35rem 1.5rem; margin-bottom: 1.25rem; }
.filter-row { display: flex; gap: 0.5rem; }
.grow { flex: 1; }
.section-title { font-size: 0.7rem; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: var(--adm-text-dim); margin-bottom: 0.9rem; }
.muted { color: var(--adm-text-faint); }
.flash { color: var(--adm-gold); margin-bottom: 1rem; font-size: 0.85rem; }
.nowrap { white-space: nowrap; }
.msg-text { max-width: 320px; }
.actions { display: flex; gap: 0.35rem; }
.mini { padding: 0.3rem 0.55rem; font-size: 0.74rem; }
.danger-btn { background: rgba(255,107,107,0.12); border: 1px solid rgba(255,107,107,0.4); color: var(--adm-danger); }
.empty { color: var(--adm-gold); opacity: 0.5; }
</style>
