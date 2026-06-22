import { onMounted, onUnmounted, ref } from 'vue'

export function useViewport() {
  const SIDEBAR_WIDTH = 52

  const width = ref(window.innerWidth)
  const height = ref(window.innerHeight)
  let raf = 0

  function onResize() {
    if (raf) return
    raf = requestAnimationFrame(() => {
      raf = 0
      width.value = window.innerWidth
      height.value = window.innerHeight
    })
  }

  onMounted(() => window.addEventListener('resize', onResize))
  onUnmounted(() => {
    window.removeEventListener('resize', onResize)
    if (raf) cancelAnimationFrame(raf)
  })

  return { width, height, SIDEBAR_WIDTH }
}
