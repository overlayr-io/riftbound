import type { Lobby, LobbyPlayerState } from '@riftbound/shared'
import type { GameMode, GameDeckFormat, GameMatchFormat } from '@riftbound/shared'
import { MAX_PLAYERS_BY_MODE } from '@riftbound/shared'
import { LobbyRepository } from '../repositories/lobby.repository'
import { MessageRepository } from '../repositories/message.repository'

export class LobbyService {
  constructor(
    private readonly lobbyRepo: LobbyRepository,
    private readonly msgRepo: MessageRepository,
  ) {}

  async getLobbyById(id: string): Promise<Lobby | null> {
    return this.lobbyRepo.findById(id)
  }

  async matchmaking(
    uid: string,
    playerName: string,
    mode: GameMode,
    deckFormat: GameDeckFormat | 'ANY',
  ): Promise<{ lobby: Lobby; joined: boolean }> {
    const maxPlayers = MAX_PLAYERS_BY_MODE[mode]
    const existing = await this.lobbyRepo.findAvailableMatchmaking(mode, deckFormat, maxPlayers)

    if (existing) {
      const state: LobbyPlayerState = { playerName, isReady: false, teamId: null }
      await this.lobbyRepo.addPlayer(existing.lobbyId, uid, state)
      await this.msgRepo.add(existing.lobbyId, 'system', `${playerName} a rejoint la partie.`, 'system')
      const lobby = await this.lobbyRepo.findById(existing.lobbyId)
      return { lobby: lobby!, joined: true }
    }

    const lobbyCode = await this.generateUniqueCode()
    const state: LobbyPlayerState = { playerName, isReady: false, teamId: null }
    const lobby = await this.lobbyRepo.create(
      'matchmaking',
      uid,
      lobbyCode,
      mode,
      'ANY',
      deckFormat,
      { uid, state },
    )
    return { lobby, joined: false }
  }

  async createPrivate(
    uid: string,
    playerName: string,
    mode: GameMode,
    matchFormat: GameMatchFormat,
    deckFormat: GameDeckFormat,
  ): Promise<Lobby> {
    const lobbyCode = await this.generateUniqueCode()
    const state: LobbyPlayerState = { playerName, isReady: false, teamId: null }
    return this.lobbyRepo.create('private', uid, lobbyCode, mode, matchFormat, deckFormat, {
      uid,
      state,
    })
  }

  async joinByCode(uid: string, playerName: string, code: string): Promise<Lobby> {
    const lobby = await this.lobbyRepo.findByCode(code.toUpperCase())
    if (!lobby) throw new Error('LOBBY_NOT_FOUND')

    if (lobby.players.has(uid)) return lobby

    const maxPlayers = MAX_PLAYERS_BY_MODE[lobby.mode]
    if (lobby.players.size >= maxPlayers) throw new Error('LOBBY_FULL')

    const state: LobbyPlayerState = { playerName, isReady: false, teamId: null }
    await this.lobbyRepo.addPlayer(lobby.lobbyId, uid, state)
    await this.msgRepo.add(lobby.lobbyId, 'system', `${playerName} a rejoint la partie.`, 'system')

    const updated = await this.lobbyRepo.findById(lobby.lobbyId)
    return updated!
  }

  async leave(uid: string, lobbyId: string): Promise<void> {
    const lobby = await this.lobbyRepo.findById(lobbyId)
    if (!lobby) return

    const playerState = lobby.players.get(uid)
    if (!playerState) return

    const remainingPlayers = new Map(lobby.players)
    remainingPlayers.delete(uid)

    if (remainingPlayers.size === 0) {
      await this.lobbyRepo.softDelete(lobbyId)
      return
    }

    await this.lobbyRepo.removePlayer(lobbyId, uid)
    await this.msgRepo.add(lobbyId, 'system', `${playerState.playerName} a quitté la partie.`, 'system')

    if (lobby.host === uid) {
      const newHost = remainingPlayers.keys().next().value!
      await this.lobbyRepo.transferHost(lobbyId, newHost)
    }
  }

  async toggleReady(uid: string, lobbyId: string): Promise<void> {
    const lobby = await this.lobbyRepo.findById(lobbyId)
    if (!lobby) throw new Error('LOBBY_NOT_FOUND')
    const state = lobby.players.get(uid)
    if (!state) throw new Error('PLAYER_NOT_IN_LOBBY')
    await this.lobbyRepo.updatePlayerState(lobbyId, uid, { isReady: !state.isReady })
  }

  async sendMessage(uid: string, lobbyId: string, text: string): Promise<void> {
    const lobby = await this.lobbyRepo.findById(lobbyId)
    if (!lobby) throw new Error('LOBBY_NOT_FOUND')
    if (!lobby.players.has(uid)) throw new Error('PLAYER_NOT_IN_LOBBY')
    if (!text.trim()) throw new Error('EMPTY_MESSAGE')
    await this.msgRepo.add(lobbyId, uid, text.trim(), 'chat')
  }

  async cancelMatchmaking(uid: string, lobbyId: string): Promise<void> {
    const lobby = await this.lobbyRepo.findById(lobbyId)
    if (!lobby || lobby.type !== 'matchmaking') return
    await this.leave(uid, lobbyId)
  }

  private async generateUniqueCode(): Promise<string> {
    for (let i = 0; i < 5; i++) {
      const code = Math.random().toString(36).slice(2, 7).toUpperCase()
      if (!(await this.lobbyRepo.codeExists(code))) return code
    }
    throw new Error('Failed to generate unique lobby code')
  }
}
