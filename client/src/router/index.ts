import { createRouter, createWebHistory } from 'vue-router'
import type { Permission } from '@riftbound/shared'
import HomeView from '@/views/HomeView.vue'
import LobbyView from '@/views/LobbyView.vue'
import PatchNotesView from '@/views/PatchNotesView.vue'
import SettingsView from '@/views/SettingsView.vue'
import GameView from '@/views/GameView.vue'
import { useAuthStore } from '@/stores/auth'
import { useBetaStore } from '@/stores/beta'

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
  // Routes hors-jeu (admin/login/welcome) : pas de gate.
  if (to.meta.layout === 'blank' || to.path.startsWith('/admin')) return true

  const auth = useAuthStore()
  await auth.waitForInit()
  // Une session « voir comme » contourne le gate (l'admin observe un joueur).
  if (auth.isImpersonating) return true

  const beta = useBetaStore()
  const access = beta.state ?? (await beta.refresh())
  if (access && !access.allowed) {
    const query = typeof to.query.code === 'string' ? { code: to.query.code } : {}
    return { name: 'welcome', query }
  }
  return true
})

export default router
