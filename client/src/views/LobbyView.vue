<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import type { GameMode, GameDeckFormat, GameMatchFormat } from '@riftbound/shared'
import { useAuthStore } from '@/stores/auth'
import { useLobbyStore } from '@/stores/lobby'
import GameCard from '@/components/GameCard.vue'
import TabBar from '@/components/TabBar.vue'
import SelectCard from '@/components/SelectCard.vue'
import ActionButton from '@/components/ActionButton.vue'

const router = useRouter()
const authStore = useAuthStore()
const lobbyStore = useLobbyStore()

// ── Tabs ──────────────────────────────────────────────────────────────────
type TabId = 'matchmaking' | 'create' | 'join'
const TABS: { id: TabId; label: string }[] = [
  { id: 'matchmaking', label: 'MATCHMAKING' },
  { id: 'create', label: 'CRÉER' },
  { id: 'join', label: 'REJOINDRE' },
]
const activeTab = ref<TabId>('matchmaking')

// ── Game mode options ──────────────────────────────────────────────────────
const MODES: { value: GameMode; label: string; desc: string; soon: boolean }[] = [
  { value: 'dual', label: 'Duel', desc: '1 contre 1', soon: false },
  { value: '2v2', label: '2V2', desc: 'Équipes de 2', soon: true },
  { value: 'FFA', label: 'FFA', desc: 'Chacun pour soi', soon: true },
]

// ── Match format options (BO1 only available, BO3 soon, no BO5) ──────────
const MATCH_FORMATS: { value: GameMatchFormat; label: string; desc: string; soon: boolean }[] = [
  { value: 'BO1', label: 'BO1', desc: 'Manche unique', soon: false },
  { value: 'BO3', label: 'BO3', desc: 'Meilleur des 3', soon: true },
]
const matchFormat = 'BO1' as GameMatchFormat

// ── Deck format options ────────────────────────────────────────────────────
// Matchmaking: constructed (available), sealed + learn_to_play (soon), + ANY
const DECK_FORMATS_MM: { value: GameDeckFormat | 'ANY'; label: string; desc: string; soon?: boolean }[] = [
  { value: 'constructed', label: 'Construit', desc: 'Deck personnel' },
  { value: 'sealed', label: 'Scellé', desc: 'Boosters', soon: true },
  { value: 'learn_to_play', label: 'Apprendre', desc: 'Deck de démarrage', soon: true },
]
// Create: constructed (available), sealed + learn_to_play (soon), no ANY
const DECK_FORMATS_CREATE: { value: GameDeckFormat; label: string; desc: string; soon?: boolean }[] = [
  { value: 'constructed', label: 'Construit', desc: 'Deck personnel' },
  { value: 'sealed', label: 'Scellé', desc: 'Boosters', soon: true },
  { value: 'learn_to_play', label: 'Apprendre', desc: 'Deck de démarrage', soon: true },
]

// ── Form state ────────────────────────────────────────────────────────────
const gameMode = ref<GameMode>('dual')
const deckFormatMM = ref<GameDeckFormat | 'ANY'>('constructed')
const deckFormatCreate = ref<GameDeckFormat>('constructed')
const roomCodeInput = ref('')

// ── Matchmaking state ──────────────────────────────────────────────────────
const isSearching = ref(false)
const gameFound = ref(false)
const elapsedSeconds = ref(0)
let searchTimer: ReturnType<typeof setInterval> | null = null

const fakeEta = computed(() => {
  if (elapsedSeconds.value < 30) return '< 1 MIN'
  if (elapsedSeconds.value < 90) return '~2 MIN'
  return '~5 MIN'
})

