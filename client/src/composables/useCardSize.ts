import {useViewport} from "@/composables/useViewport.ts";
import {computed} from "vue";

export const OUTSIDE_MARGIN = 7
export const INSIDE_MARGIN = 4
export const GAP = 5

export const DEFAULT_CARD_RATIO = 85 / 118
export const BF_CARD_SCALE = 0.90

// Vertical zones that must fit on screen (see useLayout for the full layout):
//   2×0.80 partial utility rows + 4 full rows = 5.60 cardSlot.h rows
//   + 1 landscape battlefield card (height = cardH × BF_CARD_SCALE × DEFAULT_CARD_RATIO)
//   + 6 gaps + 2 inner battlefield margins
// → cardH × (5.60 + BF_CARD_SCALE × DEFAULT_CARD_RATIO) = H − 13.20×INSIDE_MARGIN − 6×GAP
const CARD_ROWS = 5.60

export function useCardSize() {
  const { height } = useViewport()

  const cardDefaultHeight = computed(() => {
    const h = height.value
    return (h - CARD_ROWS * 2 * INSIDE_MARGIN - 2 * INSIDE_MARGIN - 6 * GAP) / (CARD_ROWS + BF_CARD_SCALE * DEFAULT_CARD_RATIO)
  })

  const cardDefaultWidth = computed(() => Math.round(cardDefaultHeight.value * DEFAULT_CARD_RATIO))

  return {
    cardH: cardDefaultHeight,
    cardW: cardDefaultWidth,
  }
}