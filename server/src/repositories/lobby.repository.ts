import type { Lobby } from '@riftbound/shared'
import { db } from '../config/firebase'

export class LobbyRepository {
  private readonly collection = db.collection('lobbies')

  async findById(id: string): Promise<Lobby | null> {
    const doc = await this.collection.doc(id).get()
    if (!doc.exists) return null
    return { lobbyId: doc.id, ...doc.data() } as Lobby
  }

  async create(data: Omit<Lobby, 'lobbyId'>): Promise<Lobby> {
    const ref = await this.collection.add(data)
    return { lobbyId: ref.id, ...data }
  }

  async delete(id: string): Promise<void> {
    await this.collection.doc(id).delete()
  }
}
