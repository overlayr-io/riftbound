import type { DashboardMetrics, SystemHealth, RevenueMetrics } from '@riftbound/shared'
import { apiFetch } from './http'
import { auth } from '@/firebase'

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

export const adminAnalyticsApi = {
  dashboard(days = 14): Promise<DashboardMetrics> {
    return apiFetch('GET', `/admin/analytics/dashboard?days=${days}`)
  },
  health(): Promise<SystemHealth> {
    return apiFetch('GET', '/admin/analytics/health')
  },
  revenue(): Promise<RevenueMetrics> {
    return apiFetch('GET', '/admin/analytics/revenue')
  },
  /** Télécharge l'export (json|csv) via un blob authentifié. */
  async download(format: 'json' | 'csv', days = 14): Promise<void> {
    const token = await auth.currentUser!.getIdToken()
    const res = await fetch(`${BASE_URL}/api/admin/analytics/export?format=${format}&days=${days}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `riftbound-metrics.${format}`
    a.click()
    URL.revokeObjectURL(url)
  },
}
