<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useAdminGamesStore } from '@/stores/adminGames'
import { useAuthStore } from '@/stores/auth'
import { useSpectate } from '@/composables/useSpectate'
import CopyButton from '@/components/admin/CopyButton.vue'

const route = useRoute()
const router = useRouter()
const store = useAdminGamesStore()
const auth = useAuthStore()
const { detail, loading, error } = storeToRefs(store)

const gameId = computed(() => String(route.params.gameId))
const selectedRoundId = ref<string | null>(null)

const isEmulator = import.meta.env.VITE_USE_EMULATOR === 'true'
const canForceEnd = computed(() => auth.can('games:force_end'))

const confirmText = ref('')
const opBusy = ref(false)
const opMsg = ref<string | null>(null)

async function load() {
  await store.fetchDetail(gameId.value)
  selectedRoundId.value = detail.value?.currentRoundId ?? detail.value?.rounds.at(-1)?.roundId ?? null
}
watch(gameId, load, { immediate: true })

const { round, logs, connected, board } = useSpectate(
  () => gameId.value,
  () => selectedRoundId.value,
)

const ZONE_ORDER = ['legend', 'champion', 'battlefield', 'base', 'hand', 'main_deck', 'runes_deck', 'runes', 'discard', 'banish', 'stack']
const ZONE_LABEL: Record<string, string> = {
  legend: 'Légende', champion: 'Champion', battlefield: 'Champ de bataille', base: 'Base',
  hand: 'Main', main_deck: 'Deck', runes_deck: 'Deck runes', runes: 'Runes',
  discard: 'Défausse', banish: 'Bannissement', stack: 'Pile',
}

function orderedZones(zones: Record<string, unknown>): string[] {
  const keys = Object.keys(zones)
  return keys.sort((a, b) => {
    const ia = ZONE_ORDER.indexOf(a); const ib = ZONE_ORDER.indexOf(b)
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib)
  })
}

function playerName(uid: string): string {
  return detail.value?.players.find(p => p.uid === uid)?.name ?? uid.slice(0, 6)
}

const failedImages = ref<Set<string>>(new Set())
function onImgError(cardId: string) {
  failedImages.value = new Set(failedImages.value).add(cardId)
}
function showImage(cardId: string, imageUrl: string): boolean {
  return !!imageUrl && !failedImages.value.has(cardId)
}

async function forceEnd() {
  opBusy.value = true; opMsg.value = null
  try {
    await store.forceEnd(gameId.value)
    opMsg.value = 'Partie terminée de force.'
    confirmText.value = ''
    selectedRoundId.value = detail.value?.currentRoundId ?? selectedRoundId.value
  } catch {
    opMsg.value = "Échec de l'opération."
  } finally {
    opBusy.value = false
  }
}
</script>

