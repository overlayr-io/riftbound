import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { GamesFilter } from '@riftbound/shared'
import { adminGamesApi, type GameSummaryDto, type GameDetailDto } from '@/services/adminGamesApi'
import { ApiError } from '@/services/http'

export const useAdminGamesStore = defineStore('adminGames', () => {
  const games = ref<GameSummaryDto[]>([])
  const detail = ref<GameDetailDto | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchList(filter: GamesFilter = {}): Promise<void> {
    loading.value = true
    error.value = null
    try {
      games.value = await adminGamesApi.list(filter)
    } catch (err) {
      error.value = err instanceof ApiError ? err.message : 'Erreur de chargement'
    } finally {
      loading.value = false
    }
  }

  async function fetchDetail(gameId: string): Promise<void> {
    loading.value = true
    error.value = null
    detail.value = null
    try {
      detail.value = await adminGamesApi.detail(gameId)
    } catch (err) {
      error.value = err instanceof ApiError ? err.message : 'Erreur de chargement'
    } finally {
      loading.value = false
    }
  }

  async function forceEnd(gameId: string): Promise<void> {
    detail.value = await adminGamesApi.forceEnd(gameId)
  }

  return { games, detail, loading, error, fetchList, fetchDetail, forceEnd }
})