function formatElapsed(s: number): string {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

// ── Lobby computed ─────────────────────────────────────────────────────────
const inLobby = computed(() => lobbyStore.lobby !== null)
const isHost = computed(() => lobbyStore.isHost)
const isReady = computed(() => lobbyStore.isReady)
const canStart = computed(() => lobbyStore.canStart)
const slotMax = computed(() => lobbyStore.slotMax)

const hostPlayerId = computed(() => lobbyStore.lobby?.host ?? null)
const hostPlayerState = computed(() => {
  if (!hostPlayerId.value || !lobbyStore.lobby) return null
  return lobbyStore.lobby.players.get(hostPlayerId.value) ?? null
})
const otherPlayers = computed(() => {
  if (!lobbyStore.lobby) return []
  return Array.from(lobbyStore.lobby.players.entries())
    .filter(([id]) => id !== hostPlayerId.value)
    .map(([id, state]) => ({ playerId: id, ...state }))
})
const totalPlayers = computed(() => lobbyStore.lobby?.players.size ?? 0)
const emptySlots = computed(() => Math.max(0, slotMax.value - totalPlayers.value))

// ── Chat ──────────────────────────────────────────────────────────────────
interface DisplayMessage {
  id: string
  from: string
  text: string
  timestamp: Date
  isOwn: boolean
}

const chatDraft = ref('')

const displayMessages = computed((): DisplayMessage[] =>
  lobbyStore.messages.map(msg => ({
    id: msg.messageId,
    from: lobbyStore.lobby?.players.get(msg.senderId)?.playerName ?? 'Inconnu',
    text: msg.message,
    timestamp: msg.sendAt,
    isOwn: msg.senderId === authStore.user?.uid,
  }))
)

function formatTime(date: Date): string {
  return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

// ── Actions ────────────────────────────────────────────────────────────────
async function handleMatchmaking() {
  isSearching.value = true
  gameFound.value = false
  elapsedSeconds.value = 0
  searchTimer = setInterval(() => { elapsedSeconds.value++ }, 1000)
  await lobbyStore.startMatchmaking(gameMode.value, deckFormatMM.value)
}

async function handleCreate() {
  await lobbyStore.createLobby(gameMode.value, deckFormatCreate.value)
}

async function handleJoin() {
  if (roomCodeInput.value.length !== 5) return
  await lobbyStore.joinLobby(roomCodeInput.value)
}

async function handleLeave() {
  if (isSearching.value) {
    if (searchTimer) { clearInterval(searchTimer); searchTimer = null }
    isSearching.value = false
    gameFound.value = false
    await lobbyStore.cancelMatchmaking()
  } else {
    await lobbyStore.leaveLobby()
  }
}

async function handleReady() {
  await lobbyStore.toggleReady()
}

async function handleStart() {
  if (!isHost.value || !canStart.value) return
  await lobbyStore.startGame()
}

async function handleSend() {
  const text = chatDraft.value.trim()
  if (!text) return
  chatDraft.value = ''
  await lobbyStore.sendMessage(text)
}

onUnmounted(() => {
  if (searchTimer) clearInterval(searchTimer)
})

// ── Navigation guard ───────────────────────────────────────────────────────
const showLeaveConfirm = ref(false)

function handleBackClick() {
  if (inLobby.value || isSearching.value) {
    showLeaveConfirm.value = true
  } else {
    router.push('/')
  }
}

async function confirmLeave() {
  showLeaveConfirm.value = false
  if (isSearching.value) {
    if (searchTimer) { clearInterval(searchTimer); searchTimer = null }
    isSearching.value = false
    gameFound.value = false
    await lobbyStore.cancelMatchmaking()
  } else if (inLobby.value) {
    await lobbyStore.leaveLobby()
  }
  router.push('/')
}
</script>

<template>
  <div class="lobby-page">
    <div class="lobby">

      <!-- Header -->
      <div class="lobby-header">
        <button class="back-btn" @click="handleBackClick()">
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"/>
          </svg>
        </button>
        <div class="lobby-title-row">
          <span class="lobby-eyebrow">RIFTBOUND</span>
          <h2 class="lobby-title">SALON DE JEU</h2>
        </div>
      </div>

      <!-- Body: 2 columns -->
      <div class="lobby-body">

        <!-- ── Left panel ── -->
        <GameCard>
          <template v-if="!inLobby" #header>
            <TabBar v-model="activeTab" :tabs="TABS" :disabled="isSearching" />
          </template>
          <template v-else #header>
            <div class="chat-header">
              <span class="chat-eyebrow">CHAT</span>
            </div>
          </template>

          <!-- Tab: matchmaking -->
          <div v-if="!inLobby && activeTab === 'matchmaking'" class="panel-content">
            <div class="panel-fields">
              <div class="field-group">
                <label class="field-label">MODE DE JEU</label>
                <div class="mode-grid">
                  <SelectCard
                    v-for="m in MODES" :key="m.value"
                    :label="m.label" :description="m.desc"
                    :active="gameMode === m.value"
                    :disabled="m.soon || isSearching"
                    :badge="m.soon ? 'BIENTÔT' : undefined"
                    @select="gameMode = m.value"
                  />
                </div>
              </div>
              <div class="field-group">
                <label class="field-label">FORMAT DE DECK</label>
                <div class="mode-grid">
                  <SelectCard
                      v-for="f in DECK_FORMATS_MM" :key="f.value"
                      :label="f.label" :description="f.desc"
                      :active="deckFormatMM === f.value"
                      :disabled="f.soon || isSearching"
                      :badge="f.soon ? 'BIENTÔT' : undefined"
                      @select="!f.soon && (deckFormatMM = f.value)"
                  />
                </div>
              </div>
              <div class="field-group">
                <label class="field-label">FORMAT DE MATCH</label>
                <div class="mode-grid">
                  <SelectCard
                    v-for="f in MATCH_FORMATS" :key="f.value"
                    :label="f.label" :description="f.desc"
                    :active="matchFormat === f.value"
                    :disabled="f.soon || isSearching"
                    :badge="f.soon ? 'BIENTÔT' : undefined"
                  />
                </div>
              </div>
            </div>
            <ActionButton v-if="!isSearching" @click="handleMatchmaking">TROUVER UNE PARTIE</ActionButton>
            <ActionButton v-else variant="locked">EN RECHERCHE..</ActionButton>
          </div>

          <!-- Tab: create -->
          <div v-else-if="!inLobby && activeTab === 'create'" class="panel-content">
            <div class="panel-fields">
              <div class="field-group">
                <label class="field-label">MODE DE JEU</label>
                <div class="mode-grid">
                  <SelectCard
                    v-for="m in MODES" :key="m.value"
                    :label="m.label" :description="m.desc"
                    :active="gameMode === m.value"
                    :disabled="m.soon"
                    :badge="m.soon ? 'BIENTÔT' : undefined"
                    @select="gameMode = m.value"
                  />
                </div>
              </div>
              <div class="field-group">
                <label class="field-label">FORMAT DE DECK</label>
                <div class="mode-grid">
                  <SelectCard
                    v-for="f in DECK_FORMATS_CREATE" :key="f.value"
                    :label="f.label" :description="f.desc"
                    :active="deckFormatCreate === f.value"
                    :disabled="f.soon"
                    :badge="f.soon ? 'BIENTÔT' : undefined"
                    @select="!f.soon && (deckFormatCreate = f.value)"
                  />
                </div>
              </div>
              <div class="field-group">
                <label class="field-label">FORMAT DE MATCH</label>
                <div class="mode-grid">
                  <SelectCard
                      v-for="f in MATCH_FORMATS" :key="f.value"
                      :label="f.label" :description="f.desc"
                      :active="matchFormat === f.value"
                      :disabled="f.soon"
                      :badge="f.soon ? 'BIENTÔT' : undefined"
                  />
                </div>
              </div>
            </div>
            <ActionButton @click="handleCreate">CRÉER LA PARTIE</ActionButton>
          </div>

          <!-- Tab: join -->
          <div v-else-if="!inLobby && activeTab === 'join'" class="panel-content">
            <div class="panel-fields">
              <div class="field-group">
                <label class="field-label">CODE DE SALON</label>
                <input
                  v-model="roomCodeInput"
                  class="field-input field-input--code"
                  type="text" placeholder="XXXXX" maxlength="5"
                  @input="roomCodeInput = (roomCodeInput as string).toUpperCase()"
                />
              </div>
            </div>
            <ActionButton :disabled="roomCodeInput.length !== 5" @click="handleJoin">REJOINDRE</ActionButton>
          </div>

          <!-- Chat (in lobby) -->
          <div v-else class="chat-panel">
            <div
              class="chat-messages"
              :class="{ 'chat-messages--empty': !displayMessages.length }"
            >
              <div v-if="!displayMessages.length" class="chat-empty">
                <span>Aucun message</span>
              </div>
              <template v-else>
                <div
                  v-for="msg in [...displayMessages].reverse()"
                  :key="msg.id"
                  class="chat-msg"
                  :class="{ 'chat-msg--own': msg.isOwn }"
                >
                  <span class="chat-msg__meta">{{ msg.from }} · {{ formatTime(msg.timestamp) }}</span>
                  <div class="chat-msg__bubble" :class="{ 'chat-msg__bubble--own': msg.isOwn }">
                    {{ msg.text }}
                  </div>
                </div>
              </template>
            </div>
            <div class="chat-input-row">
              <input
                v-model="chatDraft"
                class="chat-input-field"
                placeholder="Message… (Entrée)"
                maxlength="200"
                @keydown.enter.prevent="handleSend"
                @keydown.stop
              />
              <button class="chat-send-btn" @click="handleSend">
                <svg class="chat-send-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z"/>
                </svg>
              </button>
            </div>
          </div>
        </GameCard>

        <!-- ── Right panel ── -->
        <GameCard>

          <!-- Matchmaking searching -->
          <div v-if="isSearching" class="mm-waiting">
            <div class="mm-radar">
              <div class="mm-radar__ring mm-radar__ring--outer"/>
              <div class="mm-radar__ring mm-radar__ring--mid"/>
              <div class="mm-radar__ring mm-radar__ring--inner"/>
              <div class="mm-radar__sweep"/>
              <div class="mm-radar__core">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="mm-radar__icon">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c-.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z"/>
                </svg>
              </div>
              <div class="mm-radar__dot mm-radar__dot--1"/>
              <div class="mm-radar__dot mm-radar__dot--2"/>
              <div class="mm-radar__dot mm-radar__dot--3"/>
            </div>

            <div class="mm-status">
              <span class="mm-status__eyebrow" :class="{ 'mm-status__eyebrow--found': gameFound }">
                {{ gameFound ? 'PARTIE TROUVÉE' : 'MATCHMAKING' }}
              </span>
              <p class="mm-status__label" :class="{ 'mm-status__label--found': gameFound }">
                <template v-if="gameFound">
                  Connexion en cours<span class="mm-dots"><span>.</span><span>.</span><span>.</span></span>
                </template>
                <template v-else>
                  Recherche en cours<span class="mm-dots"><span>.</span><span>.</span><span>.</span></span>
                </template>
              </p>
            </div>

            <div class="mm-info-grid">
              <div class="mm-info-cell">
                <span class="mm-info-cell__key">TEMPS ÉCOULÉ</span>
                <span class="mm-info-cell__val mm-info-cell__val--timer">{{ formatElapsed(elapsedSeconds) }}</span>
              </div>
              <div class="mm-info-cell">
                <span class="mm-info-cell__key">ESTIMATION</span>
                <span class="mm-info-cell__val">{{ fakeEta }}</span>
              </div>
              <div class="mm-info-cell">
                <span class="mm-info-cell__key">MODE</span>
                <span class="mm-info-cell__val">{{ MODES.find(m => m.value === gameMode)?.label }}</span>
              </div>
              <div class="mm-info-cell">
                <span class="mm-info-cell__key">FORMAT</span>
                <span class="mm-info-cell__val">{{ DECK_FORMATS_MM.find(f => f.value === deckFormatMM)?.label }}</span>
              </div>
            </div>

            <button v-if="!gameFound" class="mm-cancel-btn" @click="handleLeave">ANNULER LA RECHERCHE</button>
          </div>

          <!-- Empty placeholder -->
          <div v-else-if="!inLobby" class="waiting-placeholder">
            <svg class="waiting-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
              <path stroke-linecap="round" stroke-linejoin="round"
                d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"/>
            </svg>
            <p class="waiting-placeholder__text">Créez ou rejoignez<br/>une partie pour continuer</p>
          </div>

          <!-- In lobby: players + actions -->
          <div v-else class="panel-content">

            <div class="room-code-row">
              <span class="room-code-label">CODE</span>
              <span class="room-code">{{ lobbyStore.lobby?.lobbyCode }}</span>
              <button class="leave-btn" @click="handleLeave">
                <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9"/>
                </svg>
                QUITTER
              </button>
            </div>

            <div class="panel-divider"/>

            <div class="players-list">
              <div class="players-count">
                JOUEURS
                <span class="players-fraction">{{ totalPlayers }} / {{ slotMax }}</span>
              </div>

              <!-- Host row -->
              <div v-if="hostPlayerState" class="player-row player-row--host">
                <div class="player-row__left">
                  <div class="player-avatar">{{ hostPlayerState.playerName.charAt(0).toUpperCase() }}</div>
                  <span class="player-name">{{ hostPlayerState.playerName }}</span>
                  <span v-if="isHost" class="player-you">(vous)</span>
                </div>
                <div class="player-row__badges">
                  <span v-if="hostPlayerState.isReady" class="player-badge player-badge--ready">PRÊT</span>
                  <span class="player-badge player-badge--host">HÔTE</span>
                </div>
              </div>

              <!-- Other players -->
              <div
                v-for="player in otherPlayers"
                :key="player.playerId"
                class="player-row"
              >
                <div class="player-row__left">
                  <div class="player-avatar">{{ player.playerName.charAt(0).toUpperCase() }}</div>
                  <span class="player-name">{{ player.playerName }}</span>
                  <span v-if="authStore.user?.uid === player.playerId" class="player-you">(vous)</span>
                </div>
                <span
                  class="player-badge"
                  :class="player.isReady ? 'player-badge--ready' : 'player-badge--waiting'"
                >
                  {{ player.isReady ? 'PRÊT' : '...' }}
                </span>
              </div>

              <!-- Empty slots -->
              <div
                v-for="n in emptySlots"
                :key="'empty-' + n"
                class="player-row player-row--empty"
              >
                <div class="player-row__left">
                  <div class="player-avatar player-avatar--empty">+</div>
                  <span class="player-name player-name--empty">EN ATTENTE...</span>
                </div>
              </div>
            </div>

            <div class="panel-divider"/>

            <ActionButton
              :variant="isReady ? 'ready' : 'primary'"
              @click="handleReady"
            >
              {{ isReady ? 'JE NE SUIS PAS PRÊT' : 'JE SUIS PRÊT' }}
            </ActionButton>

            <ActionButton
              v-if="isHost"
              :variant="canStart ? 'primary' : 'disabled'"
              :disabled="!canStart"
              @click="handleStart"
            >
              {{ canStart ? 'LANCER LA PARTIE' : 'EN ATTENTE DES JOUEURS...' }}
            </ActionButton>
          </div>

        </GameCard>
      </div>
    </div>
  </div>

  <!-- ── Confirmation quitter ── -->
  <Teleport to="body">
    <Transition name="confirm-backdrop">
      <div
        v-if="showLeaveConfirm"
        class="confirm-backdrop confirm-backdrop--overlay"
        @click.self="showLeaveConfirm = false"
      />
    </Transition>
    <Transition name="confirm-popup">
      <div v-if="showLeaveConfirm" class="confirm-popup">
        <div class="confirm-popup__icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9"/>
          </svg>
        </div>
        <p class="confirm-popup__title">QUITTER LE SALON ?</p>
        <p class="confirm-popup__sub">
          {{ isSearching ? 'La recherche de partie sera annulée.' : 'Vous perdrez votre place dans le salon.' }}
        </p>
        <button class="confirm-popup__confirm" @click="confirmLeave">QUITTER</button>
        <button class="confirm-popup__dismiss" @click="showLeaveConfirm = false">Annuler</button>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* ── Page layout ── */
.lobby-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 2rem;
}

.lobby {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  width: min(900px, 90vw);
}

/* ── Header ── */
.lobby-header {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.back-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border: 1px solid rgba(200, 170, 110, 0.25);
  background: rgba(10, 21, 37, 0.6);
  color: #8aabb0;
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s;
  flex-shrink: 0;
}

.back-btn:hover {
  color: #C8AA6E;
  border-color: #C8AA6E;
}

.lobby-title-row {
  display: flex;
  flex-direction: column;
}

.lobby-eyebrow {
  font-size: 0.6rem;
  letter-spacing: 0.4em;
  color: #00CCB9;
  font-weight: 700;
}

.lobby-title {
  font-size: 1.4rem;
  font-weight: 900;
  letter-spacing: 0.15em;
  color: #F2E5CD;
}

/* ── Body grid ── */
.lobby-body {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1px;
  background: rgba(200, 170, 110, 0.12);
  border: 1px solid rgba(200, 170, 110, 0.18);
  min-height: 480px;
}

/* ── Panel content wrapper (padded sections) ── */
.panel-content {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 1.5rem;
  flex: 1;
  overflow-y: auto;
  gap: 1.25rem;
}

.panel-fields {
  display: flex;
  flex-direction: column;
  gap: 1.75rem;
}


/* ── Divider ── */
.panel-divider {
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(200, 170, 110, 0.15) 50%, transparent);
  flex-shrink: 0;
}

