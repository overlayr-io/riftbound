import { ref, watch } from 'vue'

const STORAGE_KEY = 'riftbound:settings'

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

const saved = load()

export const cardZoomScale = ref<number>(
  typeof saved.cardZoomScale === 'number' ? saved.cardZoomScale : 1
)

watch(cardZoomScale, (v) => {
  const current = load()
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, cardZoomScale: v }))
})
