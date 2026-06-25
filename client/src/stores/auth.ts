import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import {
  signInAnonymously,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as fbSignOut,
  onAuthStateChanged,
  type User as FirebaseUser,
} from 'firebase/auth'
import { auth } from '@/firebase'
import type { Permission, Role } from '@riftbound/shared'
import { hasPermission, isAdminRole, permissionsForRole } from '@riftbound/shared'
import { userApi } from '@/services/userApi'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<FirebaseUser | null>(null)
  const initialized = ref(false)
  const role = ref<Role | null>(null)

  let resolveInit!: () => void
  const initPromise = new Promise<void>((resolve) => {
    resolveInit = resolve
  })

  const permissions = computed<Permission[]>(() => permissionsForRole(role.value))
  const isAdmin = computed(() => isAdminRole(role.value))

  function can(permission: Permission): boolean {
    return hasPermission(role.value, permission)
  }

  /** Lit le rôle depuis les custom claims de l'ID token. */
  async function loadClaims(u: FirebaseUser, forceRefresh = false): Promise<void> {
    try {
      const result = await u.getIdTokenResult(forceRefresh)
      const claim = result.claims.role
      role.value = isAdminRole(claim as Role) ? (claim as Role) : null
    } catch {
      role.value = null
    }
  }

  /** Force le rafraîchissement du token (après assignation/révocation de rôle). */
  async function refreshClaims(): Promise<void> {
    if (user.value) await loadClaims(user.value, true)
  }

  onAuthStateChanged(auth, async (u) => {
    if (u) {
      user.value = u
      await loadClaims(u)
      // Provisionne le profil côté serveur (best-effort, ne bloque pas le jeu).
      try { await userApi.syncSession() } catch { /* noop */ }
    } else {
      role.value = null
      const credential = await signInAnonymously(auth)
      user.value = credential.user
    }
    if (!initialized.value) {
      initialized.value = true
      resolveInit()
    }
  })

  async function signInWithEmail(email: string, password: string): Promise<void> {
    const credential = await signInWithEmailAndPassword(auth, email, password)
    await loadClaims(credential.user, true)
  }

  async function signInWithGoogle(): Promise<void> {
    const credential = await signInWithPopup(auth, new GoogleAuthProvider())
    await loadClaims(credential.user, true)
  }

  /** Déconnexion admin → l'observer re-bascule en session anonyme (mode joueur). */
  async function signOut(): Promise<void> {
    await fbSignOut(auth)
  }

  function waitForInit() {
    return initPromise
  }

  return {
    user,
    initialized,
    role,
    permissions,
    isAdmin,
    can,
    refreshClaims,
    signInWithEmail,
    signInWithGoogle,
    signOut,
    waitForInit,
  }
})
