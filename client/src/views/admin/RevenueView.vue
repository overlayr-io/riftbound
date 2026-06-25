<script setup lang="ts">
import { onMounted, ref } from 'vue'
import type { RevenueMetrics } from '@riftbound/shared'
import { adminAnalyticsApi } from '@/services/adminAnalyticsApi'
import { ApiError } from '@/services/http'

const data = ref<RevenueMetrics | null>(null)
const error = ref<string | null>(null)

onMounted(async () => {
  try { data.value = await adminAnalyticsApi.revenue() }
  catch (err) { error.value = err instanceof ApiError ? err.message : 'Erreur' }
})
</script>

<template>
  <div>
    <header class="page-head">
      <p class="adm-eyebrow">Domaine C · super_admin</p>
      <h1 class="adm-title">Revenu</h1>
    </header>

    <div v-if="error" class="adm-state adm-state--error">{{ error }}</div>

    <template v-else>
      <div class="banner adm-card">
        🔒 Module réservé au super_admin. {{ data?.note ?? 'Structure prête, monétisation non active.' }}
      </div>

      <div class="kpis">
        <div class="adm-card kpi placeholder"><div class="kpi-num">{{ data?.mrr ?? '—' }}</div><div class="kpi-label">MRR</div></div>
        <div class="adm-card kpi placeholder"><div class="kpi-num">{{ data?.arpu ?? '—' }}</div><div class="kpi-label">ARPU</div></div>
        <div class="adm-card kpi placeholder"><div class="kpi-num">{{ data?.payingUsers ?? '—' }}</div><div class="kpi-label">Utilisateurs payants</div></div>
      </div>

      <p class="hint">
        Les indicateurs s'activeront une fois la monétisation branchée (abonnements / achats).
        L'endpoint <code>/admin/analytics/revenue</code> est déjà gaté par <code>revenue:read</code>
        et invisible pour les moderators.
      </p>
    </template>
  </div>
</template>

<style scoped>
.page-head { margin-bottom: 1.5rem; }
.page-head .adm-eyebrow { margin-bottom: 0.35rem; }
.banner { padding: 1rem 1.25rem; margin-bottom: 1.25rem; color: var(--adm-gold); border-color: var(--adm-border-gold); font-size: 0.9rem; }
.kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 1rem; margin-bottom: 1.25rem; }
.kpi { padding: 1.25rem 1.4rem; }
.kpi.placeholder { opacity: 0.6; }
.kpi-num { font-size: 1.8rem; font-weight: 800; color: var(--adm-text); }
.kpi-label { color: var(--adm-text-dim); font-size: 0.78rem; margin-top: 0.5rem; }
.hint { color: var(--adm-text-dim); font-size: 0.85rem; max-width: 560px; line-height: 1.6; }
code { background: var(--adm-raise); padding: 0.1rem 0.35rem; border-radius: 4px; font-size: 0.82em; color: var(--adm-gold); }
</style>
