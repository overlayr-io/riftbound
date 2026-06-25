import type { BetaSettings, BetaPhase } from '@riftbound/shared'
import { db } from '../config/firebase'
import { FieldValue } from 'firebase-admin/firestore'

const DOC = 'betaSettings/current'

export class BetaSettingsRepository {
  private get ref() {
    return db.doc(DOC)
  }

  async get(): Promise<BetaSettings> {
    const snap = await this.ref.get()
    if (!snap.exists) {
      // Défaut : 'public' → le jeu existant n'est PAS gaté tant que l'admin ne ferme pas la beta.
      return { phase: 'public', updatedAt: null, updatedBy: null }
    }
    const d = snap.data()!
    return {
      phase: (d.phase as BetaPhase) ?? 'public',
      updatedAt: d.updatedAt?.toDate() ?? null,
      updatedBy: d.updatedBy ?? null,
    }
  }

  async setPhase(phase: BetaPhase, updatedBy: string): Promise<BetaSettings> {
    await this.ref.set({ phase, updatedAt: FieldValue.serverTimestamp(), updatedBy }, { merge: true })
    return this.get()
  }
}
