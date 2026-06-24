<script setup lang="ts">
import { watch, ref } from 'vue'

const props = defineProps<{ emoteId: string | null; authorName?: string }>()

const EMOTES: Record<string, string> = {
  gg: '👍', haha: '😂', wow: '😮', think: '🤔',
  oof: '😤', fire: '🔥', salute: '👋', skull: '💀',
  cry: '😭', cool: '😎', angry: '😡', clap: '👏',
  lightning: '⚡', sword: '⚔️', shield: '🛡️', crown: '👑',
}

const visible = ref(false)
const emoji = ref('')
let timer: ReturnType<typeof setTimeout> | null = null

watch(() => props.emoteId, (id) => {
  if (!id || !EMOTES[id]) return
  if (timer) clearTimeout(timer)
  emoji.value = EMOTES[id]
  visible.value = true
  timer = setTimeout(() => { visible.value = false }, 3000)
})
</script>

<template>
  <Teleport to="body">
    <Transition name="ed">
      <div v-if="visible" class="emote-display">{{ emoji }}</div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.emote-display {
  position: fixed;
  inset: 0;
  z-index: 300;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 8rem;
  line-height: 1;
  pointer-events: none;
  filter: drop-shadow(0 8px 24px rgba(0, 0, 0, 0.6));
}

.ed-enter-active {
  transition: opacity 0.2s ease, transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.ed-leave-active {
  transition: opacity 0.5s ease, transform 0.5s ease;
}
.ed-enter-from { opacity: 0; transform: scale(0.4); }
.ed-leave-to   { opacity: 0; transform: scale(1.2); }
</style>
