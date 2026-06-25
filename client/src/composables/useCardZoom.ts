import { ref } from 'vue'

const ZOOM_W = 210
const ZOOM_H = 294  // 5:7 ratio
const GAP = 10

export interface ZoomState {
  imageUrl: string
  x: number
  y: number
}

export function useCardZoom() {
  const zoom = ref<ZoomState | null>(null)

  function showZoom(imageUrl: string, el: Element) {
    const rect = el.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight

    // Prefer right, fallback left
    let x = rect.right + GAP
    if (x + ZOOM_W > vw - 8) x = rect.left - ZOOM_W - GAP

    // Align top with element, clamp vertically
    let y = rect.top
    if (y + ZOOM_H > vh - 8) y = vh - ZOOM_H - 8
    if (y < 8) y = 8

    zoom.value = { imageUrl, x, y }
  }

  function hideZoom() {
    zoom.value = null
  }

  return { zoom, showZoom, hideZoom }
}
