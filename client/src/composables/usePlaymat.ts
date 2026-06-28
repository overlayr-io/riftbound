import { computed, onMounted } from 'vue'
import { usePlaymatStore, type ResolvedPlaymat } from '@/stores/playmat'
import { useGameStore } from '@/stores/game'

/**
 * Résout le fond de plateau du joueur courant + expose les CSS variables de
 * style de zone (verre dépoli) à binder sur la racine du board.
 */
export function usePlaymat(mode: 'dual' | '2v2' | 'ffa') {
  const store = usePlaymatStore()
  const game = useGameStore()

  onMounted(() => { store.load() })

  const resolved = computed<ResolvedPlaymat>(() => store.resolve(mode, game.gameId ?? ''))

  const vars = computed(() => ({
    '--playmat-zone-bg': resolved.value.zoneStyle.background,
    '--playmat-zone-border-angle': resolved.value.zoneStyle.border,
    '--playmat-zone-border': resolved.value.zoneStyle.border + '2e',
    '--playmat-zone-label': resolved.value.zoneStyle.label,
  }))

  return { resolved, vars }
}
