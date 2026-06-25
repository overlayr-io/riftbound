<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { SUSPENSION_PRESETS } from '@riftbound/shared'
import { useAdminUsersStore } from '@/stores/adminUsers'
import { useAuthStore } from '@/stores/auth'
import { adminUsersApi } from '@/services/adminUsersApi'

const route = useRoute()
const router = useRouter()
const store = useAdminUsersStore()
const auth = useAuthStore()
const { detail, loading, error } = storeToRefs(store)

const uid = computed(() => String(route.params.uid))
watch(uid, () => store.fetchDetail(uid.value), { immediate: true })

const busy = ref(false)
const msg = ref<string | null>(null)
const isError = ref(false)

const reason = ref('')
const customMs = ref<number | null>(null)
const newName = ref('')
const confirmHardDelete = ref('')

async function run(fn: () => Promise<unknown>, ok: string) {
  busy.value = true; msg.value = null; isError.value = false
  try { await fn(); await store.fetchDetail(uid.value); msg.value = ok }
  catch { isError.value = true; msg.value = "Échec de l'opération." }
  finally { busy.value = false }
}

const suspend = (ms: number) => run(() => adminUsersApi.suspend(uid.value, ms, reason.value), 'Joueur suspendu.')
const ban = () => run(() => adminUsersApi.ban(uid.value, reason.value), 'Joueur banni.')
const reactivate = () => run(() => adminUsersApi.reactivate(uid.value), 'Compte réactivé.')
const resetName = () => run(() => adminUsersApi.resetDisplayName(uid.value, newName.value), 'Nom réinitialisé.')
const forceLogout = () => run(() => adminUsersApi.forceLogout(uid.value), 'Déconnexion forcée.')
const softDelete = () => run(() => adminUsersApi.softDelete(uid.value), 'Compte soft-delete.')
const hardDelete = () => run(async () => { await adminUsersApi.hardDelete(uid.value); router.push('/admin/users') }, 'Compte supprimé.')

async function impersonate() {
  busy.value = true
  try {
    const { token } = await adminUsersApi.impersonate(uid.value)
    window.open(`/?impersonate=${encodeURIComponent(token)}`, '_blank')
    msg.value = 'Session ouverte dans un nouvel onglet.'
  } catch { isError.value = true; msg.value = 'Impersonation refusée.' }
  finally { busy.value = false }
}

function fmt(iso: string | null): string {
  return iso ? new Date(iso).toLocaleString('fr-FR') : '—'
}
</script>

<template>
  <div>
    <button class="back" @click="router.push('/admin/users')">← Joueurs</button>

    <div v-if="loading && !detail" class="adm-state"><div class="adm-spinner" /> Chargement…</div>
    <div v-else-if="error" class="adm-state adm-state--error">{{ error }}</div>

    <template v-else-if="detail">
      <header class="head">
        <div>
          <p class="adm-eyebrow">Joueur</p>
          <h1 class="adm-title">{{ detail.displayName ?? detail.email ?? detail.uid.slice(0, 10) }}</h1>
        </div>
        <div class="chips">
          <span class="adm-chip" :class="detail.status === 'active' ? 'adm-chip--ok' : detail.status === 'banned' ? 'adm-chip--danger' : 'adm-chip--gold'">{{ detail.status }}</span>
          <span v-if="detail.role" class="adm-chip adm-chip--gold">{{ detail.role }}</span>
          <span class="adm-chip">beta: {{ detail.betaAccess }}</span>
        </div>
      </header>

      <div class="cols">
        <div class="main-col">
          <div class="adm-card block">
            <div class="section-title">Profil</div>
            <dl class="kv">
              <div><dt>UID</dt><dd class="adm-mono">{{ detail.uid }}</dd></div>
              <div><dt>Email</dt><dd>{{ detail.email ?? '—' }}</dd></div>
              <div><dt>Anonyme</dt><dd>{{ detail.isAnonymous ? 'oui' : 'non' }}</dd></div>
              <div><dt>Créé le</dt><dd>{{ fmt(detail.createdAt) }}</dd></div>
              <div><dt>Vu le</dt><dd>{{ fmt(detail.lastSeenAt) }}</dd></div>
              <div v-if="detail.suspendedUntil"><dt>Suspendu jusqu'au</dt><dd>{{ fmt(detail.suspendedUntil) }}</dd></div>
              <div v-if="detail.suspendReason"><dt>Raison</dt><dd>{{ detail.suspendReason }}</dd></div>
            </dl>
          </div>

          <div class="adm-card block">
            <div class="section-title">Sessions & appareil</div>
            <dl class="kv">
              <div><dt>Provider</dt><dd>{{ detail.session.provider }}</dd></div>
              <div><dt>Dernière connexion</dt><dd>{{ fmt(detail.session.lastSignInAt) }}</dd></div>
              <div><dt>Dernier refresh</dt><dd>{{ fmt(detail.session.lastRefreshAt) }}</dd></div>
            </dl>
          </div>

          <div class="adm-card block">
            <div class="section-title">Historique de parties ({{ detail.games.length }})</div>
            <ul v-if="detail.games.length" class="games">
              <li v-for="g in detail.games" :key="g.gameId" @click="router.push(`/admin/games/${g.gameId}`)">
                <span class="adm-chip" :class="g.status === 'active' ? 'adm-chip--ok' : g.status === 'abandoned' ? 'adm-chip--danger' : 'adm-chip'">{{ g.status }}</span>
                <span class="adm-mono">{{ g.gameId.slice(0, 8) }}</span>
                <span class="muted">{{ g.mode }} · {{ g.matchFormat }}</span>
              </li>
            </ul>
            <p v-else class="muted">Aucune partie.</p>
          </div>
        </div>

        <aside class="side">
          <div class="adm-card block mod">
            <div class="section-title">Modération</div>

            <label class="adm-label">Raison (suspension/ban)
              <input v-model="reason" class="adm-input" placeholder="motif…" />
            </label>

            <div class="subhead">Suspension</div>
            <div class="presets">
              <button
                v-for="p in SUSPENSION_PRESETS" :key="p.ms"
                class="adm-btn adm-btn--ghost mini"
                :disabled="busy || !auth.can('players:suspend')"
                @click="suspend(p.ms)"
              >{{ p.label }}</button>
            </div>
            <div class="custom-row">
              <input v-model.number="customMs" class="adm-input" type="number" placeholder="ms custom" />
              <button class="adm-btn adm-btn--ghost mini" :disabled="busy || !customMs || !auth.can('players:suspend')" @click="suspend(customMs!)">Appliquer</button>
            </div>

            <div class="actions">
              <button class="adm-btn adm-btn--ghost" :disabled="busy || !auth.can('players:suspend')" @click="reactivate">Réactiver</button>
              <button class="adm-btn adm-btn--ghost" :disabled="busy || !auth.can('players:suspend')" @click="forceLogout">Forcer logout</button>
              <button class="adm-btn danger-btn" :disabled="busy || !auth.can('players:ban')" @click="ban">Bannir</button>
            </div>

            <div class="subhead">Nom d'affichage</div>
            <div class="custom-row">
              <input v-model="newName" class="adm-input" placeholder="nouveau nom" />
              <button class="adm-btn adm-btn--ghost mini" :disabled="busy || !newName || !auth.can('players:suspend')" @click="resetName">Reset</button>
            </div>

            <div class="subhead">Suppression</div>
            <button class="adm-btn danger-btn full" :disabled="busy || !auth.can('players:ban')" @click="softDelete">Soft-delete (réversible)</button>
            <template v-if="auth.can('players:delete')">
              <input v-model="confirmHardDelete" class="adm-input danger-input" :placeholder="`tape ${detail.uid.slice(0,8)} pour hard-delete`" />
              <button class="adm-btn danger-btn full" :disabled="busy || confirmHardDelete !== detail.uid.slice(0,8)" @click="hardDelete">Hard-delete (définitif)</button>
            </template>

            <div v-if="auth.can('players:impersonate')" class="subhead">Debug</div>
            <button v-if="auth.can('players:impersonate')" class="adm-btn adm-btn--ghost full" :disabled="busy" @click="impersonate">👁 Voir comme ce joueur</button>

            <p v-if="msg" class="msg" :class="{ error: isError }">{{ msg }}</p>
          </div>
        </aside>
      </div>
    </template>
  </div>
