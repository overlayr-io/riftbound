import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { UsersFilter } from '@riftbound/shared'
import { adminUsersApi, type UserSummaryDto, type UserDetailDto } from '@/services/adminUsersApi'
import { ApiError } from '@/services/http'

export const useAdminUsersStore = defineStore('adminUsers', () => {
  const users = ref<UserSummaryDto[]>([])
  const detail = ref<UserDetailDto | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  function wrap(err: unknown): string {
    return err instanceof ApiError ? err.message : 'Erreur'
  }

  async function fetchList(filter: UsersFilter = {}): Promise<void> {
    loading.value = true; error.value = null
    try { users.value = await adminUsersApi.list(filter) }
    catch (err) { error.value = wrap(err) }
    finally { loading.value = false }
  }

  async function fetchDetail(uid: string): Promise<void> {
    loading.value = true; error.value = null; detail.value = null
    try { detail.value = await adminUsersApi.detail(uid) }
    catch (err) { error.value = wrap(err) }
    finally { loading.value = false }
  }

  return { users, detail, loading, error, fetchList, fetchDetail }
})
