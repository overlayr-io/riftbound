import type { GameMessage, GameLog } from '@riftbound/shared'
import { db } from '../config/firebase'
import { FieldValue } from 'firebase-admin/firestore'

export class ChatRepository {
  private msgCol(gameId: string) {
    return db.collection('games').doc(gameId).collection('messages')
  }

  private logCol(gameId: string) {
    return db.collection('games').doc(gameId).collection('logs')
  }

  async addMessage(gameId: string, playerId: string, playerName: string, text: string): Promise<GameMessage> {
    const data = { playerId, playerName, text, sentAt: FieldValue.serverTimestamp() }
    const ref = await this.msgCol(gameId).add(data)
    const snap = await ref.get()
    const d = snap.data()!
    return { messageId: ref.id, playerId, playerName, text, sentAt: d.sentAt?.toDate() ?? new Date() }
  }

  async addLog(gameId: string, playerId: string | null, description: string): Promise<void> {
    await this.logCol(gameId).add({ playerId, description, createdAt: FieldValue.serverTimestamp() })
  }

  async getLogs(gameId: string, limit = 50): Promise<GameLog[]> {
    const snap = await this.logCol(gameId)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get()
    return snap.docs.map(d => ({
      logId: d.id,
      playerId: d.data().playerId ?? null,
      description: d.data().description,
      createdAt: d.data().createdAt?.toDate() ?? new Date(),
    }))
  }
}
