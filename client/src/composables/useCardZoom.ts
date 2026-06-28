import { ref } from 'vue'
import type { CardType } from '@riftbound/shared'
import { cardZoomScale } from '@/stores/settings'

const BASE_W = 240
const BASE_H = 324  // 5:7 ratio
const GAP = 10

export interface ZoomState {
  imageUrl: string
  cardType: CardType
  keywords: string[]
  x: number
  y: number
  w: number
  h: number
}

export function useCardZoom() {
  const zoom = ref<ZoomState | null>(null)

  function showZoom(imageUrl: string, el: Element, cardType: CardType = 'unit', keywords: string[] = []) {
    const scale = cardZoomScale.value
    const w = Math.round(BASE_W * scale)
    const h = Math.round(BASE_H * scale)

    const rect = el.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight

    // Prefer right, fallback left
    let x = rect.right + GAP
    if (x + w > vw - 8) x = rect.left - w - GAP

    // Align top with element, clamp vertically
    let y = rect.top
    if (y + h > vh - 8) y = vh - h - 8
    if (y < 8) y = 8

    zoom.value = { imageUrl, cardType, keywords, x, y, w, h }
  }

  function hideZoom() {
    zoom.value = null
  }

  return { zoom, showZoom, hideZoom }
}
