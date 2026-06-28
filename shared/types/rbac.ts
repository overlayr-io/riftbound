/**
 * Centralised RBAC matrix. Single source of truth shared by:
 * - the server middlewares (requireRole / requirePermission),
 * - the client route guard + UI gating (useAuth.can),
 * - and mirrored by the Firestore / Realtime DB security rules.
 *
 * The model is intentionally extensible: add a role to `Role`, a permission to
 * `Permission`, then wire both into `ROLE_PERMISSIONS`.
 */

export type Role = 'super_admin' | 'moderator' | 'support' | 'viewer'

export type Permission =
  | 'games:read'
  | 'games:spectate'
  | 'games:force_end'
  | 'players:read'
  | 'players:suspend'
  | 'players:ban'
  | 'players:delete'
  | 'players:impersonate'
  | 'beta:invite_manage'
  | 'beta:waitlist_decide'
  | 'analytics:read'
  | 'revenue:read'
  | 'content:cards_manage'
  | 'content:patchnotes_manage'
  | 'content:announce'
  | 'content:playmats_manage'
  | 'ops:feature_flags'
  | 'ops:maintenance_mode'
  | 'ops:seed_data'
  | 'admin:manage_roles'
  | 'audit:read'

export const ALL_PERMISSIONS: readonly Permission[] = [
  'games:read',
  'games:spectate',
  'games:force_end',
  'players:read',
  'players:suspend',
  'players:ban',
  'players:delete',
  'players:impersonate',
  'beta:invite_manage',
  'beta:waitlist_decide',
  'analytics:read',
  'revenue:read',
  'content:cards_manage',
  'content:patchnotes_manage',
  'content:announce',
  'content:playmats_manage',
  'ops:feature_flags',
  'ops:maintenance_mode',
  'ops:seed_data',
  'admin:manage_roles',
  'audit:read',
]

/**
 * Locked default matrix.
 * - super_admin : tout.
 * - moderator   : toutes les lectures + modération comptes (suspend/ban temporaire),
 *                 décisions waitlist, gestion des invitations, force-end de partie.
 *                 EXCLU de : revenue:read, players:delete (hard), players:impersonate,
 *                 gestion de contenu, ops (feature flags / maintenance / seed),
 *                 admin:manage_roles.
 * - support / viewer : placeholders extensibles (lectures de base), affinables plus tard.
 */
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  super_admin: [...ALL_PERMISSIONS],
  moderator: [
    'games:read',
    'games:spectate',
    'games:force_end',
    'players:read',
    'players:suspend',
    'players:ban',
    'beta:invite_manage',
    'beta:waitlist_decide',
    'analytics:read',
    'content:playmats_manage',
    'audit:read',
  ],
  support: [
    'games:read',
    'players:read',
    'audit:read',
  ],
  viewer: [
    'games:read',
    'players:read',
  ],
}

export function permissionsForRole(role: Role | null | undefined): Permission[] {
  if (!role) return []
  return ROLE_PERMISSIONS[role] ?? []
}

export function hasPermission(role: Role | null | undefined, permission: Permission): boolean {
  return permissionsForRole(role).includes(permission)
}

/** True when the role is one of the admin roles (i.e. may access the backoffice at all). */
export function isAdminRole(role: Role | null | undefined): role is Role {
  return !!role && role in ROLE_PERMISSIONS
}
