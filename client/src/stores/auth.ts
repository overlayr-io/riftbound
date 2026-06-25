import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import {
  signInAnonymously,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithCustomToken,
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

const IMP_KEY = 'riftbound_impersonating'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<FirebaseUser | null>(null)
  const initialized = ref(false)
  const role = ref<Role | null>(null)
  const isImpersonating = ref(sessionStorage.getItem(IMP_KEY) !== null)
  const impersonatedUid = ref<string | null>(sessionStorage.getItem(IMP_KEY))

  // Token d'impersonation passé par l'admin via ?impersonate= (nouvel onglet).
  const url = new URLSearchParams(window.location.search)
  let pendingImpersonateToken = url.get('impersonate')
  if (pendingImpersonateToken) {
    url.delete('impersonate')
    const qs = url.toString()
    window.history.replaceState({}, '', window.location.pathname + (qs ? `?${qs}` : ''))
  }

  let resolveInit!: () => void
  const initPromise = new Promise<void>((resolve) => { resolveInit = resolve })

  const permissions = computed<Permission[]>(() => permissionsForRole(role.value))
  const isAdmin = computed(() => isAdminRole(role.value))

  function can(permission: Permission): boolean {
    return hasPermission(role.value, permission)
  }

  async function loadClaims(u: FirebaseUser, forceRefresh = false): Promise<void> {
    try {
      const result = await u.getIdTokenResult(forceRefresh)
      role.value = isAdminRole(result.claims.role as Role) ? (result.claims.role as Role) : null
    } catch {
      role.value = null
    }
  }

  async function refreshClaims(): Promise<void> {
    if (user.value) await loadClaims(user.value, true)
  }

  onAuthStateChanged(auth, async (u) => {
    if (u) {
      user.value = u
      await loadClaims(u)
      try { await userApi.syncSession() } catch { /* noop */ }
    } else if (pendingImpersonateToken) {
      // Connexion en tant que joueur ciblé (impersonation).
      const tok = pendingImpersonateToken
      pendingImpersonateToken = null
      try {
        const cred = await signInWithCustomToken(auth, tok)
        user.value = cred.user
        isImpersonating.value = true
        impersonatedUid.value = cred.user.uid
        sessionStorage.setItem(IMP_KEY, cred.user.uid)
      } catch {
        const credential = await signInAnonymously(auth)
        user.value = credential.user
      }
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

  async function signUpPlayer(email: string, password: string): Promise<void> {
    const credential = await createUserWithEmailAndPassword(auth, email, password)
    await loadClaims(credential.user, true)
  }

  async function signInWithGoogle(): Promise<void> {
    const credential = await signInWithPopup(auth, new GoogleAuthProvider())
    await loadClaims(credential.user, true)
  }

  async function signOut(): Promise<void> {
    sessionStorage.removeItem(IMP_KEY)
    isImpersonating.value = false
    impersonatedUid.value = null
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
    isImpersonating,
    impersonatedUid,
    can,
    refreshClaims,
    signInWithEmail,
    signUpPlayer,
    signInWithGoogle,
    signOut,
    waitForInit,
  }
})
