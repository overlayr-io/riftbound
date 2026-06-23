import { ref, readonly } from 'vue'
import { useToast } from '@/stores/toast'
import type { CardState } from '@riftbound/shared'

// ── Shortcut definitions ──────────────────────────────────────────────────────

export type CardTargetMode = 'single' | 'sequence'

export interface ShortcutDef {
  key: string
  /** Toast shown when mode activates (and for each step if no sequenceHints). */
  hint: string
  /** Instant shortcuts fire on keydown and never enter hold mode. */
  onInstant?: () => void
  /** Single-card target: fires as soon as the card is clicked. */
  cardTarget?: CardTargetMode
  /**
   * For 'sequence' mode: per-step toast hints.
   * sequenceHints[0] = hint shown on activation (overrides `hint`),
   * sequenceHints[1] = hint shown after 1st card is picked, etc.
   */
  sequenceHints?: string[]
  onSelect?: (card: CardState) => void
  onSequence?: (cards: CardState[]) => void
}

// ── Singleton state ───────────────────────────────────────────────────────────

const _activeKey  = ref<string | null>(null)
const _sequence   = ref<CardState[]>([])
let   _hintId: number | null = null
const _registry   = new Map<string, ShortcutDef>()
let   _attached   = false

// ── Internal helpers ──────────────────────────────────────────────────────────

function showHint(msg: string) {
  if (_hintId !== null) {
    useToast().updateMessage(_hintId, msg)
  } else {
    _hintId = useToast().hint(msg)
  }
}

function clearHint() {
  if (_hintId !== null) {
    useToast().remove(_hintId)
    _hintId = null
  }
}

function cancel() {
  _activeKey.value = null
  _sequence.value  = []
  clearHint()
}

function activate(key: string) {
  if (_activeKey.value === key) return
  if (_activeKey.value) cancel()

  const def = _registry.get(key)
  if (!def || !def.cardTarget) return

  _activeKey.value = key
  _sequence.value  = []
  showHint(def.sequenceHints?.[0] ?? def.hint)
}

// ── Card click handler (called by CardView) ───────────────────────────────────

/**
 * Returns true if the click was consumed by the shortcut system.
 * CardView should swallow the event and skip drag when this returns true.
 */
function handleCardClick(card: CardState): boolean {
  const key = _activeKey.value
  if (!key) return false
  const def = _registry.get(key)
  if (!def?.cardTarget) return false

  if (def.cardTarget === 'single') {
    def.onSelect?.(card)
    cancel()
    return true
  }

  // sequence mode
  const next = [..._sequence.value, card]
  const total = def.sequenceHints ? def.sequenceHints.length : 2

  if (next.length >= total) {
    def.onSequence?.(next)
    cancel()
  } else {
    _sequence.value = next
    showHint(def.sequenceHints?.[next.length] ?? def.hint)
  }

  return true
}

// ── Keyboard listeners ────────────────────────────────────────────────────────

function onKeyDown(e: KeyboardEvent) {
  if (e.repeat) return
  const target = e.target as HTMLElement
  if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return

  const key = e.key.toLowerCase()
  const def = _registry.get(key)
  if (!def) return

  if (def.onInstant) {
    def.onInstant()
    return
  }

  activate(key)
}

function onKeyUp(e: KeyboardEvent) {
  if (_activeKey.value === e.key.toLowerCase()) cancel()
}

// ── Public API ────────────────────────────────────────────────────────────────

export function useBoardShortcuts() {
  if (!_attached) {
    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('keyup',   onKeyUp)
    _attached = true
  }

  return {
    /** The key of the currently active hold-mode shortcut (null if none). */
    activeKey:   readonly(_activeKey),
    /** Cards selected so far in a sequence shortcut. */
    sequence:    readonly(_sequence),
    /** Register a shortcut. Safe to call multiple times (idempotent per key). */
    define(def: ShortcutDef) { _registry.set(def.key, def) },
    handleCardClick,
    cancel,
  }
}
