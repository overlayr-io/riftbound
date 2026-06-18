<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
</script>

<template>
  <div class="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center gap-4">
    <h1 class="text-4xl font-bold">Riftbound TCG</h1>
    <p class="text-gray-400 text-sm">{{ authStore.user?.uid }}</p>
  </div>
</template>
