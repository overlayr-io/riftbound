<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { Card, DeckList, GameSetupStep } from '@riftbound/shared'
import TitleOrnament from './TitleOrnament.vue'
import ActionButton from './ActionButton.vue'
import CardZoomPopup from './game/CardZoomPopup.vue'
import backCardBlack from '@/assets/img/back_card_black.png'
import { useCardZoom } from '@/composables/useCardZoom'

const { zoom, showZoom, hideZoom } = useCardZoom()

const props = defineProps<{
  setup: GameSetupStep
  battlefields: Card[]
  allDecksDone: boolean
  allBFDone: boolean
  allSideboardDone: boolean
  importing: boolean
  importError: string | null
  isTied?: boolean
  myDiceRoll?: number | null
  // sideboard
  currentDeckList?: DeckList | null
  mySideboardDone?: boolean
  usedBattlefieldIds?: { cardId: string; round: number }[]
  // choose_first_player
  isDiceWinner?: boolean
  playerChoices?: { uid: string; label: string }[]
  firstPlayerId?: string | null
  // select_battlefield_discard
  bfDisplayOrder?: string[] | null
  allBFCards?: Record<string, Card | null>
  discardedBFId?: string | null
  // mulligan
  mulliganHand?: Card[]
  myMulliganDone?: boolean
  myMulliganCount?: number | null
  allMulliganDone?: boolean
}>()

const emit = defineEmits<{
  importDeck: [text: string]
  submitSideboard: [newDeckList: DeckList]
  selectBattlefield: [card: Card]
  reroll: []
  chooseFirstPlayer: [uid: string]
  discardBattlefield: [cardId: string]
  confirmDiscard: []
  submitMulligan: [count: number]
}>()

// ── Sideboard ─────────────────────────────────────────────────────────────────

// Group cards by base name with count
function groupCards(cards: Card[]): { card: Card; count: number }[] {
  const map = new Map<string, { card: Card; count: number }>()
  for (const c of cards) {
    const key = c.baseCardId
    if (map.has(key)) map.get(key)!.count++
    else map.set(key, { card: c, count: 1 })
  }
  return [...map.values()]
}

// Working copies of mainDeck and sideboard for the sideboard step
const sideMainDeck = ref<Card[]>([])
const sideSideboard = ref<Card[]>([])

watch(
  () => props.currentDeckList,
  (dl) => {
    if (!dl) return
    sideMainDeck.value = [...dl.mainDeck]
    sideSideboard.value = [...dl.sideboard]
  },
  { immediate: true },
)

const sideMainGroups = computed(() => groupCards(sideMainDeck.value))
const sideSideGroups = computed(() => groupCards(sideSideboard.value))

function lastIndexOf(arr: Card[], baseCardId: string): number {
  for (let i = arr.length - 1; i >= 0; i--) {
    if (arr[i].baseCardId === baseCardId) return i
  }
  return -1
}

// Move one copy of a card from main to sideboard
function moveToSideboard(baseCardId: string) {
  const idx = lastIndexOf(sideMainDeck.value, baseCardId)
  if (idx === -1) return
  const [card] = sideMainDeck.value.splice(idx, 1)
  sideSideboard.value.push(card)
}

// Move one copy of a card from sideboard to main deck
function moveToMain(baseCardId: string) {
  const idx = lastIndexOf(sideSideboard.value, baseCardId)
  if (idx === -1) return
  const [card] = sideSideboard.value.splice(idx, 1)
  sideMainDeck.value.push(card)
}

function confirmSideboard() {
  if (!props.currentDeckList) return
  const newDeckList: DeckList = {
    ...props.currentDeckList,
    mainDeck: [...sideMainDeck.value],
    sideboard: [...sideSideboard.value],
  }
  emit('submitSideboard', newDeckList)
}

// ── Mulligan: local selection state ──────────────────────────────────────────
const mulliganSelected = ref<Set<string>>(new Set())

function toggleMulliganCard(cardId: string) {
  if (mulliganSelected.value.has(cardId)) {
    mulliganSelected.value.delete(cardId)
  } else if (mulliganSelected.value.size < 2) {
    mulliganSelected.value.add(cardId)
  }
  // force reactivity
  mulliganSelected.value = new Set(mulliganSelected.value)
}