/* ── Fields ── */
.field-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.field-label {
  font-size: 0.6rem;
  font-weight: 700;
  letter-spacing: 0.25em;
  color: #00CCB9;
}

.field-input {
  background: rgba(6, 15, 27, 0.8);
  border: 1px solid rgba(200, 170, 110, 0.2);
  color: #F2E5CD;
  font-size: 0.875rem;
  padding: 0.6rem 0.75rem;
  outline: none;
  transition: border-color 0.15s;
  width: 100%;
}

.field-input::placeholder {
  color: #2a4a50;
}

.field-input:focus {
  border-color: #C8AA6E;
}

.field-input--code {
  text-transform: uppercase;
  letter-spacing: 0.4em;
  font-size: 1.1rem;
  text-align: center;
}

/* ── Mode / Format grid ── */
.mode-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
}

/* ── Chat panel (in lobby, left panel) ── */
.chat-header {
  padding: 0.6rem 1rem;
}

.chat-eyebrow {
  font-size: 0.6rem;
  font-weight: 700;
  letter-spacing: 0.3em;
  color: #C8AA6E;
}

.chat-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 0;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column-reverse;
  gap: 0.4rem;
  padding: 0.75rem 1rem;
  min-height: 0;
  scrollbar-width: thin;
  scrollbar-color: #1a3050 transparent;
}

