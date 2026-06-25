<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import type { BetaPhase } from '@riftbound/shared'
import { useAdminBetaStore } from '@/stores/adminBeta'
import { useAuthStore } from '@/stores/auth'
import CopyButton from '@/components/admin/CopyButton.vue'

const store = useAdminBetaStore()
const auth = useAuthStore()
const { settings, invites, waitlist, loading, error } = storeToRefs(store)

const isSuper = computed(() => auth.role === 'super_admin')
const canInvites = computed(() => auth.can('beta:invite_manage'))
const canWaitlist = computed(() => auth.can('beta:waitlist_decide'))

const phases: { key: BetaPhase; label: string; desc: string }[] = [
  { key: 'beta_closed', label: 'Beta fermée', desc: 'Invitation requise' },
  { key: 'beta_open', label: 'Beta ouverte', desc: 'Waitlist' },
  { key: 'public', label: 'Public', desc: 'Inscription libre' },
]

const newMaxUses = ref(1)
const newExpires = ref('')
const selected = ref<Set<string>>(new Set())
const busy = ref(false)

onMounted(store.loadAll)

async function setPhase(p: BetaPhase) {
  busy.value = true
  try { await store.setPhase(p) } finally { busy.value = false }
}
async function createInvite() {
  busy.value = true
  try { await store.createInvite(newMaxUses.value, newExpires.value || null) }
  finally { busy.value = false }
}
function toggle(id: string) {
  const s = new Set(selected.value)
  s.has(id) ? s.delete(id) : s.add(id)
  selected.value = s
}
async function decide(status: 'approved' | 'rejected') {
  if (selected.value.size === 0) return
  busy.value = true
  try { await store.decide([...selected.value], status); selected.value = new Set() }
  finally { busy.value = false }
}
function inviteLink(code: string): string {
  return `${window.location.origin}/welcome?code=${code}`
}
function fmt(iso: string | null): string {
  return iso ? new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'
}
const pendingCount = computed(() => waitlist.value.filter(w => w.status === 'pending').length)
</script>

