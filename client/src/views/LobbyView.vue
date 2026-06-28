<script setup lang="ts">
import { ref, computed, watch, onUnmounted, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import type { GameMode, GameDeckFormat, GameMatchFormat } from '@riftbound/shared'
import { MAX_PLAYERS_BY_MODE } from '@riftbound/shared'
import { useAuthStore } from '@/stores/auth'
import { useLobbyStore } from '@/stores/lobby'
import { useFeatureFlagsStore } from '@/stores/featureFlags'
import { useActiveGame } from '@/composables/useActiveGame'
import GameCard from '@/components/GameCard.vue'
import TabBar from '@/components/TabBar.vue'
import SelectCard from '@/components/SelectCard.vue'
import ActionButton from '@/components/ActionButton.vue'

const router = useRouter()
const authStore = useAuthStore()
const featureFlags = useFeatureFlagsStore()
onMounted(() => featureFlags.load())
const lobbyStore = useLobbyStore()
const { activeGame } = useActiveGame(() => authStore.user?.uid ?? null)

// ── Tabs ──────────────────────────────────────────────────────────────────
type TabId = 'matchmaking' | 'create' | 'join'
const TABS: { id: TabId; label: string }[] = [
  { id: 'matchmaking', label: 'MATCHMAKING' },
  { id: 'create', label: 'CRÉER' },
  { id: 'join', label: 'REJOINDRE' },
]
const activeTab = ref<TabId>('matchmaking')

// ── Game mode options ──────────────────────────────────────────────────────
const ALL_MODES: { value: GameMode; label: string; desc: string; soon: boolean }[] = [
  { value: 'dual', label: 'Duel', desc: '1 contre 1', soon: false },
  { value: '2v2', label: '2V2', desc: 'Équipes de 2', soon: false },
  { value: 'FFA', label: 'FFA', desc: 'Chacun pour soi', soon: true },
]
const MODES = computed(() =>
  ALL_MODES
      .filter(m => m.value !== '2v2' || featureFlags.is2v2Enabled)
      .filter(m => m.value !== 'FFA' || featureFlags.is2v2Enabled)
)

// ── Match format options ───────────────────────────────────────────────────
const MATCH_FORMATS: { value: GameMatchFormat; label: string; desc: string; soon: boolean }[] = [
  { value: 'BO1', label: 'BO1', desc: 'Manche unique', soon: false },
  { value: 'BO3', label: 'BO3', desc: 'Meilleur des 3', soon: false },
  { value: 'BO5', label: 'BO5', desc: 'Meilleur des 5', soon: true },
]
const matchFormat = ref<GameMatchFormat>('BO1')

// ── Deck format options ────────────────────────────────────────────────────
const DECK_FORMATS_MM: { value: GameDeckFormat | 'ANY'; label: string; desc: string; soon?: boolean }[] = [
  { value: 'constructed', label: 'Construit', desc: 'Deck personnel' },
  { value: 'sealed', label: 'Scellé', desc: 'Boosters', soon: true },
  { value: 'learn_to_play', label: 'Apprendre', desc: 'Deck de démarrage', soon: true },
]
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
const joinError = ref<string | null>(null)
const codeCopied = ref(false)

function copyCode() {
  const code = lobbyStore.lobby?.lobbyCode
  if (!code) return
  navigator.clipboard.writeText(code)
  codeCopied.value = true
  setTimeout(() => { codeCopied.value = false }, 1800)
}

// ── Matchmaking / lobby state ──────────────────────────────────────────────
// isSearching: true while in a matchmaking lobby waiting for an opponent
const isSearching = computed(() => {
  const l = lobbyStore.lobby
  if (!l || l.type !== 'matchmaking') return false
  return l.players.size < MAX_PLAYERS_BY_MODE[l.mode]
})

const gameFound = ref(false)
const elapsedSeconds = ref(0)
let searchTimer: ReturnType<typeof setInterval> | null = null

// Start/stop elapsed timer based on isSearching
watch(isSearching, (searching, wasSearching) => {
  if (searching && !wasSearching) {
    elapsedSeconds.value = 0
    searchTimer = setInterval(() => { elapsedSeconds.value++ }, 1000)
  } else if (!searching && wasSearching && lobbyStore.lobby?.type === 'matchmaking') {
    // Opponent just joined — flash "game found" briefly
    if (searchTimer) { clearInterval(searchTimer); searchTimer = null }
    gameFound.value = true
    setTimeout(() => { gameFound.value = false }, 2000)
  }
})

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
  isSystem: boolean
}