.chat-messages--empty {
  justify-content: center;
  align-items: center;
}

.chat-empty {
  font-size: 0.6rem;
  letter-spacing: 0.15em;
  color: #2a4a50;
  text-transform: uppercase;
}

.chat-msg {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  align-items: flex-start;
}

.chat-msg--own {
  align-items: flex-end;
}

.chat-msg__meta {
  font-size: 0.55rem;
  color: #4a6a70;
  padding: 0 0.25rem;
}

.chat-msg__bubble {
  padding: 0.35rem 0.6rem;
  font-size: 0.7rem;
  line-height: 1.4;
  max-width: 85%;
  word-break: break-word;
  background: rgba(14, 30, 48, 0.8);
  color: #8aabb0;
  border: 1px solid rgba(26, 48, 80, 0.8);
  border-radius: 0 4px 4px 4px;
}

.chat-msg__bubble--own {
  background: rgba(26, 58, 90, 0.8);
  color: #F2E5CD;
  border-color: rgba(40, 80, 120, 0.6);
  border-radius: 4px 0 4px 4px;
}

.chat-input-row {
  display: flex;
  gap: 0.4rem;
  padding: 0.6rem 0.75rem;
  border-top: 1px solid rgba(26, 48, 80, 0.8);
  flex-shrink: 0;
}

