import type { CardType } from './card'

// ── Patch notes (CMS) ─────────────────────────────────────────────────────────
export type PatchNoteStatus = 'draft' | 'published'

export interface PatchNote {
  id: string
  title: string
  version: string
  body: string
  status: PatchNoteStatus
  publishedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

// ── Base de cartes (prête pour la vraie API officielle) ───────────────────────
export interface CardBase {
  baseCardId: string
  name: string
  type: CardType
  imageUrl: string
  updatedAt: Date
}

// ── Modération chat ───────────────────────────────────────────────────────────
export type ReportScope = 'game' | 'lobby'
export type ReportStatus = 'open' | 'resolved' | 'dismissed'

export interface MessageReport {
  id: string
  scope: ReportScope
  containerId: string   // gameId ou lobbyId
  messageId: string
  messageText: string
  targetUid: string
  reporterUid: string
  reason: string
  status: ReportStatus
  createdAt: Date
}

export interface ChatModerationConfig {
  extraBlockedWords: string[]
}

// ── Seed (NON-PROD) ───────────────────────────────────────────────────────────
export interface SeedResult {
  users: number
  invites: number
  lobbies: number
  games: number
}

// ── DTO d'édition ─────────────────────────────────────────────────────────────
export interface FeatureFlagInput {
  key: string
  enabled: boolean
  rolloutPercent: number
  description: string
}