const chatDraft = ref('')

const displayMessages = computed((): DisplayMessage[] =>
  lobbyStore.messages.map(msg => ({
    id: msg.messageId,
    from: msg.type === 'system' ? '' : (lobbyStore.lobby?.players.get(msg.senderId)?.playerName ?? 'Inconnu'),
    text: msg.message,
    timestamp: msg.sendAt,
    isOwn: msg.senderId === authStore.user?.uid,
    isSystem: msg.type === 'system',
  }))
)

function formatTime(date: Date): string {
  return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

// ── Actions ────────────────────────────────────────────────────────────────
async function handleMatchmaking() {
  await lobbyStore.startMatchmaking(gameMode.value, deckFormatMM.value)
}

async function handleCreate() {
  await lobbyStore.createLobby(gameMode.value, matchFormat.value, deckFormatCreate.value)
}

async function handleJoin() {
  if (roomCodeInput.value.length !== 5) return
  joinError.value = null
  try {
    await lobbyStore.joinLobby(roomCodeInput.value)
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === 'CODE_NOT_FOUND') joinError.value = 'Code introuvable.'
      else if (err.message === 'LOBBY_FULL') joinError.value = 'Partie complète.'
      else joinError.value = 'Erreur de connexion.'
    }
  }
}

async function handleLeave() {
  if (isSearching.value || lobbyStore.lobby?.type === 'matchmaking') {
    if (searchTimer) { clearInterval(searchTimer); searchTimer = null }
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

function canChangeTeam(playerId: string): boolean {
  return isHost.value || authStore.user?.uid === playerId
}

const teamDebounceTimers = new Map<string, ReturnType<typeof setTimeout>>()

function handleSetTeam(playerId: string, teamId: '1' | '2') {
  if (!canChangeTeam(playerId)) return
  const current = lobbyStore.lobby?.players.get(playerId)?.teamId
  const next: '1' | '2' | null = current === teamId ? null : teamId

  // Optimistic local update so the UI réagit immédiatement
  const player = lobbyStore.lobby?.players.get(playerId)
  if (player) player.teamId = next

  // Annule le timer précédent et repart à 1.5s
  const existing = teamDebounceTimers.get(playerId)
  if (existing) clearTimeout(existing)
  teamDebounceTimers.set(
    playerId,
    setTimeout(async () => {
      teamDebounceTimers.delete(playerId)
      await lobbyStore.setTeam(playerId, next)
    }, 1500),
  )
}

async function handleRandomizeTeams() {
  if (isHost.value) {
    await lobbyStore.randomizeTeams()
  } else {
    const uid = authStore.user?.uid
    if (!uid) return
    await lobbyStore.setTeam(uid, Math.random() < 0.5 ? '1' : '2')
  }
}

async function handleSend() {
  const text = chatDraft.value.trim()
  if (!text) return
  chatDraft.value = ''
  await lobbyStore.sendMessage(text)
}

onUnmounted(() => {
  if (searchTimer) clearInterval(searchTimer)
  teamDebounceTimers.forEach(clearTimeout)
  teamDebounceTimers.clear()
  lobbyStore.detachListeners()
  lobbyStore.detachPresence()
})

// ── Navigate when game starts (all players, including non-host) ───────────
watch(
  () => lobbyStore.lobby?.gameId,
  (gameId) => {
    if (!gameId) return
    if (searchTimer) { clearInterval(searchTimer); searchTimer = null }
    lobbyStore.detachListeners()
    lobbyStore.detachPresence()
    router.push({ name: 'game', params: { gameId } })
  },
)

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
  if (searchTimer) { clearInterval(searchTimer); searchTimer = null }
  if (isSearching.value || lobbyStore.lobby?.type === 'matchmaking') {
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
          <template v-if="!inLobby || isSearching" #header>
            <TabBar v-model="activeTab" :tabs="TABS" :disabled="isSearching" />
          </template>
          <template v-else #header>
            <div class="lobby-info-header">
              <span class="chat-eyebrow">PARAMÈTRES</span>
              <div class="lobby-info-grid">
                <div class="lobby-info-cell">
                  <span class="lobby-info-key">TYPE</span>
                  <span class="lobby-info-val">{{ lobbyStore.lobby?.type === 'matchmaking' ? 'Matchmaking' : 'Privé' }}</span>
                </div>
                <div class="lobby-info-cell">
                  <span class="lobby-info-key">MODE</span>
                  <span class="lobby-info-val">{{ MODES.find(m => m.value === lobbyStore.lobby?.mode)?.label ?? '—' }}</span>
                </div>
                <div class="lobby-info-cell">
                  <span class="lobby-info-key">MATCH</span>
                  <span class="lobby-info-val capitalize">{{ lobbyStore.lobby?.matchFormat.toString().toLowerCase() }}</span>
                </div>
                <div class="lobby-info-cell">
                  <span class="lobby-info-key">DECK</span>
                  <span class="lobby-info-val">{{ DECK_FORMATS_CREATE.find(f => f.value === lobbyStore.lobby?.deckFormat)?.label ?? lobbyStore.lobby?.deckFormat }}</span>
                </div>
              </div>
              <span class="chat-eyebrow">CHAT</span>
            </div>
          </template>

          <!-- Tab: matchmaking -->
          <div v-if="(!inLobby || isSearching) && activeTab === 'matchmaking'" class="panel-content">
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
                    @select="matchFormat = f.value"
                  />
                </div>
              </div>
            </div>
            <ActionButton v-if="!isSearching" @click="handleMatchmaking">TROUVER UNE PARTIE</ActionButton>
            <ActionButton v-else variant="locked">EN RECHERCHE..</ActionButton>
          </div>

          <!-- Tab: create -->
          <div v-else-if="(!inLobby || isSearching) && activeTab === 'create'" class="panel-content">
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
          <div v-else-if="(!inLobby || isSearching) && activeTab === 'join'" class="panel-content">
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
            <p v-if="joinError" class="join-error">{{ joinError }}</p>
            <ActionButton :disabled="roomCodeInput.length !== 5" @click="handleJoin">REJOINDRE</ActionButton>

            <template v-if="activeGame">
              <div class="rejoin-separator">
                <div class="rejoin-separator__line" />
                <span class="rejoin-separator__label">PARTIE EN COURS</span>
                <div class="rejoin-separator__line" />
              </div>
              <button class="rejoin-btn" @click="router.push('/game/' + activeGame.gameId)">
                <div class="rejoin-btn__dot" />
                <div class="rejoin-btn__text">
                  <span class="rejoin-btn__label">{{ activeGame.mode.toUpperCase() }} · {{ activeGame.matchFormat }}</span>
                  <span class="rejoin-btn__sub">Reprendre la partie</span>
                </div>
                <svg class="rejoin-btn__arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"/>
                </svg>
              </button>
            </template>
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
                  :class="{ 'chat-msg--own': msg.isOwn, 'chat-msg--system': msg.isSystem }"
                >
                  <template v-if="msg.isSystem">
                    <span class="chat-msg__system">{{ msg.text }}</span>
                  </template>
                  <template v-else>
                    <span class="chat-msg__meta">{{ msg.from }} · {{ formatTime(msg.timestamp) }}</span>
                    <div class="chat-msg__bubble" :class="{ 'chat-msg__bubble--own': msg.isOwn }">
                      {{ msg.text }}
                    </div>
                  </template>
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
              <div class="room-code-block">
                <span class="room-code-label">CODE</span>
                <div class="room-code-value-row">
                  <span class="room-code">{{ lobbyStore.lobby?.lobbyCode || '—' }}</span>
                  <button
                    class="copy-btn"
                    :class="{ 'copy-btn--copied': codeCopied }"
                    :title="codeCopied ? 'Copié !' : 'Copier le code'"
                    @click="copyCode"
                  >
                    <svg v-if="!codeCopied" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
                    </svg>
                    <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  </button>
                </div>
              </div>
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
                <button
                  v-if="lobbyStore.lobby?.mode === '2v2'"
                  class="random-teams-btn"
                  :title="isHost ? 'Équipes aléatoires' : 'Équipe aléatoire'"
                  @click="handleRandomizeTeams"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/>
                    <polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/>
                  </svg>
                  {{ isHost ? 'ALÉATOIRE' : 'MON ÉQUIPE' }}
                </button>
              </div>

              <!-- Host row -->
              <div v-if="hostPlayerState" class="player-row player-row--host">
                <div class="player-row__left">
                  <div class="player-avatar">{{ hostPlayerState.playerName.charAt(0).toUpperCase() }}</div>
                  <span class="player-name">{{ hostPlayerState.playerName }}</span>
                  <span v-if="isHost" class="player-you">(vous)</span>
                </div>
                <div class="player-row__badges">
                  <div v-if="lobbyStore.lobby?.mode === '2v2'" class="team-selector">
                    <button
                      class="team-btn team-btn--1"
                      :class="{ 'team-btn--active': hostPlayerState.teamId === '1' }"
                      :disabled="!canChangeTeam(hostPlayerId!)"
                      @click="handleSetTeam(hostPlayerId!, '1')"
                    >1</button>
                    <button
                      class="team-btn team-btn--2"
                      :class="{ 'team-btn--active': hostPlayerState.teamId === '2' }"
                      :disabled="!canChangeTeam(hostPlayerId!)"
                      @click="handleSetTeam(hostPlayerId!, '2')"
                    >2</button>
                  </div>
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
                <div class="player-row__badges">
                  <div v-if="lobbyStore.lobby?.mode === '2v2'" class="team-selector">
                    <button
                      class="team-btn team-btn--1"
                      :class="{ 'team-btn--active': player.teamId === '1' }"
                      :disabled="!canChangeTeam(player.playerId)"
                      @click="handleSetTeam(player.playerId, '1')"
                    >1</button>
                    <button
                      class="team-btn team-btn--2"
                      :class="{ 'team-btn--active': player.teamId === '2' }"
                      :disabled="!canChangeTeam(player.playerId)"
                      @click="handleSetTeam(player.playerId, '2')"
                    >2</button>
                  </div>
                  <span
                    class="player-badge"
                    :class="player.isReady ? 'player-badge--ready' : 'player-badge--waiting'"
                  >
                    {{ player.isReady ? 'PRÊT' : '...' }}
                  </span>
                </div>
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
              v-if="!isHost"
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

/* ── Lobby info header (left panel, in lobby) ── */
.lobby-info-header {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.lobby-info-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1px;
  background: rgba(200, 170, 110, 0.1);
  border-bottom: 1px solid rgba(200, 170, 110, 0.12);
  border-top: 1px solid rgba(200, 170, 110, 0.12);
}

.lobby-info-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.2rem;
  padding: 0.5rem 0.4rem;
  background: rgba(6, 15, 27, 0.7);
}

.lobby-info-key {
  font-size: 0.48rem;
  font-weight: 700;
  letter-spacing: 0.25em;
  color: #4a6a70;
}

.lobby-info-val {
  font-size: 0.60rem;
  font-weight: 900;
  letter-spacing: 0.08em;
  color: #C8AA6E;
  text-align: center;
}

/* ── Chat panel (in lobby, left panel) ── */
.chat-eyebrow {
  font-size: 0.6rem;
  font-weight: 700;
  letter-spacing: 0.3em;
  color: #C8AA6E;
  padding: 0.5rem 1rem 0.4rem;
  display: block;
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
  justify-content: space-between;
  gap: 0.75rem;
}

.room-code-block {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.room-code-label {
  font-size: 0.5rem;
  letter-spacing: 0.3em;
  color: #4a6a70;
  font-weight: 700;
}

.room-code-value-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.room-code {
  font-size: 1.6rem;
  font-weight: 900;
  letter-spacing: 0.4em;
  color: #C8AA6E;
  line-height: 1;
}

.copy-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.6rem;
  height: 1.6rem;
  background: rgba(200, 170, 110, 0.08);
  border: 1px solid rgba(200, 170, 110, 0.25);
  color: #C8AA6E;
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
}

.copy-btn svg {
  width: 0.75rem;
  height: 0.75rem;
}

.copy-btn:hover {
  background: rgba(200, 170, 110, 0.18);
  border-color: #C8AA6E;
}

.copy-btn--copied {
  border-color: #00CCB9;
  color: #00CCB9;
  background: rgba(0, 204, 185, 0.1);
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
  align-items: center;
  gap: 0.5rem;
  font-size: 0.6rem;
  letter-spacing: 0.25em;
  color: #4a6a70;
  font-weight: 700;
  margin-bottom: 0.25rem;
  flex-shrink: 0;
}

.players-fraction {
  color: #C8AA6E;
  flex: 1;
}

.random-teams-btn {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.2rem 0.5rem;
  font: inherit;
  font-size: 0.5rem;
  font-weight: 700;
  letter-spacing: 0.15em;
  color: #4a6a70;
  background: transparent;
  border: 1px solid rgba(90, 110, 130, 0.3);
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s;
}

.random-teams-btn svg {
  width: 0.65rem;
  height: 0.65rem;
  flex-shrink: 0;
}

.random-teams-btn:hover {
  color: #C8AA6E;
  border-color: rgba(200, 170, 110, 0.4);
}

/* ── Team selector ── */
.team-selector {
  display: flex;
  gap: 0.2rem;
}

.team-btn {
  width: 1.3rem;
  height: 1.3rem;
  display: flex;
  align-items: center;
  justify-content: center;
  font: inherit;
  font-size: 0.6rem;
  font-weight: 900;
  letter-spacing: 0;
  background: rgba(6, 15, 27, 0.8);
  border: 1px solid rgba(90, 110, 130, 0.3);
  color: #4a6a70;
  cursor: pointer;
  transition: background 0.12s, border-color 0.12s, color 0.12s;
  flex-shrink: 0;
}

.team-btn:disabled {
  cursor: default;
  opacity: 0.4;
}

.team-btn--1.team-btn--active {
  background: rgba(0, 204, 185, 0.15);
  border-color: #00CCB9;
  color: #00CCB9;
}

.team-btn--2.team-btn--active {
  background: rgba(200, 170, 110, 0.15);
  border-color: #C8AA6E;
  color: #C8AA6E;
}

.team-btn--1:not(:disabled):not(.team-btn--active):hover {
  border-color: rgba(0, 204, 185, 0.4);
  color: rgba(0, 204, 185, 0.7);
}

.team-btn--2:not(:disabled):not(.team-btn--active):hover {
  border-color: rgba(200, 170, 110, 0.4);
  color: rgba(200, 170, 110, 0.7);
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

/* ── System messages ── */
.chat-msg--system {
  align-items: center;
}

.chat-msg__system {
  font-size: 0.55rem;
  letter-spacing: 0.1em;
  color: #4a6a70;
  padding: 0.1rem 0.5rem;
  border-left: 2px solid rgba(0, 204, 185, 0.2);
  font-style: italic;
}

/* ── Rejoin separator ── */
.rejoin-separator {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin: 0.25rem 0;
}

.rejoin-separator__line {
  flex: 1;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(0, 204, 185, 0.2));
}

.rejoin-separator__line:last-child {
  background: linear-gradient(270deg, transparent, rgba(0, 204, 185, 0.2));
}

.rejoin-separator__label {
  font-size: 0.5rem;
  font-weight: 700;
  letter-spacing: 0.25em;
  color: #00CCB9;
  opacity: 0.6;
  white-space: nowrap;
}

/* ── Rejoin button ── */
.rejoin-btn {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.7rem 1rem;
  background: rgba(0, 204, 185, 0.05);
  border: 1px solid rgba(0, 204, 185, 0.25);
  cursor: pointer;
  width: 100%;
  text-align: left;
  transition: background 0.15s, border-color 0.15s;
}

.rejoin-btn:hover {
  background: rgba(0, 204, 185, 0.1);
  border-color: rgba(0, 204, 185, 0.5);
}

.rejoin-btn__dot {
  width: 0.4rem;
  height: 0.4rem;
  border-radius: 50%;
  background: #00CCB9;
  flex-shrink: 0;
  animation: pulse-dot 2s ease-in-out infinite;
}

.rejoin-btn__text {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}

.rejoin-btn__label {
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  color: #00CCB9;
}

.rejoin-btn__sub {
  font-size: 0.55rem;
  color: #4a8a84;
  letter-spacing: 0.05em;
}

.rejoin-btn__arrow {
  width: 0.85rem;
  height: 0.85rem;
  color: #00CCB9;
  flex-shrink: 0;
}

@keyframes pulse-dot {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(0.75); }
}

/* ── Join error ── */
.join-error {
  font-size: 0.6rem;
  color: #e06060;
  letter-spacing: 0.05em;
  text-align: center;
  margin: 0;
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
