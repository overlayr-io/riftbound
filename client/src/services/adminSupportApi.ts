import type { BugReport, ErrorLogEntry, BugReportStatus } from '@riftbound/shared'
import { apiFetch } from './http'
import { auth } from '@/firebase'

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

export type BugReportDto = Omit<BugReport, 'createdAt'> & { createdAt: string }
export type ErrorLogDto = Omit<ErrorLogEntry, 'at'> & { at: string }

export const adminSupportApi = {
  listBugReports(status?: BugReportStatus): Promise<BugReportDto[]> {
    return apiFetch('GET', `/admin/bug-reports${status ? `?status=${status}` : ''}`)
  },
  updateBugReport(id: string, patch: { status?: BugReportStatus; assignedTo?: string | null }): Promise<BugReportDto> {
    return apiFetch('PATCH', `/admin/bug-reports/${id}`, patch)
  },
  listErrors(): Promise<ErrorLogDto[]> {
    return apiFetch('GET', '/admin/errors')
  },
  anonymizeUser(uid: string): Promise<void> {
    return apiFetch('POST', `/admin/users/${uid}/anonymize`)
  },
  async exportUserData(uid: string): Promise<void> {
    const token = await auth.currentUser!.getIdToken()
    const res = await fetch(`${BASE_URL}/api/admin/users/${uid}/export`, { headers: { Authorization: `Bearer ${token}` } })
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `export-${uid.slice(0, 8)}.json`; a.click()
    URL.revokeObjectURL(url)
  },
}