.chat-input-field {
  flex: 1;
  background: rgba(10, 21, 37, 0.9);
  border: 1px solid rgba(26, 48, 80, 0.8);
  border-radius: 2px;
  padding: 0.4rem 0.6rem;
  font-size: 0.7rem;
  color: #F2E5CD;
  outline: none;
  transition: border-color 0.15s;
}

.chat-input-field::placeholder {
  color: #2a4a50;
}

.chat-input-field:focus {
  border-color: #C8AA6E;
}

.chat-send-btn {
  width: 2rem;
  height: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(14, 30, 48, 0.9);
  border: 1px solid rgba(26, 48, 80, 0.8);
  color: #C8AA6E;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
  flex-shrink: 0;
  border-radius: 2px;
}

.chat-send-btn:hover {
  background: #C8AA6E;
  color: #02091C;
}

.chat-send-icon {
  width: 0.75rem;
  height: 0.75rem;
}

/* ── Waiting placeholder ── */
.waiting-placeholder {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
}

.waiting-icon {
  width: 3rem;
  height: 3rem;
  color: #1a3050;
}

.waiting-placeholder__text {
  font-size: 0.7rem;
  letter-spacing: 0.1em;
  color: #2a4a50;
  text-align: center;
  line-height: 1.8;
}

/* ── Room code row ── */
.room-code-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.room-code-label {
  font-size: 0.6rem;
  letter-spacing: 0.3em;
  color: #4a6a70;
  font-weight: 700;
}

