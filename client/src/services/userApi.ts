import type { User } from '@riftbound/shared'
import { apiFetch } from './http'

export interface UserDto extends Omit<User, 'createdAt' | 'lastSeenAt'> {
  createdAt: string
  lastSeenAt: string | null
}

export const userApi = {
  /** Provisionne / rafraîchit le profil de l'appelant à la connexion. */
  syncSession(): Promise<UserDto> {
    return apiFetch('POST', '/users/me/session')
  },

  getMe(): Promise<UserDto> {
    return apiFetch('GET', '/users/me')
  },
}
