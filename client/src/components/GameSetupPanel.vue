<script setup lang="ts">
import { ref } from 'vue'
import type { Card, GameSetupStep } from '@riftbound/shared'
import TitleOrnament from './TitleOrnament.vue'
import ActionButton from './ActionButton.vue'

const props = defineProps<{
  setup: GameSetupStep
  battlefields: Card[]
  allDecksDone: boolean
  allBFDone: boolean
  importing: boolean
  importError: string | null
  isTied?: boolean
  myDiceRoll?: number | null
}>()

const emit = defineEmits<{
  importDeck: [text: string]
  selectBattlefield: [card: Card]
  reroll: []
}>()

// ── Step 1: Deck import ───────────────────────────────────────────────────────
const deckText = ref(
  "Legend:\n1 Kha'Zix, Voidreaver\n\nChampion:\n1 Kha'Zix, Evolving Hunter\n\nMainDeck:\n3 Grim Resolve\n3 Irresistible Faefolk\n3 Void Assault\n\nBattlefields:\n1 Monastery of Hirana\n1 The Arena's Greatest\n1 Star Spring\n\nRunes:\n7 Body Rune\n5 Chaos Rune",
)

const FORMAT_EXAMPLE = `Legend:
1 Jinx

Champion:
1 Jinx

MainDeck:
4 Jinx
3 Buccaneer
...

Battlefields:
1 War Camp

Runes:
12 Body Rune`

// ── Step 2: Battlefield selection ─────────────────────────────────────────────
const selectedBFId = ref<string | null>(null)

</script>

<template>
  <!-- ── Step 1: Deck selection ──────────────────────────────────────────── -->
  <template v-if="setup === 'deck_selection'">
    <div class="panel">
      <div class="panel__header">
        <span class="panel__eyebrow">PRÉPARATION</span>
        <h1 class="panel__title">TON DECK</h1>
        <TitleOrnament />
        <p class="panel__sub">Choisis un deck sauvegardé ou importe une nouvelle liste</p>
      </div>

      <div class="tab-bar">
        <div class="tab tab--disabled">
          Choisir un deck
          <span class="tab__badge">BIENTÔT</span>
        </div>
        <div class="tab tab--active">Importer une liste</div>
      </div>

      <div class="import-body">
        <div class="import-main">
          <span class="field-label">LISTE DE DECK</span>
          <textarea v-model="deckText" class="deck-input" spellcheck="false" />
          <p v-if="importError" class="field-error">{{ importError }}</p>
        </div>
        <div class="format-guide">
          <span class="format-title">FORMAT</span>
          <pre class="format-pre">{{ FORMAT_EXAMPLE }}</pre>
        </div>
      </div>

      <div class="panel__footer">
        <div class="footer-hint">Format texte — sections séparées par une ligne vide</div>
        <div>
          <ActionButton
              :variant="importing ? 'locked' : 'primary'"
              :disabled="importing"
              @click="emit('importDeck', deckText)"
          >
            {{ importing ? 'IMPORT EN COURS…' : 'IMPORTER LE DECK' }}
          </ActionButton>
        </div>
      </div>
    </div>
  </template>

  <!-- ── Step 2: Battlefield selection ──────────────────────────────────── -->
  <template v-else-if="setup === 'select_battlefield'">
    <div class="panel">
      <div class="panel__header">
        <span class="panel__eyebrow">PRÉPARATION</span>
        <h1 class="panel__title">CHAMP DE BATAILLE</h1>
        <TitleOrnament />
        <p class="panel__sub">Choisis ton champ de bataille — secret jusqu'à la révélation</p>
      </div>

      <div v-if="!selectedBFId" class="bf-grid">
        <button
          v-for="bf in battlefields"
          :key="bf.id"
          class="bf-card"
          :class="{ 'bf-card--selected': selectedBFId === bf.id }"
          @click="selectedBFId = bf.id; emit('selectBattlefield', bf)"
        >
          <div class="bf-card__img">
            <img v-if="bf.imageUrl" :src="bf.imageUrl" :alt="bf.name" class="bf-card__img-el" />
            <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" class="bf-card__icon">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
          </div>
          <span class="bf-card__name">{{ bf.name }}</span>
        </button>
      </div>

      <!-- Waiting for others after selection -->
      <div v-else class="waiting-zone">
        <div class="waiting-zone__card-preview">
          <div class="waiting-zone__card-name">{{ battlefields.find(b => b.id === selectedBFId)?.name }}</div>
          <span class="waiting-zone__card-badge">SÉLECTIONNÉ</span>
        </div>
        <p class="waiting-zone__msg">
          En attente des autres joueurs<span class="dots"><span>.</span><span>.</span><span>.</span></span>
        </p>
      </div>

      <div class="panel__footer">
        <div class="footer-hint">Visible uniquement par vous — révélé quand tous ont choisi</div>
        <div>
          <ActionButton
              v-if="!selectedBFId"
              variant="disabled"
              :disabled="true"
          >
            CONFIRMER LE CHOIX
          </ActionButton>
          <ActionButton
              v-else-if="!allBFDone"
              variant="locked"
          >
            EN ATTENTE DES JOUEURS
          </ActionButton>
          <ActionButton
              v-else
              variant="ready"
          >
            CHOIX CONFIRMÉ
          </ActionButton>
        </div>
      </div>
    </div>
  </template>

  <!-- ── Step 3: Dice roll ───────────────────────────────────────────────── -->
  <template v-else-if="setup === 'dice_roll'">
    <div class="panel panel--centered">
      <div class="panel__header">
        <span class="panel__eyebrow">PRÉPARATION</span>
        <h1 class="panel__title">{{ isTied && myDiceRoll === null ? 'ÉGALITÉ' : 'LANCER DU DÉ' }}</h1>
        <TitleOrnament />
        <p class="panel__sub">
          <template v-if="isTied && myDiceRoll === null">
            Égalité ! Cliquez pour relancer le dé
          </template>
          <template v-else-if="isTied">
            En attente du résultat du re-lancer…
          </template>
          <template v-else>
            Les dés roulent dans les panneaux latéraux…
          </template>
        </p>
      </div>

      <div v-if="isTied && myDiceRoll === null" class="tie-zone">
        <ActionButton variant="primary" @click="emit('reroll')">
          RELANCER LE DÉ
        </ActionButton>
      </div>
      <p v-else class="dice-hint">Résultats visibles sur les côtés</p>
    </div>
  </template>

  <!-- ── Fallback ────────────────────────────────────────────────────────── -->
  <template v-else>
    <div class="panel panel--centered">
      <p class="waiting-zone__msg">Étape en cours de chargement…</p>
    </div>
  </template>