.room-code {
  flex: 1;
  font-size: 1.1rem;
  font-weight: 900;
  letter-spacing: 0.35em;
  color: #C8AA6E;
}

.leave-btn {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.3rem 0.6rem;
  font-size: 0.55rem;
  font-weight: 700;
  letter-spacing: 0.15em;
  color: #4a6a70;
  background: transparent;
  border: 1px solid rgba(90, 110, 130, 0.3);
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s;
}

.leave-btn:hover {
  color: #e06060;
  border-color: #e06060;
}

/* ── Players list ── */
.players-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}

.players-count {
  display: flex;
  justify-content: space-between;
  font-size: 0.6rem;
  letter-spacing: 0.25em;
  color: #4a6a70;
  font-weight: 700;
  margin-bottom: 0.25rem;
  flex-shrink: 0;
}

.players-fraction {
  color: #C8AA6E;
}

.player-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 0.75rem;
  background: rgba(6, 15, 27, 0.6);
  border: 1px solid rgba(90, 110, 130, 0.2);
  flex-shrink: 0;
}

.player-row--host {
  border-color: rgba(200, 170, 110, 0.3);
  background: rgba(200, 170, 110, 0.04);
}

.player-row--empty {
  border-style: dashed;
  opacity: 0.4;
}

.player-row__left {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.player-row__badges {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.player-avatar {
  width: 1.75rem;
  height: 1.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(200, 170, 110, 0.1);
  border: 1px solid rgba(200, 170, 110, 0.25);
  font-size: 0.7rem;
  font-weight: 900;
  color: #C8AA6E;
}

.player-avatar--empty {
  color: #2a4a50;
  border-color: rgba(90, 110, 130, 0.2);
  background: transparent;
}

.player-name {
  font-size: 0.75rem;
  color: #F2E5CD;
  font-weight: 600;
}

.player-name--empty {
  color: #2a4a50;
  font-size: 0.65rem;
  letter-spacing: 0.1em;
}

.player-you {
  font-size: 0.55rem;
  color: #4a6a70;
  letter-spacing: 0.05em;
}

.player-badge {
  font-size: 0.55rem;
  font-weight: 700;
  letter-spacing: 0.15em;
  padding: 0.15rem 0.5rem;
}

.player-badge--host {
  background: rgba(200, 170, 110, 0.15);
  color: #C8AA6E;
}

.player-badge--ready {
  background: rgba(0, 204, 185, 0.1);
  color: #00CCB9;
}

.player-badge--waiting {
  color: #4a6a70;
}

/* ── Matchmaking animation ── */
.mm-waiting {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1.75rem;
  padding: 1.5rem 1rem;
}

.mm-radar {
  position: relative;
  width: 9rem;
  height: 9rem;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.mm-radar__ring {
  position: absolute;
  border-radius: 50%;
  border: 1px solid;
}

.mm-radar__ring--outer {
  width: 100%;
  height: 100%;
  border-color: rgba(200, 170, 110, 0.15);
  animation: ring-pulse 2.8s ease-in-out infinite;
}

.mm-radar__ring--mid {
  width: 68%;
  height: 68%;
  border-color: rgba(200, 170, 110, 0.22);
  animation: ring-pulse 2.8s ease-in-out infinite 0.4s;
}

.mm-radar__ring--inner {
  width: 38%;
  height: 38%;
  border-color: rgba(200, 170, 110, 0.35);
  animation: ring-pulse 2.8s ease-in-out infinite 0.8s;
}

.mm-radar__sweep {
  position: absolute;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: conic-gradient(
    from 0deg,
    transparent 0deg,
    rgba(0, 204, 185, 0.12) 60deg,
    rgba(0, 204, 185, 0.0) 90deg,
    transparent 90deg
  );
  animation: sweep 2.8s linear infinite;
}

.mm-radar__core {
  position: relative;
  z-index: 2;
  width: 2.4rem;
  height: 2.4rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(6, 15, 27, 0.9);
  border: 1px solid rgba(200, 170, 110, 0.4);
  border-radius: 50%;
}

.mm-radar__icon {
  width: 1.1rem;
  height: 1.1rem;
  color: #C8AA6E;
}

.mm-radar__dot {
  position: absolute;
  width: 0.35rem;
  height: 0.35rem;
  border-radius: 50%;
  background: #00CCB9;
  box-shadow: 0 0 6px #00CCB9;
  opacity: 0;
}

.mm-radar__dot--1 { top: 22%; left: 58%; animation: blip 2.8s 0.7s infinite; }
.mm-radar__dot--2 { top: 55%; left: 20%; animation: blip 2.8s 1.4s infinite; }
.mm-radar__dot--3 { top: 30%; left: 30%; animation: blip 2.8s 2.1s infinite; }

.mm-status {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.3rem;
}

.mm-status__eyebrow {
  font-size: 0.55rem;
  font-weight: 700;
  letter-spacing: 0.4em;
  color: #00CCB9;
  transition: color 0.4s;
}

.mm-status__eyebrow--found {
  color: #C8AA6E;
}

.mm-status__label {
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.15em;
  color: #F2E5CD;
  display: flex;
  align-items: baseline;
  gap: 0.1rem;
  transition: color 0.4s;
}

.mm-status__label--found {
  color: #C8AA6E;
}

.mm-dots span {
  animation: dot-fade 1.4s infinite;
  opacity: 0;
}
.mm-dots span:nth-child(2) { animation-delay: 0.28s; }
.mm-dots span:nth-child(3) { animation-delay: 0.56s; }

.mm-info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1px;
  background: rgba(200, 170, 110, 0.1);
  border: 1px solid rgba(200, 170, 110, 0.12);
  width: 100%;
}

.mm-info-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  padding: 0.6rem 0.5rem;
  background: rgba(6, 15, 27, 0.7);
}

.mm-info-cell__key {
  font-size: 0.5rem;
  font-weight: 700;
  letter-spacing: 0.25em;
  color: #4a6a70;
}

.mm-info-cell__val {
  font-size: 0.8rem;
  font-weight: 900;
  letter-spacing: 0.1em;
  color: #C8AA6E;
}

.mm-info-cell__val--timer {
  font-variant-numeric: tabular-nums;
  color: #F2E5CD;
}

.mm-cancel-btn {
  font-size: 0.55rem;
  font-weight: 700;
  letter-spacing: 0.2em;
  color: #4a6a70;
  background: transparent;
  border: 1px solid rgba(90, 110, 130, 0.3);
  padding: 0.4rem 1rem;
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s;
}

.mm-cancel-btn:hover {
  color: #e06060;
  border-color: #e06060;
}

/* ── Keyframes ── */
@keyframes ring-pulse {
  0%, 100% { opacity: 0.6; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.03); }
}

