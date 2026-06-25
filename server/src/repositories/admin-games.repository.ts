import type {
  GameSummary, GameDetail, RoundSummary, GamePlayerInfo, GameStatus,
} from '@riftbound/shared'
import { gameStatusOf } from '@riftbound/shared'
import { db } from '../config/firebase'
import { FieldValue } from 'firebase-admin/firestore'

/**
 * Accès admin EN LECTURE SEULE au modèle de jeu existant (+ une seule op
 * d'abandon). Volontairement séparé de GameRepository pour ne jamais toucher
 * à la logique de jeu.
 */
export class AdminGamesRepository {
  private readonly col = db.collection('games')

  private toSummary(id: string, data: FirebaseFirestore.DocumentData): GameSummary {
    const playerIds: string[] = data.playerIds ?? []
    const playerNames = (data.playerNames ?? {}) as Record<string, { name: string; teamId: '1' | '2' | null }>
    const players: GamePlayerInfo[] = playerIds.map((uid) => ({
      uid,
      name: playerNames[uid]?.name ?? uid.slice(0, 6),
      teamId: playerNames[uid]?.teamId ?? null,
    }))
    const endedAt = data.endedAt?.toDate() ?? null
    const deletedAt = data.deletedAt?.toDate() ?? null
    const status: GameStatus = gameStatusOf(endedAt, deletedAt)

    return {
      gameId: id,
      lobbyId: data.lobbyId ?? '',
      mode: data.mode,
      matchFormat: data.matchFormat,
      deckFormat: data.deckFormat,
      status,
      players,
      currentRoundId: data.currentRoundId ?? null,
      roundResults: data.roundResults ?? [],
      createdAt: data.createdAt?.toDate() ?? new Date(),
      updatedAt: data.updatedAt?.toDate() ?? new Date(),
      endedAt,
    }
  }

  /** Scanne les N parties les plus récemment actives (tri serveur, filtre en service). */
  async list(scanLimit = 200): Promise<GameSummary[]> {
    const snap = await this.col.orderBy('updatedAt', 'desc').limit(scanLimit).get()
    return snap.docs.map((d) => this.toSummary(d.id, d.data()))
  }

  async getDetail(gameId: string): Promise<GameDetail | null> {
    const snap = await this.col.doc(gameId).get()
    if (!snap.exists) return null
    const summary = this.toSummary(gameId, snap.data()!)

    const roundsSnap = await this.col.doc(gameId).collection('rounds').orderBy('round', 'asc').get()
    const rounds: RoundSummary[] = roundsSnap.docs.map((d) => {
      const r = d.data()
      return {
        roundId: d.id,
        round: r.round,
        setup: r.setup,
        winnerId: r.winnerId ?? null,
        endedAt: r.endedAt?.toDate() ?? null,
        updatedAt: r.updatedAt?.toDate() ?? new Date(),
      }
    })

    return { ...summary, rounds }
  }

  /** Abandon admin : pose endedAt sur la partie + le round courant (winner inchangé). */
  async forceEnd(gameId: string): Promise<{ before: GameSummary } | null> {
    const snap = await this.col.doc(gameId).get()
    if (!snap.exists) return null
    const before = this.toSummary(gameId, snap.data()!)
    if (before.status !== 'active') return { before }

    const now = FieldValue.serverTimestamp()
    const batch = db.batch()
    batch.update(this.col.doc(gameId), { endedAt: now, updatedAt: now })
    if (before.currentRoundId) {
      batch.update(this.col.doc(gameId).collection('rounds').doc(before.currentRoundId), {
        endedAt: now,
        updatedAt: now,
      })
    }
    await batch.commit()
    return { before }
  }
}