// ── select_battlefield_discard: track reveal animation ───────────────────────
const discardRevealActive = ref(false)
let discardRevealTimer: ReturnType<typeof setTimeout> | null = null

watch(
  () => props.discardedBFId,
  (id) => {
    if (!id) return
    discardRevealActive.value = true
    if (discardRevealTimer) clearTimeout(discardRevealTimer)
    discardRevealTimer = setTimeout(() => {
      discardRevealActive.value = false
      emit('confirmDiscard')
    }, 2800)
  },
)

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

function usedBfRound(bfId: string): number | null {
  return props.usedBattlefieldIds?.find(u => u.cardId === bfId)?.round ?? null
}

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
        <div class="footer-hint">Format texte exporté depuis Piltover Archive</div>
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

  <!-- ── Sideboard (round > 1) ─────────────────────────────────────────── -->
  <template v-else-if="setup === 'sideboard'">
    <div class="panel sideboard-panel">
      <div class="panel__header">
        <span class="panel__eyebrow">ROUND SUIVANT</span>
        <h1 class="panel__title">RÉSERVE</h1>
        <TitleOrnament />
        <p class="panel__sub">Échangez des cartes entre votre deck et votre réserve avant la prochaine partie</p>
      </div>

      <div v-if="!mySideboardDone" class="sideboard-columns">
        <!-- Main deck -->
        <div class="sb-col">
          <div class="sb-col__header">
            <span class="sb-col__title">DECK PRINCIPAL</span>
            <span class="sb-col__count">{{ sideMainDeck.length }}</span>
          </div>
          <div class="sb-list">
            <button
              v-for="{ card, count } in sideMainGroups"
              :key="card.baseCardId"
              class="sb-row sb-row--main"
              @click="moveToSideboard(card.baseCardId)"
              @mouseenter="card.imageUrl && showZoom(card.imageUrl, $event.currentTarget as Element, card.type)"
              @mouseleave="hideZoom"
            >
              <span class="sb-row__arrow">→</span>
              <span class="sb-row__count">×{{ count }}</span>
              <img v-if="card.imageUrl" :src="card.imageUrl" class="sb-row__img" :alt="card.name" />
              <span class="sb-row__name">{{ card.name }}</span>
            </button>
          </div>
        </div>

        <!-- Sideboard -->
        <div class="sb-col">
          <div class="sb-col__header">
            <span class="sb-col__title">RÉSERVE</span>
            <span class="sb-col__count">{{ sideSideboard.length }}</span>
          </div>
          <div class="sb-list">
            <div v-if="sideSideGroups.length === 0" class="sb-empty">Aucune carte en réserve</div>
            <button
              v-for="{ card, count } in sideSideGroups"
              :key="card.baseCardId"
              class="sb-row sb-row--side"
              @click="moveToMain(card.baseCardId)"
              @mouseenter="card.imageUrl && showZoom(card.imageUrl, $event.currentTarget as Element, card.type)"
              @mouseleave="hideZoom"
            >
              <span class="sb-row__arrow">←</span>
              <span class="sb-row__count">×{{ count }}</span>
              <img v-if="card.imageUrl" :src="card.imageUrl" class="sb-row__img" :alt="card.name" />
              <span class="sb-row__name">{{ card.name }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Waiting after confirming -->
      <div v-else class="waiting-zone">
        <p class="waiting-zone__msg">
          Réserve confirmée — en attente des autres joueurs<span class="dots"><span>.</span><span>.</span><span>.</span></span>
        </p>
      </div>

      <div class="panel__footer">
        <div class="footer-hint">Cliquez sur une carte pour la déplacer</div>
        <div>
          <ActionButton
            v-if="!mySideboardDone"
            variant="primary"
            @click="confirmSideboard"
          >
            CONFIRMER LA RÉSERVE
          </ActionButton>
          <ActionButton v-else variant="locked">
            EN ATTENTE DES JOUEURS
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
        <p class="panel__sub">Choisis ton champ de bataille</p>
      </div>

      <div v-if="!selectedBFId" class="bf-grid">
        <button
          v-for="bf in battlefields"
          :key="bf.id"
          class="bf-card"
          :class="{
            'bf-card--selected': selectedBFId === bf.id,
            'bf-card--used': usedBfRound(bf.id) !== null,
          }"
          :disabled="usedBfRound(bf.id) !== null"
          @click="usedBfRound(bf.id) === null && (selectedBFId = bf.id, emit('selectBattlefield', bf))"
          @mouseenter="bf.imageUrl && showZoom(bf.imageUrl, $event.currentTarget as Element, card.type)"
          @mouseleave="hideZoom"
        >
          <div class="bf-card__img">
            <img v-if="bf.imageUrl" :src="bf.imageUrl" :alt="bf.name" class="bf-card__img-el" />
            <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" class="bf-card__icon">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
          </div>
          <span class="bf-card__name">{{ bf.name }}</span>
          <span v-if="usedBfRound(bf.id) !== null" class="bf-card__used-badge">
            Utilisé — Round {{ usedBfRound(bf.id) }}
          </span>
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
        <div class="footer-hint">Visible uniquement par vous.</div>
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

  <!-- ── Step 4a: Choose first player (2 or 3 players) ─────────────────── -->
  <template v-else-if="setup === 'choose_first_player'">
    <div class="panel">
      <div class="panel__header">
        <span class="panel__eyebrow">PRÉPARATION</span>
        <h1 class="panel__title">QUI COMMENCE ?</h1>
        <TitleOrnament />
        <p class="panel__sub">
          <template v-if="isDiceWinner">Choisis le joueur qui commence en premier</template>
          <template v-else>En attente de la décision du vainqueur…</template>
        </p>
      </div>

      <div class="first-player-zone">
        <template v-if="firstPlayerId">
          <!-- Decision already made: show result -->
          <div class="fp-result">
            <span class="fp-result__label">COMMENCE EN PREMIER</span>
            <div class="fp-result__name">
              {{ playerChoices?.find(c => c.uid === firstPlayerId)?.label ?? firstPlayerId }}
            </div>
          </div>
        </template>
        <template v-else-if="isDiceWinner">
          <div class="fp-choices">
            <button
              v-for="choice in playerChoices"
              :key="choice.uid"
              class="fp-card"
              @click="emit('chooseFirstPlayer', choice.uid)"
            >
              <span class="fp-card__label">{{ choice.label }}</span>
              <span class="fp-card__cta">JOUE EN PREMIER</span>
            </button>
          </div>
        </template>
        <template v-else>
          <p class="waiting-zone__msg">
            En attente du vainqueur<span class="dots"><span>.</span><span>.</span><span>.</span></span>
          </p>
        </template>
      </div>

      <div class="panel__footer">
        <div class="footer-hint">
          {{ isDiceWinner ? 'Vous avez gagné le lancer de dés — à vous de choisir' : 'Le vainqueur du dé choisit' }}
        </div>
      </div>
    </div>
  </template>

  <!-- ── Step 4b: Battlefield discard (4 players) ───────────────────────── -->
  <template v-else-if="setup === 'select_battlefield_discard'">
    <div class="panel">
      <div class="panel__header">
        <span class="panel__eyebrow">PRÉPARATION</span>
        <h1 class="panel__title">{{ discardedBFId ? 'CHAMP DÉFAUSSÉ' : 'DÉFAUSSER UN BATTLEFIELD' }}</h1>
        <TitleOrnament />
        <p class="panel__sub">
          <template v-if="discardedBFId">Le champ de bataille est révélé et défaussé</template>
          <template v-else-if="isDiceWinner">Retournez un champ de bataille pour le défausser</template>
          <template v-else>En attente du vainqueur du dé…</template>
        </p>
      </div>

      <div class="discard-bf-grid">
        <div
          v-for="uid in (bfDisplayOrder ?? [])"
          :key="uid"
          class="discard-bf-slot"
          :class="{
            'discard-bf-slot--clickable': isDiceWinner && !discardedBFId,
            'discard-bf-slot--discarded': discardedBFId && allBFCards?.[uid]?.id === discardedBFId,
            'discard-bf-slot--revealed': discardRevealActive && allBFCards?.[uid]?.id === discardedBFId,
          }"
          @click="isDiceWinner && !discardedBFId && allBFCards?.[uid]?.id && emit('discardBattlefield', allBFCards![uid]!.id)"
        >
          <div class="discard-bf-slot__frame">
            <template v-if="discardRevealActive && allBFCards?.[uid]?.id === discardedBFId">
              <!-- Revealed card -->
              <img
                v-if="allBFCards?.[uid]?.imageUrl"
                :src="allBFCards![uid]!.imageUrl"
                :alt="allBFCards![uid]!.name"
                class="discard-bf-slot__img"
              />
              <div v-else class="discard-bf-slot__placeholder">
                <span class="discard-bf-slot__name">{{ allBFCards?.[uid]?.name }}</span>
              </div>
            </template>
            <template v-else>
              <!-- Face-down card (landscape) -->
              <div class="discard-bf-slot__back">
                <img :src="backCardBlack" alt="Dos de carte" class="discard-bf-slot__back-img" />
              </div>
            </template>
          </div>
          <div v-if="isDiceWinner && !discardedBFId" class="discard-bf-slot__hint">DÉFAUSSER</div>
        </div>
      </div>

      <div class="panel__footer">
        <div class="footer-hint">
          {{ isDiceWinner && !discardedBFId
            ? 'Cliquez sur une carte pour la retourner et la défausser'
            : discardedBFId ? 'Carte défaussée — passage au mulligan' : 'Le vainqueur du dé choisit le champ à défausser' }}
        </div>
      </div>
    </div>
  </template>

  <!-- ── Step 5: Mulligan ───────────────────────────────────────────────── -->
  <template v-else-if="setup === 'mulligan'">
    <div class="panel mulligan-panel">
      <!-- Header -->
      <div class="panel-header">
        <span class="panel-eyebrow">PRÉPARATION</span>
        <h1 class="panel-title">MULLIGAN</h1>
        <div class="title-ornament">
          <span class="ornament-line" />
          <span class="ornament-diamond">◆</span>
          <span class="ornament-line" />
        </div>
        <p class="panel-sub">
          <template v-if="myMulliganDone && !allMulliganDone">
            En attente des autres joueurs<span class="dots"><span>.</span><span>.</span><span>.</span></span>
          </template>
          <template v-else-if="myMulliganDone && allMulliganDone">
            La partie commence…
          </template>
          <template v-else>
            Sélectionne jusqu'à <span class="text-gold">2 cartes</span> à renvoyer sous ton deck
          </template>
        </p>
      </div>

      <!-- Cards or loading -->
      <div v-if="(mulliganHand ?? []).length > 0" class="cards-area">
        <button
          v-for="card in (mulliganHand ?? [])"
          :key="card.id"
          class="mulligan-card"
          :class="{
            'mulligan-card--swapped': mulliganSelected.has(card.id),
            'mulligan-card--locked': myMulliganDone,
          }"
          :disabled="myMulliganDone"
          @click="toggleMulliganCard(card.id)"
          @mouseenter="card.imageUrl && showZoom(card.imageUrl, $event.currentTarget as Element, card.type)"
          @mouseleave="hideZoom"
        >
          <img
            :src="card.imageUrl || 'https://cdn.piltoverarchive.com/cards/OGN-169.webp?width=95'"
            :alt="card.name"
            class="mulligan-card__img"
          />
          <div class="mulligan-card__overlay">
            <div v-if="mulliganSelected.has(card.id)" class="swap-badge">
              <svg class="swap-badge__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"/>
              </svg>
              ÉCHANGER
            </div>
          </div>
        </button>
      </div>
      <div v-else class="loading-state">
        <div class="spinner" />
        <span class="loading-text">Mélange du deck en cours…</span>
      </div>

      <!-- Footer -->
      <div class="panel-footer">
        <div class="swap-counter">
          <span class="swap-counter__current" :class="{ 'swap-counter__current--active': mulliganSelected.size > 0 }">
            {{ mulliganSelected.size }}
          </span>
          <span class="swap-counter__sep">/</span>
          <span class="swap-counter__max">2</span>
          <span class="swap-counter__label">
            <template v-if="myMulliganDone && (myMulliganCount ?? 0) > 0">
              → vous piochez {{ myMulliganCount }} carte{{ (myMulliganCount ?? 0) > 1 ? 's' : '' }}
            </template>
            <template v-else-if="myMulliganDone">
              main conservée
            </template>
            <template v-else>
              carte(s) à échanger
            </template>
          </span>
        </div>
        <button
          v-if="!myMulliganDone"
          class="action-btn action-btn--primary"
          @click="emit('submitMulligan', mulliganSelected.size)"
        >
          {{ mulliganSelected.size > 0 ? 'CONFIRMER L\'ÉCHANGE' : 'GARDER MA MAIN' }}
        </button>
        <button v-else-if="!allMulliganDone" class="action-btn action-btn--disabled" disabled>
          EN ATTENTE DES JOUEURS
        </button>
        <button v-else class="action-btn action-btn--ready" disabled>
          PRÊT
        </button>
      </div>
    </div>
  </template>

  <!-- ── Fallback ────────────────────────────────────────────────────────── -->
  <template v-else>
    <div class="panel panel--centered">
      <p class="waiting-zone__msg">Étape en cours de chargement…</p>
    </div>
  </template>

  <CardZoomPopup :zoom="zoom" />
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
  gap: 0.75rem;
  padding: 0 0.5rem;
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

