<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import type { MetricPoint } from '@riftbound/shared'
import { useAdminAnalyticsStore } from '@/stores/adminAnalytics'
import { adminAnalyticsApi } from '@/services/adminAnalyticsApi'

const store = useAdminAnalyticsStore()
const { dashboard, health, loading, error } = storeToRefs(store)

onMounted(() => store.load(14))

function max(points: MetricPoint[]): number {
  return Math.max(1, ...points.map((p) => p.value))
}
function pct(n: number, d: number): string {
  return d > 0 ? `${Math.round((n / d) * 100)}%` : '0%'
}
function dur(ms: number | null): string {
  if (ms === null) return '—'
  const m = Math.round(ms / 60000)
  return m >= 60 ? `${Math.floor(m / 60)}h${String(m % 60).padStart(2, '0')}` : `${m} min`
}
const modeTotal = computed(() => dashboard.value?.modeBreakdown.reduce((s, m) => s + m.count, 0) ?? 0)
</script>

<template>
  <div>
    <header class="page-head">
      <div>
        <p class="adm-eyebrow">Domaine C</p>
        <h1 class="adm-title">Analytics & santé</h1>
      </div>
      <div class="exports">
        <button class="adm-btn adm-btn--ghost" @click="adminAnalyticsApi.download('csv')">Export CSV</button>
        <button class="adm-btn adm-btn--ghost" @click="adminAnalyticsApi.download('json')">Export JSON</button>
      </div>
    </header>

    <div v-if="loading && !dashboard" class="adm-state"><div class="adm-spinner" /> Chargement…</div>
    <div v-else-if="error" class="adm-state adm-state--error">{{ error }}</div>

    <template v-else-if="dashboard">
      <!-- KPIs -->
      <div class="kpis">
        <div class="adm-card kpi"><div class="kpi-num">{{ dashboard.active.dau }}</div><div class="kpi-label">DAU</div></div>
        <div class="adm-card kpi"><div class="kpi-num">{{ dashboard.active.wau }}</div><div class="kpi-label">WAU</div></div>
        <div class="adm-card kpi"><div class="kpi-num">{{ dashboard.active.mau }}</div><div class="kpi-label">MAU</div></div>
        <div class="adm-card kpi"><div class="kpi-num">{{ dashboard.newSignups }}</div><div class="kpi-label">Inscriptions ({{ dashboard.rangeDays }}j)</div></div>
        <div class="adm-card kpi"><div class="kpi-num">{{ dashboard.totals.activeGames }}</div><div class="kpi-label">Parties actives</div></div>
        <div class="adm-card kpi"><div class="kpi-num accent">{{ Math.round(dashboard.abandonRate * 100) }}%</div><div class="kpi-label">Taux d'abandon</div></div>
        <div class="adm-card kpi"><div class="kpi-num">{{ dur(dashboard.avgGameDurationMs) }}</div><div class="kpi-label">Durée moy.</div></div>
        <div class="adm-card kpi"><div class="kpi-num">{{ dashboard.totals.games }}</div><div class="kpi-label">Parties totales</div></div>
      </div>

      <div class="grid2">
        <!-- Séries temporelles -->
        <div class="adm-card block">
          <div class="section-title">Inscriptions / jour</div>
          <div class="chart">
            <div v-for="p in dashboard.signupsPerDay" :key="p.date" class="bar-wrap" :title="`${p.date}: ${p.value}`">
              <div class="bar" :style="{ height: `${(p.value / max(dashboard.signupsPerDay)) * 100}%` }" />
            </div>
          </div>
        </div>
        <div class="adm-card block">
          <div class="section-title">Parties créées / jour</div>
          <div class="chart">
            <div v-for="p in dashboard.gamesCreatedPerDay" :key="p.date" class="bar-wrap" :title="`${p.date}: ${p.value}`">
              <div class="bar gold" :style="{ height: `${(p.value / max(dashboard.gamesCreatedPerDay)) * 100}%` }" />
            </div>
          </div>
        </div>
      </div>

      <div class="grid2">
        <!-- Funnel -->
        <div class="adm-card block">
          <div class="section-title">Funnel</div>
          <div class="funnel">
            <div class="fstage">
              <div class="fbar" style="width:100%"><span>Inscrits</span><b>{{ dashboard.funnel.signedUp }}</b></div>
            </div>
            <div class="fstage">
              <div class="fbar" :style="{ width: pct(dashboard.funnel.playedFirstGame, dashboard.funnel.signedUp) }">
                <span>1ère partie</span><b>{{ dashboard.funnel.playedFirstGame }}</b>
              </div>
            </div>
            <div class="fstage">
              <div class="fbar" :style="{ width: pct(dashboard.funnel.completedGame, dashboard.funnel.signedUp) }">
                <span>Partie terminée</span><b>{{ dashboard.funnel.completedGame }}</b>
              </div>
            </div>
          </div>
        </div>

        <!-- Répartition des modes -->
        <div class="adm-card block">
          <div class="section-title">Répartition des modes</div>
          <div class="modes">
            <div v-for="m in dashboard.modeBreakdown" :key="m.mode" class="mode-row">
              <span class="mode-name">{{ m.mode }}</span>
              <div class="mode-track"><div class="mode-fill" :style="{ width: pct(m.count, modeTotal) }" /></div>
              <span class="mode-count">{{ m.count }}</span>
            </div>
            <p v-if="dashboard.modeBreakdown.length === 0" class="muted">Aucune partie.</p>
          </div>
        </div>
      </div>

      <!-- Rétention -->
      <div class="adm-card block">
        <div class="section-title">Rétention par cohorte <span class="muted">· approx. via lastSeenAt</span></div>
        <table v-if="dashboard.retention.length" class="adm-table">
          <thead><tr><th>Cohorte</th><th>Taille</th><th>J1</th><th>J7</th><th>J30</th></tr></thead>
          <tbody>
            <tr v-for="c in dashboard.retention" :key="c.cohort">
              <td class="adm-mono">{{ c.cohort }}</td>
              <td>{{ c.size }}</td>
              <td>{{ c.d1 }} <span class="muted">({{ pct(c.d1, c.size) }})</span></td>
              <td>{{ c.d7 }} <span class="muted">({{ pct(c.d7, c.size) }})</span></td>
              <td>{{ c.d30 }} <span class="muted">({{ pct(c.d30, c.size) }})</span></td>
            </tr>
          </tbody>
        </table>
        <p v-else class="muted">Pas encore de cohortes.</p>
      </div>

      <!-- Santé système -->
      <div v-if="health" class="adm-card block">
        <div class="section-title">Santé système</div>
        <div class="health">
          <div class="h"><span class="adm-chip" :class="health.env === 'emulator' ? 'adm-chip--ok' : 'adm-chip--danger'">{{ health.env }}</span><span class="muted">environnement</span></div>
          <div class="h"><b>{{ health.activeGames }}</b><span class="muted">parties actives</span></div>
          <div class="h"><b>{{ health.requestCount }}</b><span class="muted">requêtes API</span></div>
          <div class="h"><b :class="{ bad: health.errorRate > 0.05 }">{{ Math.round(health.errorRate * 100) }}%</b><span class="muted">taux d'erreur 5xx</span></div>
          <div class="h"><b>{{ health.avgLatencyMs ?? '—' }} ms</b><span class="muted">latence moy.</span></div>
          <div class="h"><b>{{ health.p95LatencyMs ?? '—' }} ms</b><span class="muted">latence p95</span></div>
          <div class="h"><b>{{ Math.floor(health.uptimeSec / 60) }} min</b><span class="muted">uptime</span></div>
          <div class="h"><b class="muted">à instrumenter</b><span class="muted">RTDB / quotas / matchmaking</span></div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.page-head { display: flex; justify-content: space-between; align-items: flex-end; gap: 1rem; margin-bottom: 1.5rem; flex-wrap: wrap; }
