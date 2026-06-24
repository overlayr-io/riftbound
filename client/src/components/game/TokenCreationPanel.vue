<script setup lang="ts">
import { ref, watch, nextTick, onMounted, onUnmounted } from 'vue'
import type { CardType, ZoneId } from '@riftbound/shared'

import birdImg      from '@/assets/img/tokens/bird.png'
import buffImg      from '@/assets/img/tokens/buff.avif'
import goldGearImg  from '@/assets/img/tokens/gold_gear.png'
import mechImg      from '@/assets/img/tokens/mech.avif'
import recruitImg   from '@/assets/img/tokens/recruit.avif'
import sandSolderImg from '@/assets/img/tokens/sand_solder.avif'
import spriteImg    from '@/assets/img/tokens/sprite.avif'

interface TokenDef {
  id: string
  label: string
  imageUrl: string
  cardType: CardType
}

const TOKENS: TokenDef[] = [
  { id: 'bird',        label: 'Oiseau',      imageUrl: birdImg,        cardType: 'unit' },
  { id: 'buff',        label: 'Buff',        imageUrl: buffImg,        cardType: 'spell' },
  { id: 'gold_gear',  label: 'Engrenage',   imageUrl: goldGearImg,    cardType: 'gear' },
  { id: 'mech',       label: 'Mech',        imageUrl: mechImg,        cardType: 'unit' },
  { id: 'recruit',    label: 'Recrue',      imageUrl: recruitImg,     cardType: 'unit' },
  { id: 'sand_solder',label: 'Soudeur',     imageUrl: sandSolderImg,  cardType: 'unit' },
  { id: 'sprite',     label: 'Esprit',      imageUrl: spriteImg,      cardType: 'unit' },
]

const props = defineProps<{
  open: boolean
  x: number
  y: number
  targetZone: ZoneId | null
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'create': [name: string, cardType: CardType, imageUrl: string, zoneId: ZoneId]
}>()

const panelRef = ref<HTMLElement | null>(null)
const adjustedX = ref(0)
const adjustedY = ref(0)

watch(
  () => [props.open, props.x, props.y] as const,
  async ([open, x, y]) => {
    if (!open) return
    adjustedX.value = x
    adjustedY.value = y
    await nextTick()
    const el = panelRef.value
    if (!el) return
    const { width, height } = el.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight
    // Center horizontally on x, then clamp
    let cx = x - width / 2
    let cy = y - height - 8
    if (cx + width > vw - 8) cx = vw - width - 8
    if (cx < 8) cx = 8
    if (cy < 8) cy = 8
    if (cy + height > vh - 8) cy = vh - height - 8
    adjustedX.value = cx
    adjustedY.value = cy
  },
  { immediate: true },
)

function select(token: TokenDef) {
  if (!props.targetZone) return
  emit('create', token.label, token.cardType, token.imageUrl, props.targetZone)
  emit('update:open', false)
}

function onKey(e: KeyboardEvent) {
  if (!props.open) return
  if (e.key === 'Escape') emit('update:open', false)
}

onMounted(() => document.addEventListener('keydown', onKey))
onUnmounted(() => document.removeEventListener('keydown', onKey))
</script>

<template>
  <Teleport to="body">
    <Transition name="tp">
      <div
        v-if="open"
        ref="panelRef"
        class="token-panel"
        :style="{ left: adjustedX + 'px', top: adjustedY + 'px' }"
        @click.stop
      >
        <div class="tp-header">
          <span class="tp-header__title">Créer un token</span>
          <button class="tp-header__close" @click="$emit('update:open', false)">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div class="tp-sep" />
        <div class="tp-grid">
          <button
            v-for="token in TOKENS"
            :key="token.id"
            class="tp-token"
            :title="token.label"
            @click="select(token)"
          >
            <img :src="token.imageUrl" :alt="token.label" class="tp-token__img" />
            <span class="tp-token__label">{{ token.label }}</span>
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.token-panel {
  position: fixed;
  z-index: 300;
  background: linear-gradient(160deg, #0c1d33 0%, #060d1a 100%);
  border: 1px solid rgba(200, 170, 110, 0.22);
  border-radius: 8px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.7);
}

.tp-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 5px 8px 7px 12px;
}
.tp-header__title {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #C8AA6E;
}
.tp-header__close {
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
.tp-header__close:hover {
  color: #C8AA6E;
  background: rgba(200, 170, 110, 0.1);
}

.tp-sep {
  height: 1px;
  background: rgba(200, 170, 110, 0.15);
  margin: 0 0 3px;
}

.tp-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 4px;
  padding: 6px 8px 8px;
}

.tp-token {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 5px 4px;
  border-radius: 6px;
  cursor: pointer;
  background: transparent;
  border: 1px solid transparent;
  transition: background 0.1s, border-color 0.1s, transform 0.1s;
}
.tp-token:hover {
  background: rgba(200, 170, 110, 0.1);
  border-color: rgba(200, 170, 110, 0.25);
  transform: scale(1.05);
}
.tp-token:active {
  transform: scale(0.95);
}

.tp-token__img {
  width: 56px;
  height: 56px;
  object-fit: contain;
  border-radius: 4px;
  border: 1px solid rgba(200, 170, 110, 0.15);
  background: rgba(255,255,255,0.03);
}

.tp-token__label {
  font-size: 9px;
  color: rgba(255, 255, 255, 0.55);
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 52px;
}

.tp-enter-active, .tp-leave-active { transition: opacity 0.12s ease, transform 0.12s ease; }
.tp-enter-from, .tp-leave-to { opacity: 0; transform: translateY(4px) scale(0.97); }
</style>
