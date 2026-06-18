<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()
</script>

<template>
  <div class="patch-notes">

    <!-- Header -->
    <div class="patch-notes-header">
      <button class="back-btn" @click="router.push('/')">
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"/>
        </svg>
      </button>
      <div>
        <span class="patch-notes-eyebrow">RIFTBOUND</span>
        <h2 class="patch-notes-title">PATCH NOTES</h2>
      </div>
    </div>

    <!-- Body -->
    <div class="patch-notes-body">
      <div class="empty-state">
        <span class="empty-state__diamond">◆</span>
        <p class="empty-state__text">Aucune mise à jour pour l'instant</p>
        <p class="empty-state__sub">Revenez bientôt</p>
      </div>
    </div>

  </div>
</template>

<style scoped>
.patch-notes {
  width: min(640px, 90vw);
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  max-height: 82vh;
  overflow: hidden;
}

/* Header */
.patch-notes-header { display: flex; align-items: center; gap: 1rem; flex-shrink: 0; }
.back-btn {
  display: flex; align-items: center; justify-content: center;
  width: 2rem; height: 2rem;
  border: 1px solid rgba(200,170,110,0.25);
  background: rgba(10,21,37,0.6); color: #8aabb0;
  cursor: pointer; transition: color 0.15s, border-color 0.15s; flex-shrink: 0;
}
.back-btn:hover { color: #C8AA6E; border-color: #C8AA6E; }
.patch-notes-eyebrow { display: block; font-size: 0.6rem; letter-spacing: 0.4em; color: #00CCB9; font-weight: 700; }
.patch-notes-title { font-size: 1.4rem; font-weight: 900; letter-spacing: 0.15em; color: #F2E5CD; }

/* Body */
.patch-notes-body {
  flex: 1; overflow-y: auto;
  display: flex; flex-direction: column; gap: 0.6rem;
  padding-right: 0.25rem;
  scrollbar-width: thin; scrollbar-color: #1a3050 transparent;
}

/* Empty state */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 4rem 2rem;
  background: linear-gradient(180deg, #0a1828 0%, #060f1b 100%);
  border: 1px solid rgba(200,170,110,0.12);
}

.empty-state__diamond {
  color: #C8AA6E;
  font-size: 1rem;
  opacity: 0.4;
}

.empty-state__text {
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.25em;
  color: #4a6a70;
  text-transform: uppercase;
}

.empty-state__sub {
  font-size: 0.6rem;
  letter-spacing: 0.2em;
  color: #2a4a50;
  text-transform: uppercase;
}
</style>
