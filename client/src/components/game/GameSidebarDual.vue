<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useGameStore } from '@/stores/game'
import { useViewport } from '@/composables/useViewport.ts'
import { useGameEmote } from '@/composables/useGameEmote'
import { useGameChat } from '@/composables/useGameChat'
import GameChatPanel from './GameChatPanel.vue'
import GameQuitConfirm from './GameQuitConfirm.vue'
import GameEmotePanel from './GameEmotePanel.vue'
import GameEmoteDisplay from './GameEmoteDisplay.vue'

const { SIDEBAR_WIDTH } = useViewport()
const gameStore = useGameStore()

const isMyTurn = computed(() => {
  const uid = gameStore.myUid
  return !!uid && gameStore.currentRound?.currentTurn?.playerId === uid
})

const turnCount = computed(() => gameStore.currentRound?.currentTurn?.turn ?? 0)

// ── Local scores (client-side only) ──────────────────────────────────────────
const myScore = ref(0)
const oppScore = ref(0)

function changeMyScore(delta: number) {
  myScore.value = Math.max(0, myScore.value + delta)
  const uid = gameStore.myUid
  if (uid) {
    const sign = delta > 0 ? `+${delta}` : `${delta}`
    gameStore.writeLog(`${gameStore.actorName(uid)} : score ${sign} → ${myScore.value} pt(s)`, uid)
  }
}

// ── Panels ────────────────────────────────────────────────────────────────────
const isChatOpen = ref(false)
const isEmoteOpen = ref(false)
const showQuitConfirm = ref(false)

function confirmLeave() {
  showQuitConfirm.value = false
  // TODO: leave room + router.push('/')
}

// ── Chat badge (unread count) ─────────────────────────────────────────────────
const { messages: chatMessages } = useGameChat(() => gameStore.gameId)
const lastSeenCount = ref(0)

watch(isChatOpen, open => {
  if (open) lastSeenCount.value = chatMessages.value.length
})

const unreadCount = computed(() =>
  isChatOpen.value ? 0 : Math.max(0, chatMessages.value.length - lastSeenCount.value)
)

// ── Emotes (RTDB real-time) ───────────────────────────────────────────────────
const myName = computed(() => {
  const uid = gameStore.myUid
  return uid ? (gameStore.playerNames[uid]?.name ?? 'Moi') : 'Moi'
})

const { latestEmote, sendEmote } = useGameEmote(
  () => gameStore.gameId,
  () => gameStore.myUid,
  () => myName.value,
)

// Drive the display from the latest RTDB emote event
const displayEmoteId = ref<string | null>(null)
const displayEmoteAuthor = ref<string>('')
let displayResetTimer: ReturnType<typeof setTimeout> | null = null

watch(latestEmote, ev => {
  if (!ev) return
  if (displayResetTimer) clearTimeout(displayResetTimer)
  // Reset first so the watcher in GameEmoteDisplay fires on same emoteId re-send
  displayEmoteId.value = null
  requestAnimationFrame(() => {
    displayEmoteId.value = ev.emoteId
    displayEmoteAuthor.value = ev.playerName
    displayResetTimer = setTimeout(() => { displayEmoteId.value = null }, 3500)
  })
})

function onEmoteSelect(id: string) {
  sendEmote(id)
}

function onKey(e: KeyboardEvent) {
  if (e.repeat) return
  const tag = (e.target as HTMLElement).tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA') return
  if (e.key.toLowerCase() === 'e') isEmoteOpen.value = !isEmoteOpen.value
}

onMounted(() => document.addEventListener('keydown', onKey))
onUnmounted(() => document.removeEventListener('keydown', onKey))
</script>

