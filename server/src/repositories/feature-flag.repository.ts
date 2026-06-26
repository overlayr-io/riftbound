import type { FeatureFlag } from '@riftbound/shared'
import { db } from '../config/firebase'
import { FieldValue } from 'firebase-admin/firestore'

function toFlag(key: string, d: FirebaseFirestore.DocumentData): FeatureFlag {
  return {
    key,
    enabled: d.enabled ?? false,
    rolloutPercent: d.rolloutPercent ?? 0,
    description: d.description ?? '',
  }
}

export class FeatureFlagRepository {
  private readonly col = db.collection('featureFlags')

  async list(): Promise<FeatureFlag[]> {
    const snap = await this.col.get()
    return snap.docs.map((d) => toFlag(d.id, d.data())).sort((a, b) => a.key.localeCompare(b.key))
  }

  async upsert(flag: FeatureFlag): Promise<FeatureFlag> {
    await this.col.doc(flag.key).set({
      enabled: flag.enabled,
      rolloutPercent: Math.max(0, Math.min(100, flag.rolloutPercent)),
      description: flag.description,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true })
    const doc = await this.col.doc(flag.key).get()
    return toFlag(flag.key, doc.data()!)
  }

  async remove(key: string): Promise<void> {
    await this.col.doc(key).delete()
  }
}
