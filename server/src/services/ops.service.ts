import type { FeatureFlag, MaintenanceState, ChatModerationConfig, SeedResult } from '@riftbound/shared'
import { FeatureFlagRepository } from '../repositories/feature-flag.repository'
import { OpsSettingsRepository } from '../repositories/ops-settings.repository'
import { AuditService, type AuditActor } from './audit.service'
import { db } from '../config/firebase'
import { FieldValue } from 'firebase-admin/firestore'

export class OpsService {
  constructor(
    private readonly flags: FeatureFlagRepository,
    private readonly settings: OpsSettingsRepository,
    private readonly audit: AuditService,
  ) {}

  // ── Feature flags ──
  listFlags() { return this.flags.list() }
  async upsertFlag(actor: AuditActor, flag: FeatureFlag) {
    const result = await this.flags.upsert(flag)
    await this.audit.record({ actor, action: 'ops.flag_upsert', targetType: 'featureFlag', targetId: flag.key, before: null, after: { enabled: flag.enabled, rolloutPercent: flag.rolloutPercent } })
    return result
  }
  async removeFlag(actor: AuditActor, key: string) {
    await this.flags.remove(key)
    await this.audit.record({ actor, action: 'ops.flag_delete', targetType: 'featureFlag', targetId: key, before: null, after: null })
  }

  // ── Maintenance ──
  getMaintenance() { return this.settings.getMaintenance() }
  async setMaintenance(actor: AuditActor, state: MaintenanceState) {
    const result = await this.settings.setMaintenance(state)
    await this.audit.record({ actor, action: 'ops.maintenance', targetType: 'maintenance', targetId: 'current', before: null, after: { enabled: state.enabled } })
    return result
  }

  // ── Config modération chat ──
  getChatConfig() { return this.settings.getChatConfig() }
  async setChatConfig(actor: AuditActor, words: string[]): Promise<ChatModerationConfig> {
    const result = await this.settings.setChatConfig(words)
    await this.audit.record({ actor, action: 'ops.chat_config', targetType: 'chatModeration', targetId: 'current', before: null, after: { count: words.length } })
    return result
  }

  // ── Seed (NON-PROD, garde-fou côté route) ──
  async seed(actor: AuditActor): Promise<SeedResult> {
    const now = FieldValue.serverTimestamp()
    const stamp = Date.now()
    let users = 0, invites = 0, lobbies = 0, games = 0

    const fakeUids: string[] = []
    for (let i = 0; i < 6; i++) {
      const uid = `seed_${stamp}_${i}`
      fakeUids.push(uid)
      await db.collection('users').doc(uid).set({
        email: `seed${i}@test.dev`, displayName: `Seed Player ${i}`, isAnonymous: false,
        role: null, status: 'active', betaAccess: i % 2 ? 'granted' : 'none',
        suspendedUntil: null, suspendReason: null, muted: false,
        createdAt: now, lastSeenAt: now, deletedAt: null,
      })
      users++
    }

    for (let i = 0; i < 3; i++) {
      await db.collection('invites').doc(`SEED${stamp.toString().slice(-4)}${i}`).set({
        createdBy: actor.uid, createdAt: now, maxUses: 5, uses: 0, usedBy: [], expiresAt: null, status: 'active',
      })
      invites++
    }

    const lobbyRef = db.collection('lobbies').doc()
    await lobbyRef.set({
      type: 'private', host: fakeUids[0], lobbyCode: `SD${stamp.toString().slice(-4)}`, mode: 'dual',
      matchFormat: 'BO1', deckFormat: 'constructed',
      players: { [fakeUids[0]]: { playerName: 'Seed Player 0', isReady: true, teamId: null } },
      gameId: null, createdAt: now, updatedAt: now, deletedAt: null,
    })
    lobbies++

    for (let i = 0; i < 2; i++) {
      const ended = i === 1
      const [p1, p2] = [fakeUids[i * 2], fakeUids[i * 2 + 1]]
      const gameRef = db.collection('games').doc()
      const roundRef = gameRef.collection('rounds').doc()
      await gameRef.set({
        lobbyId: lobbyRef.id, host: p1, mode: 'dual', matchFormat: 'BO3', deckFormat: 'constructed',
        playerIds: [p1, p2], playerNames: { [p1]: { name: 'Seed A', teamId: null }, [p2]: { name: 'Seed B', teamId: null } },
        currentRoundId: roundRef.id, roundResults: ended ? [{ round: 0, winnerId: p1 }] : [],
        createdAt: now, updatedAt: now, endedAt: ended ? now : null, deletedAt: null,
      })
      await roundRef.set({
        gameId: gameRef.id, round: 1, previousRound: null, setup: 'completed',
        diceWinnerId: p1, tiedPlayerIds: null, firstPlayerId: p1, discardedBattlefieldId: null,
        bfDisplayOrder: null, winnerId: ended ? p1 : null, currentTurn: { playerId: p2, turn: 2 },
        players: {}, cards: {}, updatedAt: now, endedAt: ended ? now : null,
      })
      games++
    }

    await this.audit.record({ actor, action: 'ops.seed_data', targetType: 'seed', targetId: String(stamp), before: null, after: { users, invites, lobbies, games } })
    return { users, invites, lobbies, games }
  }
}
