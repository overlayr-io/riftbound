<script setup lang="ts">
import { useRouter } from 'vue-router'
import { computed } from 'vue'
import { cardZoomScale } from '@/stores/settings'

const router = useRouter()
const version = __APP_VERSION__

const BASE_W = 210
const BASE_H = 294

const previewW = computed(() => Math.round(BASE_W * cardZoomScale.value))
const previewH = computed(() => Math.round(BASE_H * cardZoomScale.value))

const scaleLabel = computed(() => `${Math.round(cardZoomScale.value * 100)}%`)
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

      <!-- ── Affichage ── -->
      <section class="section">
        <div class="section-header">
          <svg class="section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
          </svg>
          AFFICHAGE
        </div>
        <div class="section-body">

          <div class="field">
            <div class="field-label-row">
              <label class="field-label">ZOOM SURVOL DE CARTE</label>
              <span class="field-value">{{ scaleLabel }}</span>
            </div>
            <div class="slider-row">
              <span class="slider-bound">50%</span>
              <input
                type="range"
                class="slider"
                min="0.5"
                max="2"
                step="0.05"
                :value="cardZoomScale"
                @input="cardZoomScale = parseFloat(($event.target as HTMLInputElement).value)"
              />
              <span class="slider-bound">200%</span>
            </div>

            <!-- Aperçu -->
            <div class="preview-area">
              <div class="preview-viewport">
                <div
                  class="preview-card"
                  :style="{ width: previewW + 'px', height: previewH + 'px' }"
                >
                  <div class="preview-card__shine" />
                  <div class="preview-card__cost">3</div>
                  <div class="preview-card__art" />
                  <div class="preview-card__footer">
                    <span class="preview-card__name">Carte exemple</span>
                    <div class="preview-card__stats">
                      <span class="preview-card__atk">4</span>
                      <span class="preview-card__sep">/</span>
                      <span class="preview-card__hp">5</span>
                    </div>
                  </div>
                </div>
              </div>
              <div class="preview-meta">
                <span class="preview-size">{{ previewW }} × {{ previewH }} px</span>
                <button
                  v-if="cardZoomScale !== 1"
                  class="preview-reset"
                  @click="cardZoomScale = 1"
                >
                  Réinitialiser
                </button>
              </div>
            </div>
          </div>

        </div>
      </section>

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

/* Fields */
.field { display: flex; flex-direction: column; gap: 0.6rem; }
.field-label-row { display: flex; align-items: center; justify-content: space-between; }
.field-label { font-size: 0.6rem; font-weight: 700; letter-spacing: 0.25em; color: #00CCB9; }
.field-value { font-size: 0.65rem; font-weight: 700; letter-spacing: 0.1em; color: #C8AA6E; }

/* Slider */
.slider-row { display: flex; align-items: center; gap: 0.6rem; }
.slider-bound { font-size: 0.55rem; color: #2a4a50; letter-spacing: 0.05em; width: 2rem; text-align: center; flex-shrink: 0; }
.slider {
  flex: 1;
  -webkit-appearance: none;
  appearance: none;
  height: 2px;
  background: linear-gradient(
    to right,
    #C8AA6E calc((var(--val, 1) - 0.5) / 1.5 * 100%),
    rgba(200,170,110,0.15) calc((var(--val, 1) - 0.5) / 1.5 * 100%)
  );
  outline: none;
  cursor: pointer;
}
.slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 12px; height: 12px;
  background: #C8AA6E;
  border: 2px solid #0a1828;
  cursor: pointer;
  transition: transform 0.1s;
}
.slider::-webkit-slider-thumb:hover { transform: scale(1.2); }
.slider::-moz-range-thumb {
  width: 12px; height: 12px;
  background: #C8AA6E;
  border: 2px solid #0a1828;
  cursor: pointer;
}

/* Preview */
.preview-area {
  background: rgba(6,15,27,0.6);
  border: 1px solid rgba(200,170,110,0.1);
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.preview-viewport {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 160px;
  overflow: hidden;
}
.preview-card {
  position: relative;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid rgba(200,170,110,0.35);
  box-shadow: 0 8px 24px rgba(0,0,0,0.6), 0 0 0 1px rgba(200,170,110,0.1);
  background: linear-gradient(160deg, #0d2035 0%, #061220 60%, #0a1828 100%);
  transition: width 0.15s ease, height 0.15s ease;
  flex-shrink: 0;
}
.preview-card__shine {
  position: absolute; inset: 0;
  background: linear-gradient(135deg, rgba(200,170,110,0.08) 0%, transparent 50%);
  pointer-events: none;
}
.preview-card__cost {
  position: absolute; top: 6px; left: 6px;
  width: 20px; height: 20px;
  background: rgba(0,204,185,0.15);
  border: 1px solid rgba(0,204,185,0.4);
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 0.6rem; font-weight: 900; color: #00CCB9;
}
.preview-card__art {
  position: absolute;
  top: 14%; left: 5%; right: 5%;
  height: 52%;
  background: linear-gradient(180deg, #1a3050 0%, #0d2035 100%);
  border: 1px solid rgba(200,170,110,0.12);
}
.preview-card__footer {
  position: absolute;
  bottom: 0; left: 0; right: 0;
  padding: 6px 8px 8px;
  background: linear-gradient(0deg, rgba(6,15,27,0.95) 0%, rgba(6,15,27,0.7) 100%);
  display: flex; align-items: center; justify-content: space-between;
  border-top: 1px solid rgba(200,170,110,0.15);
}
.preview-card__name {
  font-size: 0.5rem; font-weight: 700; letter-spacing: 0.08em;
  color: #F2E5CD; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.preview-card__stats { display: flex; align-items: center; gap: 2px; flex-shrink: 0; }
.preview-card__atk { font-size: 0.55rem; font-weight: 900; color: #C8AA6E; }
.preview-card__sep { font-size: 0.45rem; color: #2a4a50; }
.preview-card__hp  { font-size: 0.55rem; font-weight: 900; color: #e06060; }

.preview-meta {
  display: flex; align-items: center; justify-content: space-between;
}
.preview-size {
  font-size: 0.55rem; letter-spacing: 0.15em; color: #2a4a50;
  font-variant-numeric: tabular-nums;
}
.preview-reset {
  font-size: 0.55rem; font-weight: 700; letter-spacing: 0.15em; color: #4a6a70;
  background: transparent; border: none; cursor: pointer; padding: 0;
  transition: color 0.15s;
}
.preview-reset:hover { color: #C8AA6E; }

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
