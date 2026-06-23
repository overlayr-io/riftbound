import {CardState} from "@riftbound/shared";
import {useGameStore} from "@/stores/game.ts";
import {useLayoutDual} from "@/composables/useLayoutDual.ts";
import {useLayout2v2} from "@/composables/useLayout2v2.ts";
import {useLayoutFFA} from "@/composables/useLayoutFFA.ts";

export const SEPARATOR = ':'

export function useLayout(cards: readonly CardState[]) {
  const { mode } = useGameStore()

  if (mode === '2v2') return useLayout2v2(cards)
  if (mode === 'FFA') return useLayoutFFA(cards)
  return useLayoutDual(cards)
}
