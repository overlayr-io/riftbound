import { auth } from '@/firebase'

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

export class ApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message)
  }
}

/** Fetch multipart/form-data authentifié (sans Content-Type pour le boundary). */
export async function apiFetchForm<T>(method: string, path: string, form: FormData): Promise<T> {
  const user = auth.currentUser
  if (!user) throw new Error('Not authenticated')
  const token = await user.getIdToken()
  const res = await fetch(`${BASE_URL}/api${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  })
  if (res.status === 204) return undefined as T
  const data = await res.json()
  if (!res.ok) throw new ApiError(res.status, data.error ?? 'Unknown error')
  return data as T
}

/** Fetch authentifié vers /api/* (Bearer ID token). */
export async function apiFetch<T>(method: string, path: string, body?: unknown): Promise<T> {
  const user = auth.currentUser
  if (!user) throw new Error('Not authenticated')
  const token = await user.getIdToken()
  const res = await fetch(`${BASE_URL}/api${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  if (res.status === 204) return undefined as T
  const data = await res.json()
  if (!res.ok) throw new ApiError(res.status, data.error ?? 'Unknown error')
  return data as T
}