.bf-card--used {
  opacity: 0.38;
  cursor: not-allowed;
  pointer-events: none;
  position: relative;
}
.bf-card__used-badge {
  font-size: 0.5rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #e06060;
  background: rgba(200, 60, 60, 0.12);
  border: 1px solid rgba(200, 60, 60, 0.3);
  padding: 0.15rem 0.4rem;
  border-radius: 2px;
  margin-top: 0.25rem;
}

/* ── Sideboard ── */
.sideboard-panel .panel__header { padding-bottom: 0.5rem; }

.sideboard-columns {
  display: flex;
  gap: 1rem;
  flex: 1;
  min-height: 0;
  padding: 0 1rem;
  width: 100%;
}

.sb-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: rgba(6, 15, 27, 0.6);
  border: 1px solid rgba(200, 170, 110, 0.1);
}

.sb-col__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.4rem 0.6rem;
  border-bottom: 1px solid rgba(200, 170, 110, 0.1);
  flex-shrink: 0;
}
.sb-col__title {
  font-size: 0.5rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: #C8AA6E;
}
.sb-col__count {
  font-size: 0.55rem;
  font-weight: 700;
  color: #4a6a70;
}

.sb-list {
  flex: 1;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(200, 170, 110, 0.15) transparent;
  padding: 0.25rem 0;
}

