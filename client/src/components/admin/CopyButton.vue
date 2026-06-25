<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{ value: string }>()
const copied = ref(false)

async function copy(e?: Event) {
  e?.stopPropagation()
  try {
    await navigator.clipboard.writeText(props.value)
  } catch {
    // Fallback navigateurs sans Clipboard API
    const ta = document.createElement('textarea')
    ta.value = props.value
    document.body.appendChild(ta)
    ta.select()
    try { document.execCommand('copy') } catch { /* noop */ }
    ta.remove()
  }
  copied.value = true
  setTimeout(() => { copied.value = false }, 1400)
}
</script>

<template>
  <button class="copy" :class="{ ok: copied }" :title="`Copier ${value}`" @click="copy">
    <svg v-if="!copied" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7">
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15V5a2 2 0 012-2h10" stroke-linecap="round" />
    </svg>
    <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M5 12l4 4 10-10" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
    <span v-if="copied" class="lbl">copié</span>
  </button>
</template>

<style scoped>
.copy {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  background: var(--adm-raise, #111927);
  border: 1px solid var(--adm-border, #1b2435);
  color: var(--adm-text-dim, #8a93a5);
  border-radius: 6px;
  padding: 0.25rem 0.4rem;
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s, background 0.15s;
  vertical-align: middle;
}
.copy:hover { color: var(--adm-gold, #c8aa6e); border-color: var(--adm-border-gold, rgba(200,170,110,0.22)); }
.copy.ok { color: var(--adm-ok, #4fd6a0); border-color: rgba(79,214,160,0.3); }
.copy svg { width: 14px; height: 14px; }
.lbl { font-size: 0.66rem; font-weight: 700; letter-spacing: 0.04em; }
</style>
