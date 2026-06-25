<script setup lang="ts">
import { onMounted, reactive } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import type { GamesFilter, GameStatus } from '@riftbound/shared'
import { useAdminGamesStore } from '@/stores/adminGames'
import CopyButton from '@/components/admin/CopyButton.vue'

const store = useAdminGamesStore()
const { games, loading, error } = storeToRefs(store)
const router = useRouter()

const filters = reactive<GamesFilter>({})
const search = reactive({ value: '' })

const statusLabels: Record<GameStatus, string> = {
  active: 'En cours',
  ended: 'Terminée',
  abandoned: 'Abandonnée',
}
const statusClass: Record<GameStatus, string> = {
  active: 'adm-chip--ok',
  ended: 'adm-chip',
  abandoned: 'adm-chip--danger',
}

function apply() {
  store.fetchList({ ...filters, search: search.value.trim() || undefined })
}

function resetFilters() {
  filters.mode = undefined
  filters.matchFormat = undefined
  filters.deckFormat = undefined
  filters.status = undefined
  search.value = ''
  apply()
}

function fmt(iso: string): string {
  return new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

onMounted(apply)
</script>

<template>
  <div>
    <header class="page-head">
      <p class="adm-eyebrow">Domaine A</p>
      <h1 class="adm-title">Parties</h1>
    </header>

    <div class="filters">
      <input v-model="search" class="adm-input search" placeholder="Rechercher — gameId, lobby, joueur" @keyup.enter="apply" />
      <select v-model="filters.status" class="adm-input" @change="apply">
        <option :value="undefined">Tous statuts</option>
        <option value="active">En cours</option>
        <option value="ended">Terminée</option>
        <option value="abandoned">Abandonnée</option>
      </select>
      <select v-model="filters.mode" class="adm-input" @change="apply">
        <option :value="undefined">Tous modes</option>
        <option value="dual">dual</option>
        <option value="2v2">2v2</option>
        <option value="FFA">FFA</option>
      </select>
      <select v-model="filters.matchFormat" class="adm-input" @change="apply">
        <option :value="undefined">Tous formats</option>
        <option value="BO1">BO1</option>
        <option value="BO3">BO3</option>
        <option value="BO5">BO5</option>
      </select>
      <select v-model="filters.deckFormat" class="adm-input" @change="apply">
        <option :value="undefined">Tous decks</option>
        <option value="constructed">constructed</option>
        <option value="sealed">sealed</option>
        <option value="learn_to_play">learn_to_play</option>
      </select>
      <button class="adm-btn adm-btn--ghost" @click="resetFilters">Réinitialiser</button>
    </div>

    <div class="adm-card panel">
      <div v-if="loading" class="adm-state"><div class="adm-spinner" /> Chargement…</div>
      <div v-else-if="error" class="adm-state adm-state--error">{{ error }}</div>
      <div v-else-if="games.length === 0" class="adm-state"><span class="empty-icon">◆</span> Aucune partie.</div>

      <table v-else class="adm-table">
        <thead>
          <tr>
            <th>Statut</th>
            <th>Partie</th>
            <th>Mode</th>
            <th>Format</th>
            <th>Joueurs</th>
            <th>Maj</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="g in games" :key="g.gameId" class="clickable" @click="router.push(`/admin/games/${g.gameId}`)">
            <td><span class="adm-chip" :class="statusClass[g.status]">{{ statusLabels[g.status] }}</span></td>
            <td>
              <div class="id-cell">
                <span class="adm-mono">{{ g.gameId.slice(0, 10) }}</span>
                <CopyButton :value="g.gameId" />
              </div>
            </td>
            <td>{{ g.mode }}</td>
            <td class="adm-mono">{{ g.matchFormat }} · {{ g.deckFormat }}</td>
            <td>{{ g.players.map(p => p.name).join(', ') || '—' }}</td>
            <td class="adm-mono nowrap">{{ fmt(g.updatedAt) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.page-head { margin-bottom: 1.5rem; }
.page-head .adm-eyebrow { margin-bottom: 0.35rem; }
.filters { display: flex; gap: 0.6rem; margin-bottom: 1.25rem; flex-wrap: wrap; }
.filters .search { min-width: 280px; flex: 1 1 280px; }
.filters select { cursor: pointer; }
.panel { padding: 0; overflow: hidden; }
.nowrap { white-space: nowrap; }
.clickable { cursor: pointer; }
.id-cell { display: inline-flex; align-items: center; gap: 0.5rem; }
.empty-icon { color: var(--adm-gold); font-size: 1.2rem; opacity: 0.5; }
</style>
