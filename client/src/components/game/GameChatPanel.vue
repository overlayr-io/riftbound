<script setup lang="ts">
import { ref, computed } from 'vue'
import { OUTSIDE_MARGIN, INSIDE_MARGIN, DEFAULT_CARD_RATIO, useCardSize } from '@/composables/useCardSize'
import { useViewport } from '@/composables/useViewport'

const props = defineProps<{ open: boolean; sidebarWidth: number }>()
const emit = defineEmits<{ 'update:open': [value: boolean] }>()

const { cardH } = useCardSize()
const { SIDEBAR_WIDTH } = useViewport()

// Reproduce the runes_deck zone position for the local (mirrored) player
const chatLeft = computed(() => {
  const cardSlotW = Math.round(cardH.value * DEFAULT_CARD_RATIO) + INSIDE_MARGIN * 2
  const deckSlotW = Math.round(cardSlotW * 0.90)
  return SIDEBAR_WIDTH + OUTSIDE_MARGIN + deckSlotW
})

const activeTab = ref<'chat' | 'logs'>('chat')
const inputText = ref('')

// Placeholder data for design preview
const messages = [
  { id: 1, isMine: false, authorName: 'Adversaire', text: 'Bonne chance !', timestamp: new Date(Date.now() - 120000) },
  { id: 2, isMine: true,  authorName: 'Moi',         text: 'Merci, à toi aussi.',  timestamp: new Date(Date.now() - 60000)  },
  { id: 3, isMine: false, authorName: 'Adversaire', text: 'Tu joues quoi comme deck ?', timestamp: new Date(Date.now() - 30000) },
]

const logs = [
  { id: 1, text: 'Adversaire a pioché une carte', timestamp: new Date(Date.now() - 90000) },
  { id: 2, text: 'Tu as joué Rune de Feu', timestamp: new Date(Date.now() - 75000) },
  { id: 3, text: 'Adversaire a défaussé 2 cartes', timestamp: new Date(Date.now() - 45000) },
  { id: 4, text: 'Tour 3 — Ton tour', timestamp: new Date(Date.now() - 10000) },
]

function formatTime(date: Date): string {
  return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}
</script>

<template>
  <Teleport to="body">
    <Transition name="chat">
      <div v-if="props.open" class="chat-panel" :style="{ left: chatLeft + 'px' }">

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

        <template v-if="activeTab === 'chat'">
          <div class="chat-messages">
            <div class="flex flex-col-reverse gap-1 p-2">
              <div
                v-for="msg in [...messages].reverse()"
                :key="msg.id"
                class="chat-msg"
                :class="msg.isMine ? 'chat-msg--mine' : 'chat-msg--theirs'"
              >
                <span v-if="!msg.isMine" class="chat-msg__author">{{ msg.authorName }}</span>
                <span class="chat-msg__text">{{ msg.text }}</span>
                <span class="chat-msg__time">{{ formatTime(msg.timestamp) }}</span>
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
            />
            <button class="chat-send-btn">
              <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
              </svg>
            </button>
          </div>
        </template>

        <template v-else>
          <div class="chat-messages">
            <div class="flex flex-col gap-1 p-2">
              <div v-for="log in logs" :key="log.id" class="log-entry">
                <span class="log-entry__time">{{ formatTime(log.timestamp) }}</span>
                <span class="log-entry__text">{{ log.text }}</span>
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

.chat-tabs {
  display: flex;
  flex: 1;
}

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
.chat-tab--active {
  color: #C8AA6E;
  border-bottom-color: #C8AA6E;
}
.chat-tab:not(.chat-tab--active):hover {
  color: #6a8a90;
}

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
.log-entry__text {
  font-size: 0.65rem;
  color: #6a8a90;
  line-height: 1.4;
}

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

.chat-send-btn {
  @apply w-7 h-7 flex items-center justify-center rounded text-[#8aabb0] hover:text-[#C8AA6E] hover:bg-[#1a3050] transition-all flex-shrink-0;
}

.chat-enter-active, .chat-leave-active { transition: opacity 0.15s ease, transform 0.15s ease; }
.chat-enter-from, .chat-leave-to { opacity: 0; transform: translateY(8px); }
</style>