<template>
  <div>
    <button class="back" @click="router.push('/admin/games')">← Parties</button>

    <div v-if="loading && !detail" class="adm-state"><div class="adm-spinner" /> Chargement…</div>
    <div v-else-if="error" class="adm-state adm-state--error">{{ error }}</div>

    <template v-else-if="detail">
      <header class="head">
        <div>
          <p class="adm-eyebrow">Partie</p>
          <div class="title-row">
            <h1 class="adm-title">{{ detail.gameId.slice(0, 12) }}</h1>
            <CopyButton :value="detail.gameId" />
          </div>
        </div>
        <div class="head-meta">
          <span class="adm-chip" :class="detail.status === 'active' ? 'adm-chip--ok' : detail.status === 'abandoned' ? 'adm-chip--danger' : 'adm-chip'">{{ detail.status }}</span>
          <span class="adm-chip adm-chip--gold">{{ detail.mode }}</span>
          <span class="adm-chip">{{ detail.matchFormat }} · {{ detail.deckFormat }}</span>
          <span class="live" :class="{ on: connected }"><span class="dot" /> {{ connected ? 'LIVE' : '—' }}</span>
        </div>
      </header>

      <div class="cols">
        <!-- Colonne principale : board god view -->
        <section class="adm-card board">
          <div class="section-title">God view <span class="muted">· round courant révélé</span></div>

          <div v-if="round" class="round-meta">
            <span>Setup : <b>{{ round.setup }}</b></span>
            <span v-if="round.firstPlayerId">1er : <b>{{ playerName(round.firstPlayerId) }}</b></span>
            <span v-if="round.currentTurn">Tour {{ round.currentTurn.turn }} — <b>{{ playerName(round.currentTurn.playerId) }}</b></span>
            <span v-if="round.winnerId">Vainqueur : <b>{{ playerName(round.winnerId) }}</b></span>
          </div>

          <div v-if="!round" class="adm-state">En attente de l'état du round…</div>

          <div v-else class="players">
            <div v-for="(zones, uid) in board" :key="uid" class="player">
              <div class="player-head">
                <span class="pname">{{ playerName(uid) }}</span>
                <span v-if="round.players[uid]" class="score">score {{ round.players[uid].score }}</span>
              </div>
              <div v-for="z in orderedZones(zones)" :key="z" class="zone">
                <div class="zone-label">{{ ZONE_LABEL[z] ?? z }} <span class="muted">({{ zones[z].length }})</span></div>
                <div class="cards">
                  <div
                    v-for="entry in zones[z]"
                    :key="entry.card.cardId"
                    class="gcard"
                    :class="{ hiddenToPlayers: entry.card.state.visibleTo !== 'ALL' }"
                    :title="entry.card.state.visibleTo !== 'ALL' ? 'Caché aux joueurs' : entry.card.description.name"
                  >
                    <div class="gcard-art" :data-type="entry.card.description.type">
                      <img
                        v-if="showImage(entry.card.cardId, entry.card.description.imageUrl)"
                        :src="entry.card.description.imageUrl"
                        :alt="entry.card.description.name"
                        loading="lazy"
                        @error="onImgError(entry.card.cardId)"
                      />
                      <span v-else class="gcard-type">{{ entry.card.description.type }}</span>
                      <span v-if="entry.card.state.visibleTo !== 'ALL'" class="gcard-lock" title="Caché aux joueurs">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 018 0v3" stroke-linecap="round"/></svg>
                      </span>
                    </div>
                    <span class="gcard-name">{{ entry.card.description.name }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- Colonne latérale -->
        <aside class="side">
          <div class="adm-card block">
            <div class="section-title">Joueurs & decks</div>
            <ul class="plist">
              <li v-for="p in detail.players" :key="p.uid">
                <span class="pname">{{ p.name }}</span>
                <span class="adm-mono muted">{{ p.uid.slice(0, 6) }}</span>
                <span v-if="p.teamId" class="adm-chip">team {{ p.teamId }}</span>
                <span v-if="round?.players[p.uid]?.deckList" class="adm-chip adm-chip--ok">deck ✓</span>
              </li>
            </ul>
          </div>

          <div class="adm-card block">
            <div class="section-title">Timeline des rounds</div>
            <ul class="rounds">
              <li
                v-for="r in detail.rounds"
                :key="r.roundId"
                class="round-row"
                :class="{ active: r.roundId === selectedRoundId }"
                @click="selectedRoundId = r.roundId"
              >
                <span>R{{ r.round }}</span>
                <span class="adm-chip">{{ r.setup }}</span>
                <span v-if="r.winnerId" class="muted">→ {{ playerName(r.winnerId).slice(0, 8) }}</span>
                <span v-if="r.endedAt" class="adm-chip adm-chip--ok">fini</span>
              </li>
            </ul>
          </div>

          <div class="adm-card block">
            <div class="section-title">Logs système</div>
            <ul class="logs">
              <li v-for="l in logs" :key="l.logId">{{ l.description }}</li>
              <li v-if="logs.length === 0" class="muted">Aucun log.</li>
            </ul>
          </div>

          <!-- Ops auditées -->
          <div v-if="canForceEnd && detail.status === 'active'" class="adm-card block danger-block">
            <div class="section-title">Ops</div>
            <p class="op-hint">Force-end abandonne la partie (audité). Tape le gameId pour confirmer.</p>
            <input v-model="confirmText" class="adm-input" :placeholder="detail.gameId" />
            <button
              class="adm-btn danger-btn"
              :disabled="opBusy || confirmText.trim() !== detail.gameId"
              @click="forceEnd"
            >
              {{ opBusy ? '…' : 'Terminer de force' }}
            </button>
            <p v-if="!isEmulator" class="prod-warn">⚠ Environnement PRODUCTION</p>
            <p v-if="opMsg" class="op-msg">{{ opMsg }}</p>
          </div>
        </aside>
      </div>
    </template>
  </div>
</template>

<style scoped>
.back { background: none; border: none; color: var(--adm-text-dim); cursor: pointer; font-size: 0.85rem; margin-bottom: 1rem; padding: 0; }
.back:hover { color: var(--adm-gold); }
.head { display: flex; align-items: flex-end; justify-content: space-between; gap: 1rem; margin-bottom: 1.5rem; flex-wrap: wrap; }
.head .adm-eyebrow { margin-bottom: 0.3rem; }
.head-meta { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
.live { display: inline-flex; align-items: center; gap: 0.35rem; font-size: 0.66rem; font-weight: 700; letter-spacing: 0.1em; color: var(--adm-text-faint); }
.live.on { color: var(--adm-ok); }
.live .dot { width: 7px; height: 7px; border-radius: 50%; background: currentColor; box-shadow: 0 0 8px currentColor; }
.cols { display: grid; grid-template-columns: minmax(0, 1fr) 320px; gap: 1.25rem; align-items: start; }
.section-title { font-size: 0.7rem; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: var(--adm-text-dim); margin-bottom: 0.9rem; }
.muted { color: var(--adm-text-faint); font-weight: 400; }
.board { padding: 1.4rem; }
.round-meta { display: flex; gap: 1.1rem; flex-wrap: wrap; font-size: 0.82rem; color: var(--adm-text-dim); margin-bottom: 1.2rem; }
.round-meta b { color: var(--adm-text); }
.players { display: flex; flex-direction: column; gap: 1.2rem; }
.player { border: 1px solid var(--adm-border); border-radius: 10px; padding: 0.9rem 1rem; }
.player-head { display: flex; justify-content: space-between; margin-bottom: 0.7rem; }
.pname { color: var(--adm-gold); font-weight: 600; font-size: 0.9rem; }
.score { color: var(--adm-text-dim); font-size: 0.78rem; }
.zone { margin-bottom: 0.6rem; }
.zone-label { font-size: 0.68rem; color: var(--adm-text-dim); margin-bottom: 0.3rem; }
.cards { display: flex; flex-wrap: wrap; gap: 0.5rem; }
.gcard { width: 60px; display: flex; flex-direction: column; gap: 0.25rem; }
.gcard-art {
  position: relative;
  width: 60px; height: 84px;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid var(--adm-border);
  background: linear-gradient(160deg, #14202f, #0a121d);
  display: flex; align-items: center; justify-content: center;
}
.gcard-art img { width: 100%; height: 100%; object-fit: cover; display: block; }
.gcard.hiddenToPlayers .gcard-art { border-style: dashed; border-color: rgba(200,170,110,0.45); }
.gcard-type {
  font-size: 0.56rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase;
  color: var(--adm-text-faint); text-align: center; padding: 0 2px;
}
/* Teinte de placeholder par type de carte */
.gcard-art[data-type="legend"] { background: linear-gradient(160deg, #2a2233, #140e1c); }
.gcard-art[data-type="champion"] { background: linear-gradient(160deg, #2a2418, #161109); }
.gcard-art[data-type="spell"] { background: linear-gradient(160deg, #16263a, #0a141f); }
.gcard-art[data-type="unit"] { background: linear-gradient(160deg, #1b2e23, #0c1812); }
.gcard-art[data-type="battlefield"] { background: linear-gradient(160deg, #2e2418, #16100a); }
.gcard-lock {
  position: absolute; top: 3px; right: 3px;
  width: 16px; height: 16px; border-radius: 4px;
  background: rgba(6,10,18,0.75); color: var(--adm-gold);
  display: flex; align-items: center; justify-content: center;
}
.gcard-lock svg { width: 10px; height: 10px; }
.gcard-name {
  font-size: 0.66rem; color: var(--adm-text-dim); line-height: 1.2;
  overflow: hidden; text-overflow: ellipsis; display: -webkit-box;
  -webkit-line-clamp: 2; -webkit-box-orient: vertical;
}
.title-row { display: flex; align-items: center; gap: 0.6rem; }
.side { display: flex; flex-direction: column; gap: 1rem; }
.block { padding: 1.1rem 1.2rem; }
.plist, .rounds, .logs { list-style: none; margin: 0; padding: 0; }
.plist li { display: flex; align-items: center; gap: 0.5rem; padding: 0.35rem 0; font-size: 0.82rem; }
.rounds .round-row { display: flex; align-items: center; gap: 0.5rem; padding: 0.4rem 0.5rem; border-radius: 6px; cursor: pointer; font-size: 0.8rem; }
.rounds .round-row:hover { background: rgba(200,170,110,0.05); }
.rounds .round-row.active { background: rgba(200,170,110,0.1); }
.logs li { font-size: 0.78rem; color: var(--adm-text-dim); padding: 0.2rem 0; border-bottom: 1px solid rgba(27,36,53,0.5); }
.danger-block { border-color: rgba(255,107,107,0.3); }
.op-hint { font-size: 0.78rem; color: var(--adm-text-dim); margin: 0 0 0.7rem; line-height: 1.5; }
.danger-btn { width: 100%; margin-top: 0.6rem; background: rgba(255,107,107,0.12); border: 1px solid rgba(255,107,107,0.4); color: var(--adm-danger); }
.danger-btn:not(:disabled):hover { background: rgba(255,107,107,0.2); }
.danger-btn:disabled { opacity: 0.4; cursor: default; }
.prod-warn { color: var(--adm-danger); font-size: 0.72rem; margin: 0.6rem 0 0; font-weight: 700; }
.op-msg { color: var(--adm-ok); font-size: 0.8rem; margin: 0.6rem 0 0; }
@media (max-width: 1100px) { .cols { grid-template-columns: 1fr; } }
</style>
