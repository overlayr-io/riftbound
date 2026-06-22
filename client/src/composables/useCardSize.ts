import {useViewport} from "@/composables/useViewport.ts";
import {computed} from "vue";

export const DEFAULT_CARD_RATIO = 85 / 118
export const DEFAULT_SPACING = 6
export const DEFAULT_ASPECT_RATIO = 4
export const DEFAULT_CARD_TO_SHOW = 5

export function useCardSize() {
  const { height } = useViewport()

  const cardDefaultHeight = computed(() => {
    return (height.value - DEFAULT_SPACING + DEFAULT_ASPECT_RATIO) / (DEFAULT_CARD_TO_SHOW + DEFAULT_SPACING) - 14
  })
  const cardDefaultWidth = computed(() => cardDefaultHeight.value * DEFAULT_CARD_RATIO)

  return {
    cardH: cardDefaultHeight,
    cardW: cardDefaultWidth,
  }
}