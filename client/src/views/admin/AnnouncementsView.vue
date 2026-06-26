<script setup lang="ts">
import { onMounted, ref } from 'vue'
import type { AnnouncementLevel } from '@riftbound/shared'
import { adminContentApi, type AnnouncementDto } from '@/services/adminContentApi'

const items = ref<AnnouncementDto[]>([])
const loading = ref(false)
const form = ref({ message: '', level: 'info' as AnnouncementLevel, startsAt: '', endsAt: '' })
const levels: AnnouncementLevel[] = ['info', 'warning', 'critical']

async function load() {
  loading.value = true
  try { items.value = await adminContentApi.listAnnouncements() } finally { loading.value = false }
}
async function create() {
  if (!form.value.message) return
  await adminContentApi.createAnnouncement({
    message: form.value.message, level: form.value.level,
    startsAt: form.value.startsAt || null, endsAt: form.value.endsAt || null, targetRoles: null,
  })
  form.value = { message: '', level: 'info', startsAt: '', endsAt: '' }
  await load()
}
async function del(id: string) { await adminContentApi.deleteAnnouncement(id); await load() }
function fmt(iso: string | null) { return iso ? new Date(iso).toLocaleString('fr-FR') : '—' }
const levelChip: Record<AnnouncementLevel, string> = { info: 'adm-chip', warning: 'adm-chip--gold', critical: 'adm-chip--danger' }

onMounted(load)
</script>

<template>
  <div>
    <header class="page-head">
      <p class="adm-eyebrow">Domaine D · contenu</p>
      <h1 class="adm-title">Annonces / broadcast</h1>
    </header>

    <div class="adm-card block">
      <div class="section-title">Nouvelle annonce <span class="muted">· bannière joueur</span></div>
      <div class="form">
        <input v-model="form.message" class="adm-input grow" placeholder="Message affiché aux joueurs" />
        <select v-model="form.level" class="adm-input"><option v-for="l in levels" :key="l" :value="l">{{ l }}</option></select>
        <label class="lbl">Début <input v-model="form.startsAt" class="adm-input" type="datetime-local" /></label>
        <label class="lbl">Fin <input v-model="form.endsAt" class="adm-input" type="datetime-local" /></label>
        <button class="adm-btn adm-btn--primary" :disabled="!form.message" @click="create">Publier</button>
      </div>
    </div>

    <div class="adm-card block">
      <div class="section-title">Annonces ({{ items.length }})</div>
      <div v-if="loading" class="adm-state"><div class="adm-spinner" /></div>
      <table v-else-if="items.length" class="adm-table">
        <thead><tr><th>Niveau</th><th>Message</th><th>Début</th><th>Fin</th><th></th></tr></thead>
        <tbody>
          <tr v-for="a in items" :key="a.id">
            <td><span class="adm-chip" :class="levelChip[a.level]">{{ a.level }}</span></td>
            <td>{{ a.message }}</td>
            <td class="adm-mono nowrap">{{ fmt(a.startsAt) }}</td>
            <td class="adm-mono nowrap">{{ fmt(a.endsAt) }}</td>
            <td><button class="adm-btn danger-btn mini" @click="del(a.id)">Suppr.</button></td>
          </tr>
        </tbody>
      </table>
      <p v-else class="muted">Aucune annonce.</p>
    </div>
  </div>
</template>

<style scoped>
.page-head { margin-bottom: 1.5rem; }
.page-head .adm-eyebrow { margin-bottom: 0.35rem; }
.block { padding: 1.35rem 1.5rem; margin-bottom: 1.25rem; }
.section-title { font-size: 0.7rem; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: var(--adm-text-dim); margin-bottom: 0.9rem; }
.muted { color: var(--adm-text-faint); font-weight: 400; }
.form { display: flex; gap: 0.5rem; flex-wrap: wrap; align-items: flex-end; }
.form .grow { flex: 1; min-width: 240px; }
.lbl { display: flex; flex-direction: column; gap: 0.25rem; font-size: 0.72rem; color: var(--adm-text-dim); }
.nowrap { white-space: nowrap; }
.mini { padding: 0.35rem 0.6rem; font-size: 0.76rem; }
.danger-btn { background: rgba(255,107,107,0.12); border: 1px solid rgba(255,107,107,0.4); color: var(--adm-danger); }
</style>
