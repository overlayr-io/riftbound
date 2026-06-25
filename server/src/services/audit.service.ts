import type { AuditLogEntry, AuditLogFilter, Role } from '@riftbound/shared'
import { AuditRepository } from '../repositories/audit.repository'

export interface AuditActor {
  uid: string
  role: Role | null
  ip: string | null
}

export interface AuditRecordInput {
  actor: AuditActor
  action: string
  targetType: string
  targetId: string | null
  before?: unknown
  after?: unknown
}

/**
 * Service d'audit réutilisé par TOUTE action admin mutante.
 * Centralise l'écriture de l'AuditLogEntry pour rester homogène.
 */
export class AuditService {
  constructor(private readonly auditRepo: AuditRepository) {}

  async record(input: AuditRecordInput): Promise<void> {
    await this.auditRepo.add({
      actorUid: input.actor.uid,
      actorRole: input.actor.role,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId,
      before: input.before ?? null,
      after: input.after ?? null,
      ip: input.actor.ip,
    })
  }

  async list(filter: AuditLogFilter): Promise<AuditLogEntry[]> {
    return this.auditRepo.list(filter)
  }
}
