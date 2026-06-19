import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '@/views/HomeView.vue'
import LobbyView from '@/views/LobbyView.vue'
import PatchNotesView from '@/views/PatchNotesView.vue'
import SettingsView from '@/views/SettingsView.vue'
import GameView from '@/views/GameView.vue'

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
  ],
})

export default router
