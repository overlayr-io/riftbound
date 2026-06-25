<script setup lang="ts">
import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()

const initial = computed(() => (auth.user?.email ?? auth.user?.uid ?? '?').slice(0, 1).toUpperCase())
</script>

<template>
  <div>
    <header class="page-head">
      <p class="adm-eyebrow">Vue d'ensemble</p>
      <h1 class="adm-title">Tableau de bord</h1>
    </header>

    <div class="grid">
      <div class="adm-card tile identity">
        <div class="avatar">{{ initial }}</div>
        <div>
          <div class="who">{{ auth.user?.email ?? auth.user?.uid?.slice(0, 12) }}</div>
          <span class="adm-chip adm-chip--gold">{{ auth.role ?? '—' }}</span>
        </div>
      </div>

      <div class="adm-card tile">
        <div class="tile-num">{{ auth.permissions.length }}</div>
        <div class="tile-label">Permissions actives</div>
      </div>

      <div class="adm-card tile">
        <div class="tile-num accent">Phase 0</div>
        <div class="tile-label">Fondation RBAC · audit · sécurité</div>
      </div>
    </div>

    <p class="note">
      Bienvenue dans le backoffice. Les sections apparaissent selon tes permissions.
      D'autres modules (jeux, joueurs, analytics, contenu) s'ajouteront aux phases suivantes.
    </p>
  </div>
</template>

<style scoped>
.page-head { margin-bottom: 1.5rem; }
.page-head .adm-eyebrow { margin-bottom: 0.35rem; }
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1rem;
  margin-bottom: 1.75rem;
}
.tile { padding: 1.25rem 1.4rem; }
.identity { display: flex; align-items: center; gap: 1rem; }
.avatar {
  width: 46px; height: 46px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  border-radius: 50%;
  background: var(--adm-gold-grad);
  color: #1a130a; font-weight: 800; font-size: 1.1rem;
}
.who { color: var(--adm-text); font-size: 0.9rem; margin-bottom: 0.45rem; word-break: break-all; }
.tile-num { font-size: 1.9rem; font-weight: 800; color: var(--adm-text); line-height: 1; }
.tile-num.accent {
  font-size: 1.5rem;
  background: var(--adm-gold-grad);
  -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
}
.tile-label { color: var(--adm-text-dim); font-size: 0.78rem; margin-top: 0.55rem; letter-spacing: 0.03em; }
.note { color: var(--adm-text-dim); font-size: 0.85rem; max-width: 560px; line-height: 1.6; }
</style>