.sb-empty {
  font-size: 0.6rem;
  color: #2a4a50;
  text-align: center;
  padding: 1.5rem 0;
}

.sb-row {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  width: 100%;
  padding: 0.3rem 0.6rem;
  text-align: left;
  background: none;
  border: none;
  cursor: pointer;
  transition: background 0.1s;
}
.sb-row:hover { background: rgba(200, 170, 110, 0.06); }
.sb-row:active { background: rgba(200, 170, 110, 0.12); }

.sb-row__arrow {
  font-size: 0.6rem;
  width: 0.9rem;
  flex-shrink: 0;
}
.sb-row--main .sb-row__arrow { color: #C8AA6E; }
.sb-row--side .sb-row__arrow { color: #6aabb0; }

.sb-row__count {
  font-size: 0.6rem;
  font-weight: 700;
  color: #4a6a70;
  width: 1.4rem;
  flex-shrink: 0;
}

.sb-row__img {
  width: 30px;
  height: 42px;
  object-fit: contain;
  border-radius: 2px;
  flex-shrink: 0;
}

.sb-row__name {
  font-size: 0.65rem;
  color: #8aabb0;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.sb-row:hover .sb-row__name { color: #F2E5CD; }

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

/* ── choose_first_player ──────────────────────────────────────────────────── */
.first-player-zone {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
}

.fp-choices {
  display: flex;
  gap: 1rem;
  width: 100%;
  justify-content: center;
}

.fp-card {
  flex: 1;
  max-width: 180px;
  background: rgba(10, 21, 37, 0.9);
  border: 1px solid rgba(90, 110, 130, 0.3);
  padding: 1.5rem 1rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.6rem;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s, transform 0.12s;
}

.fp-card:hover {
  border-color: #C8AA6E;
  background: rgba(200, 170, 110, 0.07);
  transform: translateY(-2px);
}

.fp-card__label {
  font-size: 0.75rem;
  font-weight: 900;
  letter-spacing: 0.12em;
  color: #F2E5CD;
  text-align: center;
}

.fp-card__cta {
  font-size: 0.5rem;
  font-weight: 700;
  letter-spacing: 0.2em;
  color: #00CCB9;
}

.fp-result {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 1.5rem 2rem;
  border: 1px solid rgba(200, 170, 110, 0.3);
  background: rgba(200, 170, 110, 0.05);
}

.fp-result__label {
  font-size: 0.5rem;
  font-weight: 700;
  letter-spacing: 0.25em;
  color: #00CCB9;
}

.fp-result__name {
  font-size: 1rem;
  font-weight: 900;
  letter-spacing: 0.12em;
  color: #C8AA6E;
}

/* ── select_battlefield_discard ──────────────────────────────────────────── */
.discard-bf-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.6rem;
  width: 100%;
}

.discard-bf-slot {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.35rem;
}

.discard-bf-slot--clickable { cursor: pointer; }
.discard-bf-slot--clickable:hover .discard-bf-slot__frame {
  border-color: rgba(200, 170, 110, 0.5);
}
.discard-bf-slot--clickable:hover .discard-bf-slot__hint {
  color: #C8AA6E;
}

.discard-bf-slot__frame {
  width: 100%;
  aspect-ratio: 7 / 5;
  border: 1px solid rgba(90, 110, 130, 0.3);
  background: rgba(10, 21, 37, 0.9);
  overflow: hidden;
  position: relative;
  perspective: 600px;
  transition: border-color 0.15s;
}

.discard-bf-slot--discarded .discard-bf-slot__frame {
  border-color: #C8AA6E;
}

.discard-bf-slot--revealed .discard-bf-slot__frame {
  border-color: #C8AA6E;
  box-shadow: 0 0 16px rgba(200, 170, 110, 0.25);
}

.discard-bf-slot__img {
  width: 100%; height: 100%;
  object-fit: contain;
  animation: card-flip-in 0.45s ease-out;
}

@keyframes card-flip-in {
  from { opacity: 0; transform: rotateY(-90deg) scale(0.92); }
  to   { opacity: 1; transform: rotateY(0deg) scale(1); }
}

.discard-bf-slot__placeholder {
  width: 100%; height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem;
  animation: card-flip-in 0.45s ease-out;
}

.discard-bf-slot__name {
  font-size: 0.6rem;
  font-weight: 700;
  color: #C8AA6E;
  text-align: center;
  letter-spacing: 0.06em;
}

.discard-bf-slot__back {
  width: 100%; height: 100%;
  overflow: hidden;
  position: relative;
}

.discard-bf-slot__back-img {
  position: absolute;
  top: 50%; left: 50%;
  width: 140%; height: 140%;
  transform: translate(-50%, -50%) rotate(90deg);
  object-fit: contain;
}

.discard-bf-slot__hint {
  font-size: 0.48rem;
  font-weight: 700;
  letter-spacing: 0.15em;
  color: #4a6a70;
  transition: color 0.15s;
}

/* ── Mulligan panel ───────────────────────────────────────────────────────── */
.mulligan-panel {
  gap: 1rem;
}

.panel-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.6rem;
  text-align: center;
}

.panel-eyebrow {
  font-size: 0.6rem;
  font-weight: 700;
  letter-spacing: 0.4em;
  color: #00CCB9;
  text-transform: uppercase;
}

.panel-title {
  font-size: 1.6rem;
  font-weight: 900;
  letter-spacing: 0.2em;
  color: #F2E5CD;
  line-height: 1;
  margin: 0;
}

.title-ornament {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  max-width: 20rem;
}
.ornament-line {
  flex: 1;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(200, 170, 110, 0.4));
}
.ornament-line:last-child {
  background: linear-gradient(90deg, rgba(200, 170, 110, 0.4), transparent);
}
.ornament-diamond {
  color: #C8AA6E;
  font-size: 0.45rem;
  opacity: 0.7;
}

