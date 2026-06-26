import type { MaintenanceState, ChatModerationConfig, Role } from '@riftbound/shared'
import { db } from '../config/firebase'
import { FieldValue } from 'firebase-admin/firestore'

const MAINTENANCE_DOC = 'opsSettings/maintenance'
const CHATMOD_DOC = 'opsSettings/chatModeration'

const DEFAULT_MAINTENANCE: MaintenanceState = { enabled: false, message: '', allowRoles: ['super_admin'] }
const CACHE_TTL_MS = 5000

export class OpsSettingsRepository {
  private maintCache: { value: MaintenanceState; at: number } | null = null

  async getMaintenance(): Promise<MaintenanceState> {
    const snap = await db.doc(MAINTENANCE_DOC).get()
    if (!snap.exists) return { ...DEFAULT_MAINTENANCE }
    const d = snap.data()!
    return {
      enabled: d.enabled ?? false,
      message: d.message ?? '',
      allowRoles: (d.allowRoles as Role[]) ?? ['super_admin'],
    }
  }

  /** Lecture cachée (5s) pour le middleware appelé à chaque requête joueur. */
  async getMaintenanceCached(): Promise<MaintenanceState> {
    if (this.maintCache && Date.now() - this.maintCache.at < CACHE_TTL_MS) {
      return this.maintCache.value
    }
    const value = await this.getMaintenance()
    this.maintCache = { value, at: Date.now() }
    return value
  }

  async setMaintenance(state: MaintenanceState): Promise<MaintenanceState> {
    await db.doc(MAINTENANCE_DOC).set({ ...state, updatedAt: FieldValue.serverTimestamp() }, { merge: true })
    this.maintCache = null
    return this.getMaintenance()
  }

  async getChatConfig(): Promise<ChatModerationConfig> {
    const snap = await db.doc(CHATMOD_DOC).get()
    return { extraBlockedWords: snap.exists ? (snap.data()!.extraBlockedWords ?? []) : [] }
  }

  async setChatConfig(words: string[]): Promise<ChatModerationConfig> {
    await db.doc(CHATMOD_DOC).set({ extraBlockedWords: words, updatedAt: FieldValue.serverTimestamp() }, { merge: true })
    return this.getChatConfig()
  }
}

// Singleton partagé (cache de maintenance commun au middleware et au service).
export const opsSettingsRepository = new OpsSettingsRepository()
