import type { CardBase, CardType } from '@riftbound/shared'
import { db } from '../config/firebase'
import { FieldValue } from 'firebase-admin/firestore'

function toCard(id: string, d: FirebaseFirestore.DocumentData): CardBase {
  return {
    baseCardId: id,
    name: d.name ?? '',
    type: (d.type as CardType) ?? 'unit',
    imageUrl: d.imageUrl ?? '',
    updatedAt: d.updatedAt?.toDate() ?? new Date(),
  }
}

export class CardRepository {
  private readonly col = db.collection('cards')

  async list(): Promise<CardBase[]> {
    const snap = await this.col.orderBy('name').limit(500).get()
    return snap.docs.map((d) => toCard(d.id, d.data()))
  }

  async upsert(input: Pick<CardBase, 'baseCardId' | 'name' | 'type' | 'imageUrl'>): Promise<CardBase> {
    await this.col.doc(input.baseCardId).set({
      name: input.name, type: input.type, imageUrl: input.imageUrl,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true })
    return toCard(input.baseCardId, (await this.col.doc(input.baseCardId).get()).data()!)
  }

  async remove(baseCardId: string): Promise<void> {
    await this.col.doc(baseCardId).delete()
  }
}
