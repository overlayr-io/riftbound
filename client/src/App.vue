<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import MainLayout from '@/layouts/MainLayout.vue'
import GameLayout from '@/layouts/GameLayout.vue'
import ToastContainer from '@/components/ToastContainer.vue'

const route = useRoute()

const layout = computed(() =>
  route.meta.layout === 'game' ? GameLayout : MainLayout
)
</script>

<template>
  <component :is="layout">
    <RouterView />
  </component>
  <ToastContainer />
</template>
