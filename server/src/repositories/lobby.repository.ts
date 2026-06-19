import type {GameMatchFormat, Lobby, LobbyPlayerState, LobbyType} from '@riftbound/shared'
import type { GameMode, GameDeckFormat } from '@riftbound/shared'
import { db } from '../config/firebase'
import { FieldValue } from 'firebase-admin/firestore'

const MATCHMAKING_TTL_MS = 10 * 60 * 1000

function docToLobby(id: string, data: FirebaseFirestore.DocumentData): Lobby {
  const rawPlayers = data.players ?? {}
  return {
    lobbyId: id,
    type: data.type,
    host: data.host,
    lobbyCode: data.lobbyCode,
    mode: data.mode,
    matchFormat: data.matchFormat,
    deckFormat: data.deckFormat,
    players: new Map(Object.entries(rawPlayers)),
    gameId: data.gameId ?? null,
    createdAt: data.createdAt?.toDate() ?? new Date(),
    updatedAt: data.updatedAt?.toDate() ?? new Date(),
    deletedAt: data.deletedAt?.toDate() ?? null,
  }
}

function playersToObj(players: Map<string, LobbyPlayerState>): Record<string, LobbyPlayerState> {
  return Object.fromEntries(players)
}

export class LobbyRepository {
  private readonly col = db.collection('lobbies')

  async findById(id: string): Promise<Lobby | null> {
    const doc = await this.col.doc(id).get()
    if (!doc.exists) return null
    return docToLobby(doc.id, doc.data()!)
  }

  async findByCode(code: string): Promise<Lobby | null> {
    const snap = await this.col
      .where('lobbyCode', '==', code)
      .where('type', '==', 'private')
      .where('gameId', '==', null)
      .where('deletedAt', '==', null)
      .limit(1)
      .get()
    if (snap.empty) return null
    const doc = snap.docs[0]
    return docToLobby(doc.id, doc.data())
  }

  async codeExists(code: string): Promise<boolean> {
    const snap = await this.col
      .where('lobbyCode', '==', code)
      .where('deletedAt', '==', null)
      .limit(1)
      .get()
    return !snap.empty
  }

  async findAvailableMatchmaking(
    mode: GameMode,
    deckFormat: GameDeckFormat | 'ANY',
    maxPlayers: number,
  ): Promise<Lobby | null> {
    const cutoff = new Date(Date.now() - MATCHMAKING_TTL_MS)
    const snap = await this.col
      .where('type', '==', 'matchmaking')
      .where('mode', '==', mode)
      .where('gameId', '==', null)
      .where('deletedAt', '==', null)
      .where('createdAt', '>', cutoff)
      .get()

    for (const doc of snap.docs) {
      const lobby = docToLobby(doc.id, doc.data())
      const formatMatch =
        deckFormat === 'ANY' ||
        lobby.deckFormat === 'ANY' ||
        lobby.deckFormat === deckFormat
      if (formatMatch && lobby.players.size < maxPlayers) {
        return lobby
      }
    }
    return null
  }

  async create(
    type: LobbyType,
    host: string,
    lobbyCode: string,
    mode: GameMode,
    matchFormat: GameMatchFormat,
    deckFormat: GameDeckFormat,
    initialPlayer: { uid: string; state: LobbyPlayerState },
  ): Promise<Lobby> {
    const now = FieldValue.serverTimestamp()
    const data = {
      type,
      host,
      lobbyCode,
      mode,
      matchFormat,
      deckFormat,
      players: { [initialPlayer.uid]: initialPlayer.state },
      gameId: null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    }
    const ref = await this.col.add(data)
    const doc = await ref.get()
    return docToLobby(ref.id, doc.data()!)
  }

  async addPlayer(lobbyId: string, uid: string, state: LobbyPlayerState): Promise<void> {
    await this.col.doc(lobbyId).update({
      [`players.${uid}`]: state,
      updatedAt: FieldValue.serverTimestamp(),
    })
  }

  async removePlayer(lobbyId: string, uid: string): Promise<void> {
    await this.col.doc(lobbyId).update({
      [`players.${uid}`]: FieldValue.delete(),
      updatedAt: FieldValue.serverTimestamp(),
    })
  }

  async updatePlayerState(lobbyId: string, uid: string, state: Partial<LobbyPlayerState>): Promise<void> {
    const update: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() }
    for (const [k, v] of Object.entries(state)) {
      update[`players.${uid}.${k}`] = v
    }
    await this.col.doc(lobbyId).update(update)
  }

  async transferHost(lobbyId: string, newHost: string): Promise<void> {
    await this.col.doc(lobbyId).update({
      host: newHost,
      updatedAt: FieldValue.serverTimestamp(),
    })
  }

  async setGameId(lobbyId: string, gameId: string): Promise<void> {
    await this.col.doc(lobbyId).update({
      gameId,
      updatedAt: FieldValue.serverTimestamp(),
    })
  }

  async softDelete(lobbyId: string): Promise<void> {
    await this.col.doc(lobbyId).update({
      deletedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    })
  }
}
