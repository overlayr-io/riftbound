import { createRouter, createWebHistory } from 'vue-router'
import type { Permission } from '@riftbound/shared'
import HomeView from '@/views/HomeView.vue'
import LobbyView from '@/views/LobbyView.vue'
import PatchNotesView from '@/views/PatchNotesView.vue'
import SettingsView from '@/views/SettingsView.vue'
import GameView from '@/views/GameView.vue'
import { useAuthStore } from '@/stores/auth'

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
  if (!to.meta.requiresAdmin) return true

  const auth = useAuthStore()
  await auth.waitForInit()

  if (!auth.isAdmin) {
    return { name: 'admin-login', query: { redirect: to.fullPath } }
  }

  const required = (to.meta.requiresPermission as Permission[] | undefined) ?? []
  if (required.some((perm) => !auth.can(perm))) {
    // Autorisé au backoffice mais pas à cette page → renvoi à l'accueil admin.
    return { name: 'admin-home' }
  }

  return true
})

export default router