</template>

<style scoped>
.back { background: none; border: none; color: var(--adm-text-dim); cursor: pointer; font-size: 0.85rem; margin-bottom: 1rem; padding: 0; }
.back:hover { color: var(--adm-gold); }
.head { display: flex; justify-content: space-between; align-items: flex-end; gap: 1rem; margin-bottom: 1.5rem; flex-wrap: wrap; }
.head .adm-eyebrow { margin-bottom: 0.3rem; }
.chips { display: flex; gap: 0.5rem; flex-wrap: wrap; }
.cols { display: grid; grid-template-columns: minmax(0, 1fr) 320px; gap: 1.25rem; align-items: start; }
.main-col { display: flex; flex-direction: column; gap: 1rem; }
.block { padding: 1.2rem 1.35rem; }
.section-title { font-size: 0.7rem; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: var(--adm-text-dim); margin-bottom: 1rem; }
.kv { margin: 0; display: flex; flex-direction: column; gap: 0.55rem; }
.kv div { display: flex; justify-content: space-between; gap: 1rem; font-size: 0.85rem; }
.kv dt { color: var(--adm-text-dim); margin: 0; }
.kv dd { margin: 0; color: var(--adm-text); text-align: right; word-break: break-all; }
.muted { color: var(--adm-text-faint); }
.games { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.4rem; }
.games li { display: flex; align-items: center; gap: 0.6rem; font-size: 0.82rem; cursor: pointer; padding: 0.3rem 0.4rem; border-radius: 6px; }
.games li:hover { background: rgba(200,170,110,0.05); }
.side { position: sticky; top: 0; }
.mod { display: flex; flex-direction: column; gap: 0.7rem; }
.subhead { font-size: 0.7rem; color: var(--adm-text-faint); text-transform: uppercase; letter-spacing: 0.08em; margin-top: 0.4rem; }
.presets { display: grid; grid-template-columns: 1fr 1fr; gap: 0.4rem; }
.custom-row { display: flex; gap: 0.4rem; }
.custom-row .adm-input { flex: 1; min-width: 0; }
.mini { padding: 0.4rem 0.6rem; font-size: 0.78rem; }
.actions { display: flex; gap: 0.4rem; flex-wrap: wrap; }
.actions .adm-btn { flex: 1; }
.full { width: 100%; }
.danger-btn { background: rgba(255,107,107,0.12); border: 1px solid rgba(255,107,107,0.4); color: var(--adm-danger); }
.danger-btn:not(:disabled):hover { background: rgba(255,107,107,0.2); }
.danger-input { border-color: rgba(255,107,107,0.3); }
.msg { margin-top: 0.5rem; color: var(--adm-ok); font-size: 0.82rem; }
.msg.error { color: var(--adm-danger); }
@media (max-width: 1100px) { .cols { grid-template-columns: 1fr; } }
</style>
