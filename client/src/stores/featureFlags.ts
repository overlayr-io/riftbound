import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { FeatureFlag } from '@riftbound/shared'
import { publicApi } from '@/services/publicApi'

export const useFeatureFlagsStore = defineStore('featureFlags', () => {
  const flags = ref<FeatureFlag[]>([])
  const loaded = ref(false)

  async function load() {
    if (loaded.value) return
    try {
      flags.value = await publicApi.flags()
    } catch {
      flags.value = []
    }
    loaded.value = true
  }

  function isEnabled(key: string): boolean {
    const flag = flags.value.find(f => f.key === key)
    if (!flag) return false
    return flag.enabled && flag.rolloutPercent >= 100
  }

  const is2v2Enabled = computed(() => isEnabled('2v2'))

  return { flags, loaded, load, isEnabled, is2v2Enabled }
})
