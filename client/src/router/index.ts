import { createRouter, createWebHistory } from 'vue-router'
import type { Permission } from '@riftbound/shared'
import HomeView from '@/views/HomeView.vue'
import LobbyView from '@/views/LobbyView.vue'
import PatchNotesView from '@/views/PatchNotesView.vue'
import SettingsView from '@/views/SettingsView.vue'
import GameView from '@/views/GameView.vue'
import { useAuthStore } from '@/stores/auth'
import { useBetaStore } from '@/stores/beta'
import { publicApi } from '@/services/publicApi'

// Cache court (15s) du statut maintenance pour ne pas appeler l'API à chaque nav.
let maintCache: { value: boolean; at: number } | null = null
async function checkMaintenance(): Promise<boolean> {
  if (maintCache && Date.now() - maintCache.at < 15000) return maintCache.value
  try {
    const m = await publicApi.maintenance()
    maintCache = { value: m.enabled, at: Date.now() }
    return m.enabled
  } catch {
    return false
  }
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
      meta: { layout: 'main' },
    },
    {
      path: '/lobby',
      component: LobbyView,
      name: 'lobby',
      meta: { layout: 'main' },
    },
    {
      path: '/game/:gameId',
      name: 'game',
      component: GameView,
      meta: { layout: 'game' },
    },
    {
      path: '/patch-notes',
      name: 'patch-notes',
      component: PatchNotesView,
      meta: { layout: 'main' },
    },
    {
      path: '/settings',
      name: 'settings',
      component: SettingsView,
      meta: { layout: 'main' },
    },
    {
      path: '/welcome',
      name: 'welcome',
      component: () => import('@/views/BetaGateView.vue'),
      meta: { layout: 'blank' },
    },
    {
      path: '/maintenance',
      name: 'maintenance',
      component: () => import('@/views/MaintenanceView.vue'),
      meta: { layout: 'blank' },
    },

    // ── Backoffice admin (chunk lazy-loaded, jamais chargé pour un joueur) ──
    {
      path: '/admin/login',
      name: 'admin-login',
      component: () => import('@/views/admin/AdminLoginView.vue'),
      meta: { layout: 'blank' },
    },
    {
      path: '/admin',
      name: 'admin-home',
      component: () => import('@/views/admin/AdminHomeView.vue'),
      meta: { layout: 'admin', requiresAdmin: true },
    },
    {
      path: '/admin/games',
      name: 'admin-games',
      component: () => import('@/views/admin/GamesListView.vue'),
      meta: { layout: 'admin', requiresAdmin: true, requiresPermission: ['games:read'] },
    },
    {
      path: '/admin/games/:gameId',
      name: 'admin-game-detail',
      component: () => import('@/views/admin/GameDetailView.vue'),
      meta: { layout: 'admin', requiresAdmin: true, requiresPermission: ['games:read'] },
    },
    {
      path: '/admin/users',
      name: 'admin-users',
      component: () => import('@/views/admin/UsersListView.vue'),
      meta: { layout: 'admin', requiresAdmin: true, requiresPermission: ['players:read'] },
    },
    {
      path: '/admin/users/:uid',
      name: 'admin-user-detail',
      component: () => import('@/views/admin/UserDetailView.vue'),
      meta: { layout: 'admin', requiresAdmin: true, requiresPermission: ['players:read'] },
    },
    {
      path: '/admin/beta',
      name: 'admin-beta',
      component: () => import('@/views/admin/BetaView.vue'),
      meta: { layout: 'admin', requiresAdmin: true, requiresPermission: ['beta:waitlist_decide'] },
    },
    {
      path: '/admin/analytics',
      name: 'admin-analytics',
      component: () => import('@/views/admin/AnalyticsView.vue'),
      meta: { layout: 'admin', requiresAdmin: true, requiresPermission: ['analytics:read'] },
    },
    {
      path: '/admin/revenue',
      name: 'admin-revenue',
      component: () => import('@/views/admin/RevenueView.vue'),
      meta: { layout: 'admin', requiresAdmin: true, requiresPermission: ['revenue:read'] },
    },
    {
      path: '/admin/cards',
      name: 'admin-cards',
      component: () => import('@/views/admin/CardsView.vue'),
      meta: { layout: 'admin', requiresAdmin: true, requiresPermission: ['content:cards_manage'] },
    },
    {
      path: '/admin/playmats',
      name: 'admin-playmats',
      component: () => import('@/views/admin/PlaymatsAdminView.vue'),
      meta: { layout: 'admin', requiresAdmin: true, requiresPermission: ['content:playmats_manage'] },
    },
    {
      path: '/admin/patch-notes',
      name: 'admin-patch-notes',
      component: () => import('@/views/admin/PatchNotesAdminView.vue'),
      meta: { layout: 'admin', requiresAdmin: true, requiresPermission: ['content:patchnotes_manage'] },
    },
    {
      path: '/admin/announcements',
      name: 'admin-announcements',
      component: () => import('@/views/admin/AnnouncementsView.vue'),
      meta: { layout: 'admin', requiresAdmin: true, requiresPermission: ['content:announce'] },
    },
    {
      path: '/admin/moderation',
      name: 'admin-moderation',
      component: () => import('@/views/admin/ChatModerationView.vue'),
      meta: { layout: 'admin', requiresAdmin: true, requiresPermission: ['players:suspend'] },
    },
    {
      path: '/admin/ops',
      name: 'admin-ops',
      component: () => import('@/views/admin/OpsView.vue'),
      meta: { layout: 'admin', requiresAdmin: true, requiresPermission: ['ops:feature_flags'] },
    },
    {
      path: '/admin/bug-reports',
      name: 'admin-bug-reports',
      component: () => import('@/views/admin/BugReportsView.vue'),
      meta: { layout: 'admin', requiresAdmin: true, requiresPermission: ['players:read'] },
    },
    {
      path: '/admin/errors',
      name: 'admin-errors',
      component: () => import('@/views/admin/ErrorLogsView.vue'),
      meta: { layout: 'admin', requiresAdmin: true, requiresPermission: ['analytics:read'] },
    },
    {
      path: '/admin/audit',
      name: 'admin-audit',
      component: () => import('@/views/admin/AuditLogView.vue'),
      meta: { layout: 'admin', requiresAdmin: true, requiresPermission: ['audit:read'] },
    },
    {
      path: '/admin/roles',
      name: 'admin-roles',
      component: () => import('@/views/admin/ManageRolesView.vue'),
      meta: { layout: 'admin', requiresAdmin: true, requiresPermission: ['admin:manage_roles'] },
    },
  ],
})