<template>
  <aside
    class="sidebar"
    :style="{ width: `${SIDEBAR_WIDTH}px` }"
    :class="isMyTurn ? 'sidebar--my-turn' : 'sidebar--opp-turn'"
  >

    <!-- ── Bouton rejouer (tout en haut, isolé) ── -->
    <div class="top-section">
      <button class="sidebar-btn sidebar-btn--restart" title="Rejouer">
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
        </svg>
      </button>
    </div>

    <div class="sidebar-divider" />

    <!-- ── Score adversaire ── -->
    <div class="score-display">
      <span class="score-display__value">{{ oppScore }}</span>
      <span class="score-display__label">pts</span>
    </div>

    <!-- ── Centre ── -->
    <div class="center-section">
      <div class="turn-counter">
        <span class="turn-counter__label">Tour</span>
        <span class="turn-counter__value">{{ turnCount }}</span>
      </div>
    </div>

    <!-- ── Score joueur local avec +/- ── -->
    <div class="player-score">
      <button class="score-btn pb-1" title="+1 rune" @click="changeMyScore(1)">▲</button>
      <div class="score-display">
        <span class="score-display__value">{{ myScore }}</span>
        <span class="score-display__label">pts</span>
      </div>
      <button class="score-btn pb-2" title="-1 rune" @click="changeMyScore(-1)">▼</button>
    </div>

    <div class="sidebar-divider" />

    <!-- ── Contrôles joueur ── -->
    <div class="controls-section">

      <!-- Fin de tour -->
      <button
        class="end-turn-btn"
        :class="{ active: isMyTurn }"
        :disabled="!isMyTurn"
        title="Fin de tour"
      >
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
        </svg>
      </button>

      <!-- Chat -->
      <button
        class="sidebar-btn chat-btn"
        :class="{ 'sidebar-btn--active': isChatOpen }"
        title="Chat (C)"
        @click="isChatOpen = !isChatOpen"
      >
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.77 9.77 0 01-4.41-1.045L3 21l1.356-4.122C3.499 15.606 3 13.853 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        <span v-if="unreadCount > 0" class="chat-badge">{{ unreadCount > 9 ? '9+' : unreadCount }}</span>
      </button>

      <!-- Émotes -->
      <button class="sidebar-btn" :class="{ 'sidebar-btn--active': isEmoteOpen }" title="Émotes (E)" @click="isEmoteOpen = !isEmoteOpen">
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
            d="M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </button>

      <!-- Token -->
      <button class="sidebar-btn" title="Créer un token (T)">
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <circle cx="12" cy="8" r="4" stroke-linecap="round"/>
          <path stroke-linecap="round" stroke-linejoin="round" d="M4 20c0-3.314 3.582-6 8-6s8 2.686 8 6"/>
        </svg>
      </button>

      <!-- Supprimer les flèches -->
      <button
        class="sidebar-btn opacity-30 cursor-not-allowed"
        title="Supprimer toutes les flèches (Échap)"
        disabled
      >
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
          <path d="M5 12h11M13 8l4 4-4 4" />
          <line x1="18" y1="4" x2="22" y2="8" stroke-width="2" />
          <line x1="22" y1="4" x2="18" y2="8" stroke-width="2" />
        </svg>
      </button>

      <div class="sidebar-divider" />

      <!-- Quitter -->
      <button
        class="sidebar-btn sidebar-btn--quit"
        title="Quitter la partie"
        @click="showQuitConfirm = true"
      >
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round"
            d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
        </svg>
      </button>

    </div>
  </aside>

  <GameChatPanel
    :open="isChatOpen"
    :sidebar-width="SIDEBAR_WIDTH"
    :game-id="gameStore.gameId"
    :my-uid="gameStore.myUid"
    @update:open="isChatOpen = $event"
  />

  <GameEmotePanel
    :open="isEmoteOpen"
    :sidebar-width="SIDEBAR_WIDTH"
    @update:open="isEmoteOpen = $event"
    @select="onEmoteSelect"
  />

  <GameEmoteDisplay
    :emote-id="displayEmoteId"
    :author-name="displayEmoteAuthor"
  />

  <GameQuitConfirm
    :open="showQuitConfirm"
    @cancel="showQuitConfirm = false"
    @confirm="confirmLeave"
  />
</template>

<style scoped>
@reference "tailwindcss";

