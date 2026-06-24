export interface GameMessage {
  messageId: string
  playerId: string
  playerName: string
  text: string
  sentAt: Date
}

export interface GameLog {
  logId: string
  playerId: string | null
  description: string
  createdAt: Date
}
