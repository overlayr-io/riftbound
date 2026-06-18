import { defineStore } from 'pinia'
import { ref } from 'vue'
import { signInAnonymously, onAuthStateChanged, type User } from 'firebase/auth'
import { auth } from '@/firebase'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const initialized = ref(false)

  let resolveInit!: () => void
  const initPromise = new Promise<void>((resolve) => {
    resolveInit = resolve
  })

  onAuthStateChanged(auth, async (u) => {
    if (u) {
      user.value = u
    } else {
      const credential = await signInAnonymously(auth)
      user.value = credential.user
    }
    if (!initialized.value) {
      initialized.value = true
      resolveInit()
    }
  })

  function waitForInit() {
    return initPromise
  }

  return { user, initialized, waitForInit }
})