.page-head .adm-eyebrow { margin-bottom: 0.35rem; }
.exports { display: flex; gap: 0.5rem; }
.kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 0.85rem; margin-bottom: 1.25rem; }
.kpi { padding: 1.1rem 1.2rem; }
.kpi-num { font-size: 1.6rem; font-weight: 800; color: var(--adm-text); line-height: 1; }
.kpi-num.accent { background: var(--adm-gold-grad); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
.kpi-label { color: var(--adm-text-dim); font-size: 0.75rem; margin-top: 0.5rem; }
.grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem; margin-bottom: 1.25rem; }
.block { padding: 1.35rem 1.5rem; }
.section-title { font-size: 0.7rem; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: var(--adm-text-dim); margin-bottom: 1rem; }
.muted { color: var(--adm-text-faint); font-weight: 400; }
.chart { display: flex; align-items: flex-end; gap: 3px; height: 120px; }
.bar-wrap { flex: 1; height: 100%; display: flex; align-items: flex-end; }
.bar { width: 100%; min-height: 2px; background: var(--adm-teal); border-radius: 2px 2px 0 0; opacity: 0.8; }
.bar.gold { background: var(--adm-gold); }
.funnel { display: flex; flex-direction: column; gap: 0.6rem; }
.fbar { display: flex; justify-content: space-between; align-items: center; padding: 0.6rem 0.85rem; background: rgba(200,170,110,0.12); border: 1px solid var(--adm-border-gold); border-radius: 8px; min-width: 120px; }
.fbar span { color: var(--adm-text-dim); font-size: 0.82rem; }
.fbar b { color: var(--adm-text); }
.modes { display: flex; flex-direction: column; gap: 0.7rem; }
.mode-row { display: grid; grid-template-columns: 60px 1fr 40px; align-items: center; gap: 0.75rem; font-size: 0.85rem; }
.mode-track { height: 10px; background: var(--adm-raise); border-radius: 5px; overflow: hidden; }
.mode-fill { height: 100%; background: var(--adm-gold-grad); }
.mode-count { text-align: right; color: var(--adm-text-dim); }
.health { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem; }
.h { display: flex; flex-direction: column; gap: 0.3rem; }
.h b { font-size: 1.1rem; color: var(--adm-text); }
.h b.bad { color: var(--adm-danger); }
.h .muted { font-size: 0.76rem; }
@media (max-width: 1000px) { .grid2 { grid-template-columns: 1fr; } }
</style>