</template>

<style scoped>
.panel {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  width: 100%;
  height: 100%;
  align-items: center;
  /* No justify-content: center — footer must always be visible at bottom */
}

.panel--centered {
  align-items: center;
  justify-content: center;
  min-height: 200px;
}

/* Header */
.panel__header {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  text-align: center;
  flex-shrink: 0;
}

.panel__eyebrow {
  font-size: 0.55rem;
  font-weight: 700;
  letter-spacing: 0.4em;
  color: #00CCB9;
}

.panel__title {
  font-size: 1.4rem;
  font-weight: 900;
  letter-spacing: 0.2em;
  color: #F2E5CD;
  line-height: 1;
  margin: 0;
}

.panel__sub {
  font-size: 0.7rem;
  letter-spacing: 0.04em;
  color: #4a6a70;
  margin: 0;
}

/* Tab bar */
.tab-bar {
  width: 100%;
  display: flex;
  gap: 2px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(200, 170, 110, 0.1);
  padding: 3px;
  flex-shrink: 0;
}

.tab {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 0.55rem 0.75rem;
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  color: #4a6a70;
  background: transparent;
}

.tab--active {
  background: rgba(200, 170, 110, 0.08);
  color: #C8AA6E;
  border-bottom: 1px solid rgba(200, 170, 110, 0.3);
}

.tab--disabled { opacity: 0.5; }

.tab__badge {
  font-size: 0.48rem;
  font-weight: 900;
  letter-spacing: 0.15em;
  color: #00CCB9;
  background: rgba(0, 204, 185, 0.1);
  border: 1px solid rgba(0, 204, 185, 0.25);
  padding: 1px 4px;
}

