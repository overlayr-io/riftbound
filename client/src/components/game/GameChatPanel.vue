<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import dayjs from 'dayjs'
import { OUTSIDE_MARGIN, INSIDE_MARGIN, DEFAULT_CARD_RATIO, useCardSize } from '@/composables/useCardSize'
import { useViewport } from '@/composables/useViewport'
import { useGameChat } from '@/composables/useGameChat'
import { useGameLogs } from '@/composables/useGameLogs'

const props = defineProps<{
  open: boolean
  sidebarWidth: number
  gameId: string | null
  myUid: string | null
}>()
defineEmits<{ 'update:open': [value: boolean] }>()

const { cardH } = useCardSize()
const { SIDEBAR_WIDTH } = useViewport()

const chatLeft = computed(() => {
  const cardSlotW = Math.round(cardH.value * DEFAULT_CARD_RATIO) + INSIDE_MARGIN * 2
  const deckSlotW = Math.round(cardSlotW * 0.90)
  return SIDEBAR_WIDTH + OUTSIDE_MARGIN + deckSlotW
})

// ── Tabs ──────────────────────────────────────────────────────────────────────
const activeTab = ref<'chat' | 'logs'>('chat')

// ── Chat ──────────────────────────────────────────────────────────────────────
const { messages, sending, send } = useGameChat(() => props.gameId)
const inputText = ref('')
const messagesEl = ref<HTMLElement | null>(null)

async function onSend() {
  if (!inputText.value.trim() || sending.value) return
  const ok = await send(inputText.value)
  if (ok) inputText.value = ''
}

// Auto-scroll to bottom on new messages
watch(messages, async () => {
  await nextTick()
  if (messagesEl.value) messagesEl.value.scrollTop = messagesEl.value.scrollHeight
}, { deep: true })

// ── Logs ──────────────────────────────────────────────────────────────────────
const { logs, loading: logsLoading, fetchLogs } = useGameLogs(() => props.gameId)

watch(activeTab, tab => {
  if (tab === 'logs') fetchLogs()
})

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatTime(date: Date | null | undefined): string {
  if (!date) return ''
  return dayjs(date).format('HH:mm')
}
</script>

<template>
  <Teleport to="body">
    <Transition name="chat">
      <div v-if="props.open" class="chat-panel" :style="{ left: chatLeft + 'px' }">

        <!-- Header with tabs -->
        <div class="chat-header">
          <div class="chat-tabs">
            <button
              class="chat-tab"
              :class="{ 'chat-tab--active': activeTab === 'chat' }"
              @click="activeTab = 'chat'"
            >Chat</button>
            <button
              class="chat-tab"
              :class="{ 'chat-tab--active': activeTab === 'logs' }"
              @click="activeTab = 'logs'"
            >Logs</button>
          </div>
        </div>

        <!-- Chat tab -->
        <template v-if="activeTab === 'chat'">
          <div ref="messagesEl" class="chat-messages">
            <div class="flex flex-col gap-1 p-2">
              <div
                v-for="msg in messages"
                :key="msg.messageId"
                class="chat-msg"
                :class="msg.playerId === props.myUid ? 'chat-msg--mine' : 'chat-msg--theirs'"
              >
                <span v-if="msg.playerId !== props.myUid" class="chat-msg__author">{{ msg.playerName }}</span>
                <span class="chat-msg__text">{{ msg.text }}</span>
                <span class="chat-msg__time">{{ formatTime(msg.sentAt) }}</span>
              </div>
              <div v-if="messages.length === 0" class="chat-empty">Aucun message</div>
            </div>
          </div>

          <div class="chat-input-row">
            <input
              v-model="inputText"
              class="chat-input"
              placeholder="Message..."
              maxlength="200"
              :disabled="sending"
              @keydown.enter.prevent="onSend"
            />
            <button class="chat-send-btn" :disabled="sending" @click="onSend">
              <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
              </svg>
            </button>
          </div>
        </template>

        <!-- Logs tab -->
        <template v-else>
          <div class="chat-messages">
            <div v-if="logsLoading" class="chat-empty">Chargement...</div>
            <div v-else class="flex flex-col gap-1 p-2">
              <div v-for="log in logs" :key="log.logId" class="log-entry">
                <span class="log-entry__time">{{ formatTime(log.createdAt) }}</span>
                <span class="log-entry__text">{{ log.description }}</span>
              </div>
              <div v-if="logs.length === 0" class="chat-empty">Aucun événement</div>
            </div>
          </div>
        </template>

      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
