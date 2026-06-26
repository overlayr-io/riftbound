<script setup lang="ts">
import { onMounted, onUnmounted, computed } from 'vue'

const props = defineProps<{ open: boolean; sidebarWidth: number }>()
const emit = defineEmits<{
  'update:open': [value: boolean]
  'select': [emoteId: string]
}>()

const gridLeft = computed(() => props.sidebarWidth + 'px')

interface Emote { id: string; emoji: string; label: string }

const EMOTES: Emote[] = [
  { id: 'gg',        emoji: '👍', label: 'GG' },
  { id: 'haha',      emoji: '😂', label: 'Haha' },
  { id: 'wow',       emoji: '😮', label: 'Wow' },
  { id: 'think',     emoji: '🤔', label: 'Hmm' },
  { id: 'oof',       emoji: '😤', label: 'Pfff' },
  { id: 'fire',      emoji: '🔥', label: 'Feu' },
  { id: 'salute',    emoji: '👋', label: 'Salut' },
  { id: 'skull',     emoji: '💀', label: 'GG WP' },
  { id: 'cry',       emoji: '😭', label: 'Non!' },
  { id: 'cool',      emoji: '😎', label: 'Cool' },
  { id: 'angry',     emoji: '😡', label: 'Rage' },
  { id: 'clap',      emoji: '👏', label: 'Bravo' },
  { id: 'lightning', emoji: '⚡', label: 'Éclair' },
  { id: 'sword',     emoji: '⚔️',  label: 'Combat' },
  { id: 'shield',    emoji: '🛡️',  label: 'Défense' },
  { id: 'crown',     emoji: '👑', label: 'Roi' },
]

function select(emote: Emote) {
  emit('select', emote.id)
  emit('update:open', false)
}

function onKey(e: KeyboardEvent) {
  if (e.key.toLowerCase() !== 'e') return
  const tag = (e.target as HTMLElement).tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA') return
  emit('update:open', false)
}

onMounted(() => document.addEventListener('keydown', onKey))
onUnmounted(() => document.removeEventListener('keydown', onKey))
</script>

<template>
  <Teleport to="body">
    <Transition name="ep">
      <div v-if="open" class="emote-panel">
        <div class="emote-header">
          <span class="emote-header__title">Émotes</span>
          <button class="emote-header__close" @click="$emit('update:open', false)">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div class="emote-header-sep" />
        <div class="emote-grid">
          <button
            v-for="emote in EMOTES"
            :key="emote.id"
            class="emote-btn"
            :title="emote.label"
            @click="select(emote)"
          >{{ emote.emoji }}</button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.emote-panel {
  position: fixed;
  z-index: 9000;
  left: calc(v-bind(gridLeft) + 8px);
  bottom: 4rem;
}

.emote-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.3rem;
  padding: 0.5rem;
  background: linear-gradient(160deg, #0c1d33 0%, #060d1a 100%);
  border: 1px solid rgba(200, 170, 110, 0.22);
  border-radius: 8px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.7);
}

.emote-btn {
  font-size: 1.4rem;
  line-height: 1;
  padding: 0.4rem;
  border-radius: 6px;
  cursor: pointer;
  background: transparent;
  border: 1px solid transparent;
  transition: background 0.1s, transform 0.1s;
}
.emote-btn:hover {
  background: rgba(200, 170, 110, 0.1);
  border-color: rgba(200, 170, 110, 0.2);
  transform: scale(1.15);
}
.emote-btn:active { transform: scale(0.9); }

.emote-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 5px 8px 7px 12px;
}
.emote-header__title {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #C8AA6E;
}
.emote-header__close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 3px;
  color: #4a6a70;
  cursor: pointer;
  transition: color 0.12s, background 0.12s;
}
.emote-header__close:hover {
  color: #C8AA6E;
  background: rgba(200, 170, 110, 0.1);
}
.emote-header-sep {
  height: 1px;
  background: rgba(200, 170, 110, 0.15);
  margin: 0 0 3px;
}

.ep-enter-active, .ep-leave-active { transition: opacity 0.12s ease, transform 0.12s ease; }
.ep-enter-from, .ep-leave-to { opacity: 0; transform: translateY(6px) scale(0.97); }
</style>