/* ── Sidebar shell ── */
.sidebar {
  @apply flex flex-col items-center z-50 shrink-0;
  background: linear-gradient(180deg, #060f1b 0%, #040a14 100%);
  border-right: 1px solid rgba(200, 170, 110, 0.1);
  padding: 0.5rem 0;
  gap: 0.25rem;
  transition: border-right-color 0.4s ease, box-shadow 0.4s ease;
}

/* ── Indicateur de tour ── */
.sidebar--my-turn {
  border-right: 2px solid rgba(200, 170, 110, 0.7);
  box-shadow: inset -10px 0 28px rgba(200, 170, 110, 0.07);
}
.sidebar--opp-turn {
  border-right: 1px solid rgba(80, 120, 180, 0.25);
  box-shadow: none;
}

/* ── Divider ── */
.sidebar-divider {
  width: 1.5rem;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(200, 170, 110, 0.2), transparent);
  flex-shrink: 0;
  margin: 0.25rem 0;
}

/* ── Base button ── */
.sidebar-btn {
  @apply w-8 h-8 flex items-center justify-center rounded text-[#8aabb0] hover:text-[#C8AA6E] hover:bg-[#1a3050] transition-all duration-150 active:scale-90;
}

.sidebar-btn--active {
  color: #C8AA6E;
  background: rgba(200, 170, 110, 0.1);
}

/* ── Chat badge ── */
.chat-btn {
  position: relative;
}
.chat-badge {
  position: absolute;
  top: 1px;
  right: 1px;
  min-width: 14px;
  height: 14px;
  padding: 0 3px;
  border-radius: 7px;
  background: #e05050;
  color: #fff;
  font-size: 0.45rem;
  font-weight: 700;
  line-height: 14px;
  text-align: center;
  pointer-events: none;
  animation: badge-pop 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
}
@keyframes badge-pop {
  from { transform: scale(0); }
  to   { transform: scale(1); }
}

/* ── Restart button ── */
.sidebar-btn--restart {
  color: #4a6a70;
}
.sidebar-btn--restart:hover {
  color: #C8AA6E;
  background: rgba(200, 170, 110, 0.08);
}

/* ── Quit button ── */
.sidebar-btn--quit {
  color: #f56565;
  border: 1px solid #f56565;
}
.sidebar-btn--quit:hover {
  color: black;
  background: #f56565;
  border-color: rgba(192, 57, 43, 0.45);
}

/* ── Top section ── */
.top-section {
  @apply flex flex-col items-center;
  padding: 0.25rem 0 0.1rem;
}

/* ── Score display ── */
.score-display {
  @apply flex flex-col items-center;
  line-height: 1;
  padding: 0.25rem 0;
}
.score-display__value {
  font-size: 1.1rem;
  font-weight: 700;
  color: #C8AA6E;
  line-height: 1;
}
.score-display__label {
  font-size: 0.45rem;
  font-weight: 700;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: #2a4a50;
  margin-top: 1px;
}

/* ── Center section ── */
.center-section {
  @apply flex-1 flex flex-col items-center justify-center;
  gap: 0.5rem;
}

/* ── Turn counter ── */
.turn-counter {
  @apply flex flex-col items-center;
  gap: 1px;
}
.turn-counter__label {
  font-size: 0.45rem;
  font-weight: 700;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: #C8AA6E;
  line-height: 1;
}
.turn-counter__value {
  font-size: 1rem;
  font-weight: 700;
  color: #F2E5CD;
  line-height: 1;
}

/* ── Player score ── */
.player-score {
  @apply flex flex-col items-center;
  gap: 1px;
}
.score-btn {
  @apply text-[#C8AA6E] text-[9px] leading-none px-1 hover:text-[#F2E5CD] transition-colors cursor-pointer active:scale-90;
}

/* ── Controls section ── */
.controls-section {
  @apply flex flex-col items-center;
  gap: 0.35rem;
  padding-bottom: 0.25rem;
}

/* ── End turn button ── */
.end-turn-btn {
  @apply w-8 h-8 flex items-center justify-center rounded text-[#4a6a70] transition-all duration-150;
  border: 1px solid rgba(200, 170, 110, 0.12);
}
.end-turn-btn.active {
  @apply text-[#C8AA6E] cursor-pointer active:scale-90;
  border-color: rgba(200, 170, 110, 0.45);
  box-shadow: 0 0 8px rgba(200, 170, 110, 0.2);
}
.end-turn-btn.active:hover {
  background: rgba(200, 170, 110, 0.08);
  border-color: #C8AA6E;
}
.end-turn-btn:disabled { cursor: not-allowed; }
</style>