.panel-sub {
  font-size: 0.72rem;
  letter-spacing: 0.04em;
  color: #4a6a70;
  line-height: 1.7;
  margin: 0;
}
.text-gold { color: #C8AA6E; font-weight: 700; }

.cards-area {
  display: flex;
  gap: 0.75rem;
  justify-content: center;
  flex: 1;
  min-height: 0;
  align-items: center;
}

.mulligan-card {
  position: relative;
  flex: 1;
  max-width: 150px;
  aspect-ratio: 0.714;
  background: rgba(6, 15, 27, 0.8);
  border: 1px solid rgba(90, 110, 130, 0.3);
  cursor: pointer;
  overflow: hidden;
  transition: border-color 0.15s, transform 0.15s, box-shadow 0.15s, filter 0.15s;
  padding: 0;
}

.mulligan-card:hover:not(.mulligan-card--swapped):not(.mulligan-card--locked) {
  border-color: rgba(200, 170, 110, 0.5);
  transform: translateY(-6px);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.6);
}

.mulligan-card--swapped {
  border-color: #c0392b;
  filter: brightness(0.6) sepia(0.3);
  transform: translateY(4px);
  box-shadow: 0 0 16px rgba(192, 57, 43, 0.35);
}

.mulligan-card--locked {
  cursor: default;
}

