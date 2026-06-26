<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import MainLayout from '@/layouts/MainLayout.vue'
import GameLayout from '@/layouts/GameLayout.vue'
import AdminLayout from '@/layouts/AdminLayout.vue'
import ToastContainer from '@/components/ToastContainer.vue'
import ImpersonationBanner from '@/components/ImpersonationBanner.vue'
import AnnouncementBanner from '@/components/AnnouncementBanner.vue'
import BugReportWidget from '@/components/BugReportWidget.vue'
import ConsentBanner from '@/components/ConsentBanner.vue'

const route = useRoute()

// 'blank' = aucune chrome (ex. login admin plein écran).
const layout = computed(() => {
  switch (route.meta.layout) {
    case 'game': return GameLayout
    case 'admin': return AdminLayout
    case 'blank': return null
    default: return MainLayout
  }
})

// Bannière d'annonces : uniquement côté joueur (main/game).
const showAnnouncements = computed(() => route.meta.layout === 'main' || route.meta.layout === 'game' || route.meta.layout === undefined)
</script>

<template>
  <ImpersonationBanner />
  <AnnouncementBanner v-if="showAnnouncements" />
  <component :is="layout" v-if="layout">
    <RouterView />
  </component>
  <RouterView v-else />
  <template v-if="showAnnouncements">
    <BugReportWidget />
    <ConsentBanner />
  </template>
  <ToastContainer />
</template>
