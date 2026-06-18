import type { Lobby } from '@riftbound/shared'
import { LobbyRepository } from '../repositories/lobby.repository'

export class LobbyService {
  constructor(private readonly lobbyRepo: LobbyRepository) {}

  async getLobbyById(id: string): Promise<Lobby | null> {
    return this.lobbyRepo.findById(id)
  }

  async createLobby(data: Omit<Lobby, 'lobbyId'>): Promise<Lobby> {
    return this.lobbyRepo.create(data)
  }
}
