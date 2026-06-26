<script setup lang="ts">
import { onMounted, ref } from 'vue'
import type { BugReportStatus, BugReportSeverity } from '@riftbound/shared'
import { adminSupportApi, type BugReportDto } from '@/services/adminSupportApi'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const reports = ref<BugReportDto[]>([])
const loading = ref(false)
const filter = ref<BugReportStatus | ''>('open')

const statuses: BugReportStatus[] = ['open', 'triaged', 'in_progress', 'resolved', 'closed']
const sevChip: Record<BugReportSeverity, string> = { low: 'adm-chip', medium: 'adm-chip', high: 'adm-chip--gold', critical: 'adm-chip--danger' }

async function load() {
  loading.value = true
  try { reports.value = await adminSupportApi.listBugReports(filter.value || undefined) } finally { loading.value = false }
}
async function setStatus(r: BugReportDto, status: BugReportStatus) {
  await adminSupportApi.updateBugReport(r.id, { status }); await load()
}
async function assignSelf(r: BugReportDto) {
  await adminSupportApi.updateBugReport(r.id, { assignedTo: auth.user?.uid ?? null }); await load()
}
function fmt(iso: string) { return new Date(iso).toLocaleString('fr-FR') }

onMounted(load)
</script>

<template>
  <div>
    <header class="page-head">
      <p class="adm-eyebrow">Transversal</p>
      <h1 class="adm-title">Bug reports & feedback</h1>
    </header>

    <div class="filters">
      <select v-model="filter" class="adm-input" @change="load">
        <option value="">Tous</option>
        <option v-for="s in statuses" :key="s" :value="s">{{ s }}</option>
      </select>
    </div>

    <div class="adm-card panel">
      <div v-if="loading" class="adm-state"><div class="adm-spinner" /> Chargement…</div>
      <div v-else-if="reports.length === 0" class="adm-state"><span class="empty">◆</span> Aucun rapport.</div>
      <table v-else class="adm-table">
        <thead><tr><th>Date</th><th>Sévérité</th><th>Message</th><th>Version</th><th>Statut</th><th>Actions</th></tr></thead>
        <tbody>
          <tr v-for="r in reports" :key="r.id">
            <td class="adm-mono nowrap">{{ fmt(r.createdAt) }}</td>
            <td><span class="adm-chip" :class="sevChip[r.severity]">{{ r.severity }}</span></td>
            <td class="msg">{{ r.message }}</td>
            <td class="adm-mono">{{ r.clientVersion }}</td>
            <td>
              <select :value="r.status" class="adm-input mini-sel" @change="setStatus(r, ($event.target as HTMLSelectElement).value as BugReportStatus)">
                <option v-for="s in statuses" :key="s" :value="s">{{ s }}</option>
              </select>
            </td>
            <td>
              <button class="adm-btn adm-btn--ghost mini" @click="assignSelf(r)">
                {{ r.assignedTo ? '✓ assigné' : "M'assigner" }}
              </button>
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
.filters { margin-bottom: 1rem; }
.panel { padding: 0; overflow: hidden; }
.nowrap { white-space: nowrap; }
.msg { max-width: 360px; }
.mini-sel { padding: 0.3rem 0.4rem; font-size: 0.78rem; }
.mini { padding: 0.3rem 0.55rem; font-size: 0.74rem; }
.empty { color: var(--adm-gold); opacity: 0.5; }
</style>
