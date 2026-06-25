<script setup lang="ts">
import { onMounted, reactive } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import type { UsersFilter, UserStatus } from '@riftbound/shared'
import { useAdminUsersStore } from '@/stores/adminUsers'

const store = useAdminUsersStore()
const { users, loading, error } = storeToRefs(store)
const router = useRouter()

const filters = reactive<UsersFilter>({})
const search = reactive({ value: '' })

const statusChip: Record<UserStatus, string> = {
  active: 'adm-chip--ok', suspended: 'adm-chip--gold', banned: 'adm-chip--danger',
}

function apply() {
  store.fetchList({ ...filters, search: search.value.trim() || undefined })
}
function reset() {
  filters.status = undefined; filters.role = undefined; filters.betaAccess = undefined
  search.value = ''; apply()
}
function fmt(iso: string | null): string {
  return iso ? new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'
}
onMounted(apply)
</script>

<template>
  <div>
    <header class="page-head">
      <p class="adm-eyebrow">Domaine B</p>
      <h1 class="adm-title">Joueurs & comptes</h1>
    </header>

    <div class="filters">
      <input v-model="search" class="adm-input search" placeholder="Rechercher — email, displayName, uid" @keyup.enter="apply" />
      <select v-model="filters.status" class="adm-input" @change="apply">
        <option :value="undefined">Tous statuts</option>
        <option value="active">Actif</option>
        <option value="suspended">Suspendu</option>
        <option value="banned">Banni</option>
      </select>
      <select v-model="filters.betaAccess" class="adm-input" @change="apply">
        <option :value="undefined">Tout accès beta</option>
        <option value="none">none</option>
        <option value="waitlisted">waitlisted</option>
        <option value="invited">invited</option>
        <option value="granted">granted</option>
      </select>
      <button class="adm-btn adm-btn--ghost" @click="reset">Réinitialiser</button>
    </div>

    <div class="adm-card panel">
      <div v-if="loading" class="adm-state"><div class="adm-spinner" /> Chargement…</div>
      <div v-else-if="error" class="adm-state adm-state--error">{{ error }}</div>
      <div v-else-if="users.length === 0" class="adm-state"><span class="empty-icon">◆</span> Aucun utilisateur.</div>

      <table v-else class="adm-table">
        <thead>
          <tr><th>Statut</th><th>Utilisateur</th><th>Rôle</th><th>Beta</th><th>Dernière activité</th></tr>
        </thead>
        <tbody>
          <tr v-for="u in users" :key="u.uid" class="clickable" @click="router.push(`/admin/users/${u.uid}`)">
            <td><span class="adm-chip" :class="statusChip[u.status]">{{ u.status }}</span></td>
            <td>
              <div class="u">
                <span class="uname">{{ u.displayName ?? u.email ?? (u.isAnonymous ? 'anonyme' : '—') }}</span>
                <span class="adm-mono muted">{{ u.uid.slice(0, 8) }}</span>
              </div>
            </td>
            <td><span v-if="u.role" class="adm-chip adm-chip--gold">{{ u.role }}</span><span v-else class="muted">—</span></td>
            <td><span class="adm-chip">{{ u.betaAccess }}</span></td>
            <td class="adm-mono nowrap">{{ fmt(u.lastSeenAt) }}</td>
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
.u { display: flex; flex-direction: column; gap: 1px; }
.uname { color: var(--adm-text); }
.muted { color: var(--adm-text-faint); }
.empty-icon { color: var(--adm-gold); font-size: 1.2rem; opacity: 0.5; }
</style>
