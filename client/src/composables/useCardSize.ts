import {useViewport} from "@/composables/useViewport.ts";
import {computed} from "vue";

export const OUTSIDE_MARGIN = 7
export const INSIDE_MARGIN = 4

const CARD_ASPECT = 118 / 85

export const DEFAULT_CARD_RATIO = 85 / 118
export const DEFAULT_CARD_TO_SHOW = 5.6

export function useCardSize() {
  const { height } = useViewport()

  const cardDefaultHeight = computed(() => {
    const h = height.value
    return (h - 6 * OUTSIDE_MARGIN + 4 * CARD_ASPECT - INSIDE_MARGIN) / (DEFAULT_CARD_TO_SHOW + CARD_ASPECT) - 14
  })

  const cardDefaultWidth = computed(() => Math.round(cardDefaultHeight.value * DEFAULT_CARD_RATIO))

  return {
    cardH: cardDefaultHeight,
    cardW: cardDefaultWidth,
  }
}