/* Import area */
.import-body {
  width: 100%;
  display: flex;
  gap: 0.75rem;
  min-height: 180px;
  flex: 1;
}

.import-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  min-height: 0;
}

.field-label {
  font-size: 0.55rem;
  font-weight: 700;
  letter-spacing: 0.15em;
  color: rgba(200, 170, 110, 0.5);
  flex-shrink: 0;
}

.deck-input {
  flex: 1;
  width: 100%;
  resize: none;
  font-family: monospace;
  font-size: 0.7rem;
  color: #C8AA6E;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(200, 170, 110, 0.15);
  padding: 0.6rem;
  outline: none;
  line-height: 1.65;
  min-height: 160px;
  transition: border-color 0.15s;
}

.deck-input:focus { border-color: rgba(200, 170, 110, 0.4); }

.field-error {
  font-size: 0.6rem;
  color: #e06060;
  letter-spacing: 0.05em;
  margin: 0;
}

.format-guide {
  flex-shrink: 0;
  width: 20%;
  min-width: 200px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(200, 170, 110, 0.08);
  padding: 0.6rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  overflow: hidden;
  margin-top: 18px;
}

.format-title {
  font-size: 0.55rem;
  font-weight: 700;
  letter-spacing: 0.2em;
  color: rgba(200, 170, 110, 0.5);
}

.format-pre {
  font-size: 0.6rem;
  color: #4a6a70;
  line-height: 1.65;
  font-family: monospace;
  white-space: pre;
  margin: 0;
}

/* Battlefield grid */
.bf-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.6rem;
}

.bf-card {
  background: rgba(10, 21, 37, 0.9);
  border: 1px solid rgba(90, 110, 130, 0.3);
  padding: 0.6rem 0.4rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.4rem;
  cursor: pointer;
  transition: border-color 0.12s, background 0.12s;
}

.bf-card:hover { border-color: rgba(200, 170, 110, 0.4); }

.bf-card--selected {
  border-color: #C8AA6E;
  background: rgba(200, 170, 110, 0.07);
}

.bf-card__img {
  width: 100%;
  aspect-ratio: 5 / 7;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.bf-card__img-el { width: 100%; height: 100%; object-fit: contain; }

.bf-card__icon { width: 28px; height: 28px; color: #2a4a50; }

.bf-card__name {
  font-size: 0.6rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: #F2E5CD;
  text-align: center;
}

.bf-card--selected .bf-card__name { color: #C8AA6E; }

/* Waiting zone */
.waiting-zone {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 1.5rem 0;
}

.waiting-zone__card-preview {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.35rem;
  padding: 0.75rem 1.5rem;
  border: 1px solid rgba(200, 170, 110, 0.3);
  background: rgba(200, 170, 110, 0.05);
}

.waiting-zone__card-name {
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  color: #C8AA6E;
}

.waiting-zone__card-badge {
  font-size: 0.5rem;
  font-weight: 900;
  letter-spacing: 0.2em;
  color: #00CCB9;
}

.waiting-zone__msg {
  font-size: 0.7rem;
  color: #4a6a70;
  letter-spacing: 0.1em;
  margin: 0;
}

.dice-hint {
  font-size: 0.65rem;
  color: #2a4050;
  letter-spacing: 0.12em;
  text-align: center;
  margin: 0;
}

.tie-zone {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  max-width: 260px;
}

/* Footer — always at bottom via sticky-footer pattern */
.panel__footer {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-top: 1px solid rgba(200, 170, 110, 0.1);
  padding-top: 0.75rem;
  gap: 0.75rem;
  flex-shrink: 0;
  margin-top: auto;
}

.footer-hint {
  font-size: 0.6rem;
  letter-spacing: 0.1em;
  color: #2a4050;
  flex: 1;
}

/* Dots animation */
.dots span { animation: dot 1.4s infinite; opacity: 0; }
.dots span:nth-child(2) { animation-delay: 0.28s; }
.dots span:nth-child(3) { animation-delay: 0.56s; }

@keyframes dot { 0%, 100% { opacity: 0; } 50% { opacity: 1; } }
</style>
