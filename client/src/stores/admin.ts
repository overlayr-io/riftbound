import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { AuditLogFilter, Role } from '@riftbound/shared'
import { adminApi, type AuditLogDto } from '@/services/adminApi'
import { ApiError } from '@/services/http'
import { useAuthStore } from './auth'

export const useAdminStore = defineStore('admin', () => {
  const auditEntries = ref<AuditLogDto[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchAudit(filter: AuditLogFilter = {}): Promise<void> {
    loading.value = true
    error.value = null
    try {
      auditEntries.value = await adminApi.listAudit(filter)
    } catch (err) {
      error.value = err instanceof ApiError ? err.message : 'Erreur de chargement'
    } finally {
      loading.value = false
    }
  }

  /** Assigne/retire un rôle, puis rafraîchit ses propres claims si on s'est ciblé. */
  async function assignRole(uid: string, role: Role | null): Promise<void> {
    error.value = null
    try {
      if (role) await adminApi.assignRole(uid, role)
      else await adminApi.revokeRole(uid)
      const auth = useAuthStore()
      if (auth.user?.uid === uid) await auth.refreshClaims()
    } catch (err) {
      error.value = err instanceof ApiError ? err.message : 'Erreur'
      throw err
    }
  }

  return { auditEntries, loading, error, fetchAudit, assignRole }
})
