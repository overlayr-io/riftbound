import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '@/views/HomeView.vue'
import LobbyView from '@/views/LobbyView.vue'
import PatchNotesView from '@/views/PatchNotesView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      component: HomeView,
      meta: { layout: 'main' },
    },
    {
      path: '/lobby',
      component: LobbyView,
      meta: { layout: 'main' },
    },
    {
      path: '/patch-notes',
      component: PatchNotesView,
      meta: { layout: 'main' },
    },
  ],
})

export default router