@keyframes sweep {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}

@keyframes blip {
  0%, 100% { opacity: 0; transform: scale(0.5); }
  10%, 40% { opacity: 1; transform: scale(1); }
  60% { opacity: 0; transform: scale(1.5); }
}

@keyframes dot-fade {
  0%, 100% { opacity: 0; }
  50% { opacity: 1; }
}

/* ── Confirmation backdrop ── */
.confirm-backdrop {
  position: fixed;
  inset: 0;
  z-index: 9040;
}

/* overlay: semi-transparent, click-to-close */
.confirm-backdrop--overlay {
  background: rgba(2, 9, 28, 0.55);
  cursor: pointer;
}

/* modal: blocks clicks, no dismiss on outside click */
.confirm-backdrop--modal {
  background: rgba(2, 9, 28, 0.75);
  cursor: default;
}

.confirm-backdrop-enter-from,
.confirm-backdrop-leave-to { opacity: 0; }
.confirm-backdrop-enter-active,
.confirm-backdrop-leave-active { transition: opacity 0.15s ease; }

/* ── Confirmation modal ── */
.confirm-popup {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 9050;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  padding: 1.75rem 1.5rem;
  width: 260px;
  background: linear-gradient(160deg, #0d1c2e 0%, #060d1a 100%);
  border: 1px solid rgba(200, 170, 110, 0.3);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.8), 0 0 30px rgba(200, 170, 110, 0.06);
  text-align: center;
}