.mulligan-card__img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.mulligan-card__overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.swap-badge {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.3rem;
  padding: 0.5rem 0.75rem;
  background: rgba(192, 57, 43, 0.9);
  border: 1px solid rgba(255, 100, 80, 0.4);
  font-size: 0.55rem;
  font-weight: 900;
  letter-spacing: 0.2em;
  color: #fff;
}

.swap-badge__icon {
  width: 12px;
  height: 12px;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 3rem 0;
}

.spinner {
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  border: 2px solid rgba(200, 170, 110, 0.2);
  border-top-color: #C8AA6E;
  animation: spin 0.7s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

.loading-text {
  font-size: 0.7rem;
  letter-spacing: 0.15em;
  color: #2a4a50;
}

.panel-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding-top: 0.75rem;
  border-top: 1px solid rgba(200, 170, 110, 0.1);
  margin-top: auto;
  flex-shrink: 0;
  width: 100%;
}

.swap-counter {
  display: flex;
  align-items: baseline;
  gap: 0.25rem;
}
.swap-counter__current {
  font-size: 1.1rem;
  font-weight: 900;
  color: #4a6a70;
  transition: color 0.2s;
  line-height: 1;
}
.swap-counter__current--active { color: #C8AA6E; }
.swap-counter__sep { font-size: 0.8rem; color: #2a4a50; }
.swap-counter__max { font-size: 0.8rem; font-weight: 700; color: #2a4a50; }
.swap-counter__label {
  font-size: 0.6rem;
  letter-spacing: 0.15em;
  color: #2a4a50;
  margin-left: 0.4rem;
}

.action-btn {
  padding: 0.75rem 2rem;
  font-size: 0.7rem;
  font-weight: 900;
  letter-spacing: 0.25em;
  text-transform: uppercase;
  border: none;
  cursor: pointer;
  transition: filter 0.15s, transform 0.1s;
  flex-shrink: 0;
}
.action-btn--primary {
  background: linear-gradient(180deg, #1e3252 0%, #060f1b 100%);
  border: 1.5px solid #C8AA6E;
  color: #F2E5CD;
  box-shadow: inset 0 0 16px rgba(200, 170, 110, 0.08);
}
.action-btn--primary:hover { filter: brightness(1.2); }
.action-btn--primary:active { transform: scale(0.98); }
.action-btn--disabled {
  background: rgba(6, 15, 27, 0.5);
  border: 1.5px solid rgba(90, 110, 130, 0.2);
  color: #2a4a50;
  cursor: not-allowed;
  opacity: 0.5;
}
.action-btn--ready {
  background: rgba(0, 204, 185, 0.06);
  border: 1.5px solid rgba(0, 204, 185, 0.35);
  color: #00CCB9;
  cursor: default;
}
</style>