@reference "tailwindcss";

.chat-panel {
  position: fixed;
  z-index: 100;
  bottom: 0;
  width: 260px;
  height: 320px;
  display: flex;
  flex-direction: column;
  background: linear-gradient(160deg, #0b1a2e 0%, #060d1a 100%);
  border: 1px solid rgba(200, 170, 110, 0.18);
  border-bottom: none;
  border-radius: 6px 6px 0 0;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
  overflow: hidden;
}

.chat-header {
  display: flex;
  align-items: stretch;
  border-bottom: 1px solid rgba(200, 170, 110, 0.12);
  flex-shrink: 0;
}

.chat-tabs { display: flex; flex: 1; }

.chat-tab {
  flex: 1;
  padding: 0.4rem 0.6rem;
  font-size: 0.6rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  color: #2a4a50;
  border-bottom: 2px solid transparent;
  transition: color 0.15s, border-color 0.15s;
  cursor: pointer;
}
.chat-tab--active { color: #C8AA6E; border-bottom-color: #C8AA6E; }
.chat-tab:not(.chat-tab--active):hover { color: #6a8a90; }

.chat-messages {
  flex: 1;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(200, 170, 110, 0.2) transparent;
}
.chat-messages::-webkit-scrollbar { width: 3px; }
.chat-messages::-webkit-scrollbar-track { background: transparent; }
.chat-messages::-webkit-scrollbar-thumb { background: rgba(200, 170, 110, 0.2); border-radius: 2px; }

.chat-empty {
  text-align: center;
  font-size: 0.65rem;
  color: #2a4a50;
  padding: 1rem 0;
}

.chat-msg {
  display: flex;
  flex-direction: column;
  max-width: 80%;
  gap: 1px;
}
.chat-msg--theirs { align-self: flex-start; }
.chat-msg--mine   { align-self: flex-end; align-items: flex-end; }

.chat-msg__author {
  font-size: 0.55rem;
  font-weight: 600;
  color: #4a6a70;
  padding: 0 0.5rem;
}
.chat-msg__text {
  font-size: 0.7rem;
  line-height: 1.4;
  padding: 0.35rem 0.55rem;
  word-break: break-word;
}
.chat-msg--theirs .chat-msg__text {
  background: #0e1e30;
  color: #8aabb0;
  border: 1px solid #1a3050;
  border-radius: 0 6px 6px 6px;
}
.chat-msg--mine .chat-msg__text {
  background: #1a3a5a;
  color: #F2E5CD;
  border: 1px solid #1a4060;
  border-radius: 6px 0 6px 6px;
}
.chat-msg__time {
  font-size: 0.5rem;
  color: #2a4a50;
  padding: 0 0.3rem;
}

.log-entry {
  display: flex;
  gap: 0.4rem;
  align-items: baseline;
  padding: 0.15rem 0.1rem;
  border-bottom: 1px solid rgba(200, 170, 110, 0.05);
}
.log-entry__time {
  font-size: 0.5rem;
  color: #2a4a50;
  flex-shrink: 0;
  font-variant-numeric: tabular-nums;
}
.log-entry__text { font-size: 0.65rem; color: #6a8a90; line-height: 1.4; }

.chat-input-row {
  display: flex;
  gap: 0.4rem;
  padding: 0.4rem 0.5rem;
  border-top: 1px solid rgba(200, 170, 110, 0.1);
  flex-shrink: 0;
}
.chat-input {
  flex: 1;
  background: rgba(10, 20, 35, 0.8);
  border: 1px solid rgba(200, 170, 110, 0.15);
  border-radius: 3px;
  color: #F2E5CD;
  font-size: 0.7rem;
  padding: 0.3rem 0.5rem;
  outline: none;
  transition: border-color 0.15s;
}
.chat-input::placeholder { color: #2a4a50; }
.chat-input:focus { border-color: rgba(200, 170, 110, 0.4); }
.chat-input:disabled { opacity: 0.5; }

.chat-send-btn {
  @apply w-7 h-7 flex items-center justify-center rounded text-[#8aabb0] hover:text-[#C8AA6E] hover:bg-[#1a3050] transition-all flex-shrink-0;
}
.chat-send-btn:disabled { opacity: 0.4; cursor: not-allowed; }

.chat-enter-active, .chat-leave-active { transition: opacity 0.15s ease, transform 0.15s ease; }
.chat-enter-from, .chat-leave-to { opacity: 0; transform: translateY(8px); }
</style>
