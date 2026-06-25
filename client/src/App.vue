<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import MainLayout from '@/layouts/MainLayout.vue'
import GameLayout from '@/layouts/GameLayout.vue'
import AdminLayout from '@/layouts/AdminLayout.vue'
import ToastContainer from '@/components/ToastContainer.vue'

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
</script>

<template>
  <component :is="layout" v-if="layout">
    <RouterView />
  </component>
  <RouterView v-else />
  <ToastContainer />
</template>
