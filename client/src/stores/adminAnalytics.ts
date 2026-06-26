import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { DashboardMetrics, SystemHealth, FirebaseQuotaMetrics } from '@riftbound/shared'
import { adminAnalyticsApi } from '@/services/adminAnalyticsApi'
import { ApiError } from '@/services/http'

export const useAdminAnalyticsStore = defineStore('adminAnalytics', () => {
  const dashboard = ref<DashboardMetrics | null>(null)
  const health = ref<SystemHealth | null>(null)
  const quota = ref<FirebaseQuotaMetrics | null>(null)
  const loading = ref(false)
  const quotaLoading = ref(false)
  const error = ref<string | null>(null)
  const quotaError = ref<string | null>(null)

  async function load(days = 14): Promise<void> {
    loading.value = true; error.value = null
    try {
      dashboard.value = await adminAnalyticsApi.dashboard(days)
      health.value = await adminAnalyticsApi.health()
    } catch (err) {
      error.value = err instanceof ApiError ? err.message : 'Erreur de chargement'
    } finally {
      loading.value = false
    }
  }

  async function loadQuota(): Promise<void> {
    quotaLoading.value = true; quotaError.value = null
    try {
      quota.value = await adminAnalyticsApi.quotas()
    } catch (err) {
      quotaError.value = err instanceof ApiError ? err.message : 'Erreur quota'
    } finally {
      quotaLoading.value = false
    }
  }

  return { dashboard, health, quota, loading, quotaLoading, error, quotaError, load, loadQuota }
})
