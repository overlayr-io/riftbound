import type { LobbyMessage } from '@riftbound/shared'
import { db } from '../config/firebase'
import { FieldValue } from 'firebase-admin/firestore'

export class MessageRepository {
  private col(lobbyId: string) {
    return db.collection('lobbies').doc(lobbyId).collection('messages')
  }

  async add(
    lobbyId: string,
    senderId: string,
    message: string,
    type: LobbyMessage['type'],
  ): Promise<LobbyMessage> {
    const data = {
      lobbyId,
      senderId,
      message,
      type,
      sendAt: FieldValue.serverTimestamp(),
    }
    const ref = await this.col(lobbyId).add(data)
    const doc = await ref.get()
    const d = doc.data()!
    return {
      messageId: ref.id,
      lobbyId,
      senderId,
      message,
      type,
      sendAt: d.sendAt?.toDate() ?? new Date(),
    }
  }
}
