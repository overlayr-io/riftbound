import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { BetaAccessState } from '@riftbound/shared'
import { betaApi } from '@/services/betaApi'
import { ApiError } from '@/services/http'

export const useBetaStore = defineStore('beta', () => {
  const state = ref<BetaAccessState | null>(null)
  const error = ref<string | null>(null)

  async function refresh(): Promise<BetaAccessState | null> {
    try {
      state.value = await betaApi.access()
    } catch {
      state.value = null
    }
    return state.value
  }

  async function redeem(code: string): Promise<void> {
    error.value = null
    try {
      state.value = await betaApi.redeem(code)
    } catch (err) {
      error.value = err instanceof ApiError ? humanizeRedeem(err.message) : 'Erreur'
      throw err
    }
  }

  async function joinWaitlist(email: string): Promise<void> {
    error.value = null
    try {
      state.value = await betaApi.joinWaitlist(email)
    } catch (err) {
      error.value = err instanceof ApiError ? err.message : 'Erreur'
      throw err
    }
  }

  return { state, error, refresh, redeem, joinWaitlist }
})

function humanizeRedeem(msg: string): string {
  switch (msg) {
    case 'REDEEM_NOT_FOUND': return "Ce code n'existe pas."
    case 'REDEEM_REVOKED': return 'Ce code a été révoqué.'
    case 'REDEEM_EXPIRED': return 'Ce code a expiré.'
    case 'REDEEM_EXHAUSTED': return 'Ce code a atteint son nombre maximum d\'utilisations.'
    case 'REDEEM_ALREADY_USED': return 'Tu as déjà utilisé ce code.'
    default: return 'Code invalide.'
  }
}
