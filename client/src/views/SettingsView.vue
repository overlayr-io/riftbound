<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()
const version = __APP_VERSION__
</script>

<template>
  <div class="settings">

    <!-- Header -->
    <div class="settings-header">
      <button class="back-btn" @click="router.push('/')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"/>
        </svg>
      </button>
      <div>
        <span class="settings-eyebrow">RIFTBOUND</span>
        <h2 class="settings-title">PARAMÈTRES</h2>
      </div>
    </div>

    <!-- Body -->
    <div class="settings-body">

      <!-- ── Raccourcis ── -->
      <section class="section">
        <div class="section-header">
          <svg class="section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6.75 7.5l3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0021 18V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v12a2.25 2.25 0 002.25 2.25z"/>
          </svg>
          RACCOURCIS
        </div>
        <div class="section-body">

          <div class="shortcut-group-label">CARTES</div>
          <div class="shortcut-list">
            <div class="shortcut-row">
              <span class="shortcut-desc">Défausser une carte</span>
              <div class="shortcut-keys"><kbd>D</kbd></div>
            </div>
            <div class="shortcut-row">
              <span class="shortcut-desc">Ajouter une carte au stack</span>
              <div class="shortcut-keys"><kbd>S</kbd></div>
            </div>
            <div class="shortcut-row">
              <span class="shortcut-desc">Grouper deux cartes</span>
              <div class="shortcut-keys"><kbd>G</kbd></div>
            </div>
          </div>

          <div class="shortcut-group-label">JEU</div>
          <div class="shortcut-list">
            <div class="shortcut-row">
              <span class="shortcut-desc">Ouvrir / fermer le chat</span>
              <div class="shortcut-keys"><kbd>C</kbd></div>
            </div>
            <div class="shortcut-row">
              <span class="shortcut-desc">Ouvrir / fermer les emotes</span>
              <div class="shortcut-keys"><kbd>E</kbd></div>
            </div>
            <div class="shortcut-row">
              <span class="shortcut-desc">Ouvrir / fermer les tokens</span>
              <div class="shortcut-keys"><kbd>T</kbd></div>
            </div>
            <div class="shortcut-row">
              <span class="shortcut-desc">Confirmer les flèches</span>
              <div class="shortcut-keys"><kbd>Entrée</kbd></div>
            </div>
            <div class="shortcut-row">
              <span class="shortcut-desc">Envoyer un message</span>
              <div class="shortcut-keys"><kbd>Entrée</kbd></div>
            </div>
          </div>

          <div class="shortcut-group-label">OVERLAYS</div>
          <div class="shortcut-list">
            <div class="shortcut-row">
              <span class="shortcut-desc">Fermer / annuler</span>
              <div class="shortcut-keys"><kbd>Échap</kbd></div>
            </div>
          </div>

        </div>
      </section>

    </div>

    <!-- Footer -->
    <div class="settings-footer">
      <span class="version-label">v{{ version }}</span>
    </div>

  </div>
</template>

<style scoped>
.settings {
  width: min(640px, 90vw);
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  max-height: 82vh;
  overflow: hidden;
}

/* Header */
.settings-header { display: flex; align-items: center; gap: 1rem; flex-shrink: 0; }
.back-btn {
  display: flex; align-items: center; justify-content: center;
  width: 2rem; height: 2rem;
  border: 1px solid rgba(200,170,110,0.25);
  background: rgba(10,21,37,0.6); color: #8aabb0;
  cursor: pointer; transition: color 0.15s, border-color 0.15s; flex-shrink: 0;
}
.back-btn svg { width: 1rem; height: 1rem; }
.back-btn:hover { color: #C8AA6E; border-color: #C8AA6E; }
.settings-eyebrow { display: block; font-size: 0.6rem; letter-spacing: 0.4em; color: #00CCB9; font-weight: 700; }
.settings-title { font-size: 1.4rem; font-weight: 900; letter-spacing: 0.15em; color: #F2E5CD; }

/* Body */
.settings-body {
  flex: 1; overflow-y: auto;
  display: flex; flex-direction: column; gap: 0.6rem;
  padding-right: 0.25rem;
  scrollbar-width: thin; scrollbar-color: #1a3050 transparent;
}

/* Section */
.section {
  background: linear-gradient(180deg, #0a1828 0%, #060f1b 100%);
  border: 1px solid rgba(200,170,110,0.12);
}
.section-header {
  display: flex; align-items: center; gap: 0.5rem;
  padding: 0.55rem 1rem;
  border-bottom: 1px solid rgba(200,170,110,0.1);
  font-size: 0.6rem; font-weight: 700; letter-spacing: 0.3em; color: #4a6a70;
}
.section-icon { width: 1rem; height: 1rem; color: #C8AA6E; flex-shrink: 0; }
.section-body { padding: 0.875rem; display: flex; flex-direction: column; gap: 0.875rem; }

/* Shortcuts */
.shortcut-group-label {
  font-size: 0.55rem; font-weight: 700; letter-spacing: 0.3em; color: #00CCB9;
  padding-bottom: 0.25rem; border-bottom: 1px solid rgba(0,204,185,0.15);
}
.shortcut-list { display: flex; flex-direction: column; gap: 0.5rem; }
.shortcut-row {
  display: flex; align-items: center; justify-content: space-between;
}
.shortcut-desc { font-size: 0.78rem; color: #8aabb0; }
.shortcut-keys { display: flex; align-items: center; gap: 0.25rem; }
kbd {
  display: inline-flex; align-items: center; justify-content: center;
  padding: 0.15rem 0.45rem;
  background: rgba(6,15,27,0.9);
  border: 1px solid rgba(200,170,110,0.25);
  border-bottom-width: 2px;
  font-size: 0.6rem; font-weight: 700; letter-spacing: 0.05em;
  color: #C8AA6E;
  font-family: inherit;
  min-width: 1.5rem; text-align: center;
}

/* Footer */
.settings-footer {
  flex-shrink: 0;
  display: flex;
  justify-content: center;
  padding-top: 0.25rem;
}
.version-label {
  font-size: 0.55rem;
  letter-spacing: 0.3em;
  color: #2a4a50;
  text-transform: uppercase;
}
</style>
