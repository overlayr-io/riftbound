<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { FeatureFlag, MaintenanceState, SeedResult } from '@riftbound/shared'
import { adminOpsApi } from '@/services/adminOpsApi'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const isEmulator = import.meta.env.VITE_USE_EMULATOR === 'true'
const canFlags = computed(() => auth.can('ops:feature_flags'))
const canMaint = computed(() => auth.can('ops:maintenance_mode'))
const canSeed = computed(() => auth.can('ops:seed_data'))

const flags = ref<FeatureFlag[]>([])
const maint = ref<MaintenanceState | null>(null)
const seedResult = ref<SeedResult | null>(null)
const msg = ref<string | null>(null)
const newFlag = ref({ key: '', enabled: true, rolloutPercent: 100, description: '' })

async function load() {
  if (canFlags.value) flags.value = await adminOpsApi.listFlags().catch(() => [])
  if (canMaint.value) maint.value = await adminOpsApi.getMaintenance().catch(() => null)
}
async function saveFlag(f: FeatureFlag) { await adminOpsApi.upsertFlag(f); flags.value = await adminOpsApi.listFlags() }
async function addFlag() {
  if (!newFlag.value.key) return
  await adminOpsApi.upsertFlag({ ...newFlag.value })
  newFlag.value = { key: '', enabled: true, rolloutPercent: 100, description: '' }
  flags.value = await adminOpsApi.listFlags()
}
async function delFlag(key: string) { await adminOpsApi.deleteFlag(key); flags.value = await adminOpsApi.listFlags() }

async function saveMaintenance() {
  if (!maint.value) return
  maint.value = await adminOpsApi.setMaintenance({ enabled: maint.value.enabled, message: maint.value.message, allowRoles: maint.value.allowRoles })
  msg.value = maint.value.enabled ? '⚠ Maintenance ACTIVÉE' : 'Maintenance désactivée'
}
async function runSeed() {
  msg.value = null
  try { seedResult.value = await adminOpsApi.seed(); msg.value = 'Seed généré.' }
  catch { msg.value = 'Seed refusé (production ?).' }
}

onMounted(load)
</script>

<template>
  <div>
    <header class="page-head">
      <p class="adm-eyebrow">Domaine D · ops</p>
      <h1 class="adm-title">Ops & configuration</h1>
    </header>

    <p v-if="msg" class="flash">{{ msg }}</p>

    <!-- Feature flags -->
    <div v-if="canFlags" class="adm-card block">
      <div class="section-title">Feature flags</div>
      <table v-if="flags.length" class="adm-table">
        <thead><tr><th>Clé</th><th>Activé</th><th>Rollout %</th><th>Description</th><th></th></tr></thead>
        <tbody>
          <tr v-for="f in flags" :key="f.key">
            <td class="adm-mono">{{ f.key }}</td>
            <td><input type="checkbox" v-model="f.enabled" @change="saveFlag(f)" /></td>
            <td><input v-model.number="f.rolloutPercent" type="number" min="0" max="100" class="adm-input mini-input" @change="saveFlag(f)" /></td>
            <td class="muted">{{ f.description }}</td>
            <td><button class="adm-btn danger-btn mini" @click="delFlag(f.key)">Suppr.</button></td>
          </tr>
        </tbody>
      </table>
      <p v-else class="muted">Aucun flag.</p>
      <div class="form">
        <input v-model="newFlag.key" class="adm-input" placeholder="clé (ex. new_board)" />
        <input v-model.number="newFlag.rolloutPercent" type="number" min="0" max="100" class="adm-input mini-input" />
        <input v-model="newFlag.description" class="adm-input grow" placeholder="description" />
        <button class="adm-btn adm-btn--primary" :disabled="!newFlag.key" @click="addFlag">Ajouter</button>
      </div>
    </div>

    <!-- Maintenance -->
    <div v-if="canMaint && maint" class="adm-card block" :class="{ danger: maint.enabled }">
      <div class="section-title">Mode maintenance</div>
      <label class="toggle"><input type="checkbox" v-model="maint.enabled" /> Activer (l'API joueur renverra 503)</label>
      <input v-model="maint.message" class="adm-input grow" placeholder="Message affiché aux joueurs" />
      <p class="hint">Rôles autorisés à contourner : {{ maint.allowRoles.join(', ') }}</p>
      <button class="adm-btn adm-btn--primary" @click="saveMaintenance">Enregistrer</button>
      <p v-if="!isEmulator" class="prod-warn">⚠ PRODUCTION — impactera les vrais joueurs</p>
    </div>

    <!-- Seed -->
    <div v-if="canSeed" class="adm-card block">
      <div class="section-title">Données de test <span class="muted">· NON-PROD uniquement</span></div>
      <p class="hint">Génère faux utilisateurs, invitations, lobby et parties. Bloqué côté serveur si <code>NODE_ENV=production</code>.</p>
      <button class="adm-btn adm-btn--ghost" :disabled="!isEmulator" @click="runSeed">Générer des données</button>
      <p v-if="seedResult" class="muted">→ {{ seedResult.users }} users · {{ seedResult.invites }} invites · {{ seedResult.lobbies }} lobbies · {{ seedResult.games }} games</p>
    </div>
  </div>
</template>

<style scoped>
.page-head { margin-bottom: 1.5rem; }
.page-head .adm-eyebrow { margin-bottom: 0.35rem; }
.block { padding: 1.35rem 1.5rem; margin-bottom: 1.25rem; }
.block.danger { border-color: rgba(255,107,107,0.4); }
.section-title { font-size: 0.7rem; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: var(--adm-text-dim); margin-bottom: 0.9rem; }
.muted { color: var(--adm-text-faint); font-weight: 400; }
.hint { color: var(--adm-text-dim); font-size: 0.82rem; margin: 0.5rem 0; }
code { background: var(--adm-raise); padding: 0.05rem 0.3rem; border-radius: 4px; color: var(--adm-gold); }
.form { display: flex; gap: 0.5rem; align-items: center; margin-top: 1rem; flex-wrap: wrap; }
.form .grow, .grow { flex: 1; min-width: 200px; }
.mini-input { width: 80px; }
.mini { padding: 0.3rem 0.55rem; font-size: 0.74rem; }
.toggle { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.8rem; color: var(--adm-text); }
.block .adm-input { margin-bottom: 0.8rem; }
.flash { color: var(--adm-gold); margin-bottom: 1rem; font-size: 0.85rem; }
.prod-warn { color: var(--adm-danger); font-weight: 700; font-size: 0.78rem; margin-top: 0.6rem; }
.danger-btn { background: rgba(255,107,107,0.12); border: 1px solid rgba(255,107,107,0.4); color: var(--adm-danger); }
</style>
