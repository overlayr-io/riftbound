<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useAdminStore } from '@/stores/admin'
import { storeToRefs } from 'pinia'

const admin = useAdminStore()
const { auditEntries, loading, error } = storeToRefs(admin)

const filterAction = ref('')
const filterTargetType = ref('')

function applyFilters() {
  admin.fetchAudit({
    action: filterAction.value.trim() || undefined,
    targetType: filterTargetType.value.trim() || undefined,
  })
}

function reset() {
  filterAction.value = ''
  filterTargetType.value = ''
  admin.fetchAudit()
}

onMounted(() => admin.fetchAudit())

function fmt(iso: string): string {
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}
</script>

<template>
  <div>
    <header class="page-head">
      <p class="adm-eyebrow">Traçabilité</p>
      <h1 class="adm-title">Journal d'audit</h1>
    </header>

    <div class="filters">
      <input v-model="filterAction" class="adm-input" placeholder="action — ex. admin.role.assign" @keyup.enter="applyFilters" />
      <input v-model="filterTargetType" class="adm-input" placeholder="type de cible — ex. user" @keyup.enter="applyFilters" />
      <button class="adm-btn adm-btn--primary" @click="applyFilters">Filtrer</button>
      <button class="adm-btn adm-btn--ghost" @click="reset">Réinitialiser</button>
    </div>

    <div class="adm-card panel">
      <div v-if="loading" class="adm-state"><div class="adm-spinner" /> Chargement…</div>
      <div v-else-if="error" class="adm-state adm-state--error">{{ error }}</div>
      <div v-else-if="auditEntries.length === 0" class="adm-state">
        <span class="empty-icon">◆</span>
        Aucune entrée d'audit pour ces critères.
      </div>

      <table v-else class="adm-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Acteur</th>
            <th>Rôle</th>
            <th>Action</th>
            <th>Cible</th>
            <th>IP</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="e in auditEntries" :key="e.id">
            <td class="adm-mono nowrap">{{ fmt(e.at) }}</td>
            <td class="adm-mono">{{ e.actorUid.slice(0, 8) }}</td>
            <td><span class="adm-chip adm-chip--gold">{{ e.actorRole ?? '—' }}</span></td>
            <td><span class="adm-chip">{{ e.action }}</span></td>
            <td class="adm-mono">{{ e.targetType }}:{{ e.targetId?.slice(0, 8) ?? '—' }}</td>
            <td class="adm-mono">{{ e.ip ?? '—' }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.page-head { margin-bottom: 1.5rem; }
.page-head .adm-eyebrow { margin-bottom: 0.35rem; }
.filters {
  display: flex;
  gap: 0.6rem;
  margin-bottom: 1.25rem;
  flex-wrap: wrap;
}
.filters .adm-input { min-width: 240px; flex: 0 1 auto; }
.panel { padding: 0; overflow: hidden; }
.nowrap { white-space: nowrap; }
.empty-icon { color: var(--adm-gold); font-size: 1.2rem; opacity: 0.5; }
</style>