<template>
  <div>
    <header class="page-head">
      <p class="adm-eyebrow">Domaine B</p>
      <h1 class="adm-title">Accès beta</h1>
    </header>

    <div v-if="error" class="adm-state adm-state--error">{{ error }}</div>

    <!-- Phase -->
    <div class="adm-card block">
      <div class="section-title">Phase d'accès <span class="muted">· {{ settings?.phase ?? '…' }}</span></div>
      <div class="phases">
        <button
          v-for="p in phases" :key="p.key"
          class="phase" :class="{ active: settings?.phase === p.key }"
          :disabled="busy || !isSuper"
          @click="setPhase(p.key)"
        >
          <span class="phase-label">{{ p.label }}</span>
          <span class="phase-desc">{{ p.desc }}</span>
        </button>
      </div>
      <p v-if="!isSuper" class="hint">Bascule réservée au super_admin.</p>
    </div>

    <!-- Invitations -->
    <div v-if="canInvites" class="adm-card block">
      <div class="section-title">Invitations</div>
      <div class="invite-form">
        <label class="adm-label">Usages max <input v-model.number="newMaxUses" class="adm-input" type="number" min="1" /></label>
        <label class="adm-label">Expire le (option) <input v-model="newExpires" class="adm-input" type="datetime-local" /></label>
        <button class="adm-btn adm-btn--primary" :disabled="busy" @click="createInvite">Générer un code</button>
      </div>

      <table v-if="invites.length" class="adm-table">
        <thead><tr><th>Code</th><th>Usages</th><th>Statut</th><th>Lien</th><th>Expire</th><th></th></tr></thead>
        <tbody>
          <tr v-for="i in invites" :key="i.code">
            <td class="adm-mono"><span class="code">{{ i.code }}</span><CopyButton :value="i.code" /></td>
            <td>{{ i.uses }} / {{ i.maxUses }}</td>
            <td><span class="adm-chip" :class="i.status === 'active' ? 'adm-chip--ok' : 'adm-chip--danger'">{{ i.status }}</span></td>
            <td><CopyButton :value="inviteLink(i.code)" /> <span class="muted small">lien</span></td>
            <td class="adm-mono nowrap">{{ fmt(i.expiresAt) }}</td>
            <td><button v-if="i.status === 'active'" class="adm-btn adm-btn--ghost mini" :disabled="busy" @click="store.revokeInvite(i.code)">Révoquer</button></td>
          </tr>
        </tbody>
      </table>
      <p v-else class="muted">Aucune invitation.</p>
    </div>

    <!-- Waitlist -->
    <div v-if="canWaitlist" class="adm-card block">
      <div class="section-title">Waitlist <span class="muted">· {{ pendingCount }} en attente</span></div>
      <div class="bulk">
        <span class="muted">{{ selected.size }} sélectionné(s)</span>
        <button class="adm-btn adm-btn--ghost mini" :disabled="busy || selected.size === 0" @click="decide('approved')">Approuver</button>
        <button class="adm-btn danger-btn mini" :disabled="busy || selected.size === 0" @click="decide('rejected')">Refuser</button>
      </div>
      <table v-if="waitlist.length" class="adm-table">
        <thead><tr><th></th><th>Email</th><th>Statut</th><th>Source</th><th>Demandé le</th></tr></thead>
        <tbody>
          <tr v-for="w in waitlist" :key="w.id">
            <td><input type="checkbox" :checked="selected.has(w.id)" :disabled="w.status !== 'pending'" @change="toggle(w.id)" /></td>
            <td>{{ w.email }}</td>
            <td><span class="adm-chip" :class="w.status === 'approved' ? 'adm-chip--ok' : w.status === 'rejected' ? 'adm-chip--danger' : 'adm-chip--gold'">{{ w.status }}</span></td>
            <td class="muted">{{ w.source }}</td>
            <td class="adm-mono nowrap">{{ fmt(w.requestedAt) }}</td>
          </tr>
        </tbody>
      </table>
      <p v-else class="muted">Waitlist vide.</p>
    </div>

    <div v-if="loading" class="adm-state"><div class="adm-spinner" /> Chargement…</div>
  </div>
</template>

<style scoped>
.page-head { margin-bottom: 1.5rem; }
.page-head .adm-eyebrow { margin-bottom: 0.35rem; }
.block { padding: 1.35rem 1.5rem; margin-bottom: 1.25rem; }
.section-title { font-size: 0.7rem; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: var(--adm-text-dim); margin-bottom: 1rem; }
.muted { color: var(--adm-text-faint); font-weight: 400; }
.small { font-size: 0.7rem; }
.phases { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.7rem; }
.phase { display: flex; flex-direction: column; gap: 0.25rem; padding: 0.9rem 1rem; border-radius: 10px; cursor: pointer; text-align: left; background: var(--adm-raise); border: 1px solid var(--adm-border); color: var(--adm-text); }
.phase:hover:not(:disabled) { border-color: var(--adm-border-gold); }
.phase.active { border-color: var(--adm-gold); background: rgba(200,170,110,0.08); }
.phase:disabled { opacity: 0.55; cursor: default; }
.phase-label { font-weight: 600; }
.phase-desc { font-size: 0.75rem; color: var(--adm-text-dim); }
.hint { margin-top: 0.7rem; font-size: 0.78rem; color: var(--adm-text-faint); }
.invite-form { display: flex; gap: 0.75rem; align-items: flex-end; flex-wrap: wrap; margin-bottom: 1.25rem; }
.invite-form .adm-label { flex: 0 1 auto; }
.code { font-weight: 700; color: var(--adm-gold); margin-right: 0.4rem; }
.nowrap { white-space: nowrap; }
.mini { padding: 0.35rem 0.6rem; font-size: 0.76rem; }
.bulk { display: flex; align-items: center; gap: 0.6rem; margin-bottom: 0.9rem; }
.danger-btn { background: rgba(255,107,107,0.12); border: 1px solid rgba(255,107,107,0.4); color: var(--adm-danger); }
</style>