// Guard front : ré-appliqué côté serveur ET dans les security rules.
router.beforeEach(async (to) => {
  // ── Guard admin (RBAC) ──
  if (to.meta.requiresAdmin) {
    const auth = useAuthStore()
    await auth.waitForInit()
    if (!auth.isAdmin) {
      return { name: 'admin-login', query: { redirect: to.fullPath } }
    }
    const required = (to.meta.requiresPermission as Permission[] | undefined) ?? []
    if (required.some((perm) => !auth.can(perm))) {
      return { name: 'admin-home' }
    }
    return true
  }

  // ── Gate beta (joueur) ──
  // Routes hors-jeu (admin/login/welcome/maintenance) : pas de gate.
  if (to.meta.layout === 'blank' || to.path.startsWith('/admin')) return true

  const auth = useAuthStore()
  await auth.waitForInit()
  // Une session « voir comme » contourne le gate (l'admin observe un joueur).
  if (auth.isImpersonating) return true

  // ── Mode maintenance (joueur) ── les admins ne sont pas bloqués.
  if (!auth.isAdmin) {
    const maint = await checkMaintenance()
    if (maint && to.name !== 'maintenance') return { name: 'maintenance' }
  }

  const beta = useBetaStore()
  const access = beta.state ?? (await beta.refresh())
  if (access && !access.allowed) {
    const query = typeof to.query.code === 'string' ? { code: to.query.code } : {}
    return { name: 'welcome', query }
  }
  return true
})

export default router