.confirm-popup__icon {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(200, 170, 110, 0.1);
  border: 1px solid rgba(200, 170, 110, 0.28);
  border-radius: 50%;
  color: #C8AA6E;
  flex-shrink: 0;
}

.confirm-popup__icon svg {
  width: 18px;
  height: 18px;
}

.confirm-popup__title {
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  color: #F2E5CD;
  margin: 0;
}

.confirm-popup__sub {
  font-size: 0.65rem;
  color: #6a8a90;
  line-height: 1.5;
  margin: 0;
}

.confirm-popup__confirm {
  width: 100%;
  padding: 0.55rem 0;
  font: inherit;
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: #C8AA6E;
  background: rgba(200, 170, 110, 0.12);
  border: 1px solid rgba(200, 170, 110, 0.45);
  cursor: pointer;
  transition: background 0.15s;
}

.confirm-popup__confirm:hover {
  background: rgba(200, 170, 110, 0.22);
}

.confirm-popup__dismiss {
  font: inherit;
  font-size: 0.55rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #4a6a70;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0.15rem 0.4rem;
  transition: color 0.15s;
}

.confirm-popup__dismiss:hover {
  color: #8aabb0;
}

/* Transition */
.confirm-popup-enter-from,
.confirm-popup-leave-to {
  opacity: 0;
  transform: translate(-50%, -50%) scale(0.96);
}

.confirm-popup-enter-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.confirm-popup-leave-active {
  transition: opacity 0.12s ease, transform 0.12s ease;
}
</style>
