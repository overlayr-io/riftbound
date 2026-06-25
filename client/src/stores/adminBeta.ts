import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { BetaPhase, WaitlistStatus } from '@riftbound/shared'
import { adminBetaApi, type BetaSettingsDto, type InviteDto, type WaitlistDto } from '@/services/adminBetaApi'
import { ApiError } from '@/services/http'

export const useAdminBetaStore = defineStore('adminBeta', () => {
  const settings = ref<BetaSettingsDto | null>(null)
  const invites = ref<InviteDto[]>([])
  const waitlist = ref<WaitlistDto[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const wrap = (err: unknown) => (err instanceof ApiError ? err.message : 'Erreur')

  async function loadAll(): Promise<void> {
    loading.value = true; error.value = null
    try {
      settings.value = await adminBetaApi.getSettings()
      invites.value = await adminBetaApi.listInvites().catch(() => invites.value)
      waitlist.value = await adminBetaApi.listWaitlist().catch(() => waitlist.value)
    } catch (err) { error.value = wrap(err) }
    finally { loading.value = false }
  }

  async function setPhase(phase: BetaPhase): Promise<void> {
    settings.value = await adminBetaApi.setPhase(phase)
  }
  async function createInvite(maxUses: number, expiresAt: string | null): Promise<void> {
    await adminBetaApi.createInvite(maxUses, expiresAt)
    invites.value = await adminBetaApi.listInvites()
  }
  async function revokeInvite(code: string): Promise<void> {
    await adminBetaApi.revokeInvite(code)
    invites.value = await adminBetaApi.listInvites()
  }
  async function decide(ids: string[], status: Extract<WaitlistStatus, 'approved' | 'rejected'>): Promise<void> {
    await adminBetaApi.decideWaitlist(ids, status)
    waitlist.value = await adminBetaApi.listWaitlist()
  }

  return { settings, invites, waitlist, loading, error, loadAll, setPhase, createInvite, revokeInvite, decide }
})
