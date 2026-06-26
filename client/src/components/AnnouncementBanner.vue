<script setup lang="ts">
import { onMounted, ref } from 'vue'
import type { AnnouncementLevel } from '@riftbound/shared'
import { publicApi, type AnnouncementDto } from '@/services/publicApi'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const items = ref<AnnouncementDto[]>([])
const dismissed = ref<Set<string>>(new Set())

onMounted(async () => {
  await auth.waitForInit()
  try { items.value = await publicApi.announcements() } catch { /* noop */ }
})

function dismiss(id: string) {
  const s = new Set(dismissed.value); s.add(id); dismissed.value = s
}
const levelClass: Record<AnnouncementLevel, string> = { info: 'lvl-info', warning: 'lvl-warning', critical: 'lvl-critical' }
</script>

<template>
  <div class="ann-stack">
    <div
      v-for="a in items.filter(i => !dismissed.has(i.id))"
      :key="a.id"
      class="ann"
      :class="levelClass[a.level]"
    >
      <span class="ann-msg">{{ a.message }}</span>
      <button class="ann-x" @click="dismiss(a.id)">✕</button>
    </div>
  </div>
</template>

<style scoped>
.ann-stack { position: fixed; top: 0; left: 0; right: 0; z-index: 500; display: flex; flex-direction: column; }
.ann {
  display: flex; align-items: center; justify-content: center; gap: 1rem;
  padding: 0.5rem 2.5rem 0.5rem 1rem; font-size: 0.85rem; position: relative; text-align: center;
}
.lvl-info { background: rgba(0,204,185,0.15); color: #aef3ec; border-bottom: 1px solid rgba(0,204,185,0.3); }
.lvl-warning { background: rgba(200,170,110,0.18); color: #f2e5cd; border-bottom: 1px solid rgba(200,170,110,0.4); }
.lvl-critical { background: rgba(255,107,107,0.2); color: #ffd9d9; border-bottom: 1px solid rgba(255,107,107,0.45); }
.ann-x { position: absolute; right: 0.75rem; background: none; border: none; color: inherit; cursor: pointer; opacity: 0.6; }
.ann-x:hover { opacity: 1; }
</style>
