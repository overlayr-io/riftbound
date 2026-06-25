<script setup lang="ts">
import { computed } from 'vue'
import { useRouter, useRoute, RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import type { Permission } from '@riftbound/shared'
import '@/assets/admin.css'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

const isEmulator = import.meta.env.VITE_USE_EMULATOR === 'true'

interface NavItem {
  label: string
  to: string
  permission: Permission
  icon: string
}

// Étendu au fil des phases. Filtré par permission de l'utilisateur courant.
const navItems: NavItem[] = [
  { label: 'Tableau de bord', to: '/admin', permission: 'games:read', icon: 'M3 12l9-9 9 9M5 10v10h14V10' },
  { label: 'Parties', to: '/admin/games', permission: 'games:read', icon: 'M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664zM21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
  { label: 'Joueurs', to: '/admin/users', permission: 'players:read', icon: 'M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 10-4-4 4 4 0 004 4zm6 0a4 4 0 10-3-6.5' },
  { label: 'Accès beta', to: '/admin/beta', permission: 'beta:waitlist_decide', icon: 'M15 7a2 2 0 012 2m4 0a6 6 0 01-7.74 5.74L9 19l-2 2-2-2 1.26-3.26A6 6 0 1121 9z' },
  { label: 'Audit', to: '/admin/audit', permission: 'audit:read', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
  { label: 'Rôles', to: '/admin/roles', permission: 'admin:manage_roles', icon: 'M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 10-4-4 4 4 0 004 4z' },
]

const visibleNav = computed(() => navItems.filter((i) => auth.can(i.permission)))

async function onSignOut() {
  await auth.signOut()
  router.push('/admin/login')
}
</script>

<template>
  <div class="adm admin">
    <div class="adm-bg" />

    <aside class="sidebar">
      <div class="brand">
        <div class="brand-mark">RIFTBOUND</div>
        <div class="brand-sub adm-ornament"><span>◆</span></div>
        <div class="brand-tag">BACKOFFICE</div>
      </div>

      <nav class="nav">
        <RouterLink
          v-for="item in visibleNav"
          :key="item.to"
          :to="item.to"
          class="nav-link"
          :class="{ active: route.path === item.to }"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">
            <path stroke-linecap="round" stroke-linejoin="round" :d="item.icon" />
          </svg>
          <span>{{ item.label }}</span>
        </RouterLink>
      </nav>

      <div class="sidebar-foot">v0 · RBAC</div>
    </aside>

    <div class="main">
      <header class="header">
        <span class="env-badge" :class="isEmulator ? 'env-emulator' : 'env-prod'">
          <span class="dot" />
          {{ isEmulator ? 'ÉMULATEUR' : 'PRODUCTION' }}
        </span>

        <div class="header-right">
          <span class="adm-chip adm-chip--gold">{{ auth.role ?? 'aucun rôle' }}</span>
          <span class="who">{{ auth.user?.email ?? auth.user?.uid?.slice(0, 8) }}</span>
          <button class="adm-btn adm-btn--ghost signout" @click="onSignOut">Déconnexion</button>
        </div>
      </header>

      <main class="content">
        <slot />
      </main>
    </div>
  </div>
</template>

<style scoped>
.admin {
  position: relative;
  display: flex;
  width: 100vw;
  height: 100vh;
  background: var(--adm-bg);
  font-size: 14px;
  overflow: hidden;
}
.sidebar {
  position: relative;
  z-index: 1;
  width: 230px;
  flex-shrink: 0;
  background: linear-gradient(180deg, rgba(12, 18, 29, 0.9), rgba(8, 12, 20, 0.9));
  border-right: 1px solid var(--adm-border);
  display: flex;
  flex-direction: column;
  backdrop-filter: blur(6px);
}
.brand {
  padding: 1.4rem 1.25rem 1.1rem;
  border-bottom: 1px solid var(--adm-border);
}
.brand-mark {
  font-size: 0.95rem;
  font-weight: 800;
  letter-spacing: 0.22em;
  background: var(--adm-gold-grad);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}
.brand-sub { margin: 0.45rem 0; }
.brand-tag {
  font-size: 0.58rem;
  font-weight: 700;
  letter-spacing: 0.4em;
  color: var(--adm-teal);
}
.nav {
  display: flex;
  flex-direction: column;
  padding: 0.85rem 0.6rem;
  gap: 0.15rem;
  flex: 1;
}
.nav-link {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  padding: 0.6rem 0.7rem;
  border-radius: 8px;
  color: var(--adm-text-dim);
  text-decoration: none;
  font-size: 0.85rem;
  border-left: 2px solid transparent;
  transition: background 0.15s var(--adm-ease), color 0.15s, border-color 0.15s;
}
.nav-link svg { width: 1.05rem; height: 1.05rem; opacity: 0.85; }
.nav-link:hover { background: rgba(200, 170, 110, 0.05); color: var(--adm-text); }
.nav-link.active {
  background: rgba(200, 170, 110, 0.09);
  color: var(--adm-gold-bright);
  border-left-color: var(--adm-gold);
}
.sidebar-foot {
  padding: 0.9rem 1.25rem;
  font-size: 0.62rem;
  letter-spacing: 0.15em;
  color: var(--adm-text-faint);
  border-top: 1px solid var(--adm-border);
}
.main { position: relative; z-index: 1; flex: 1; display: flex; flex-direction: column; min-width: 0; }
.header {
  height: 60px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 1.4rem;
  border-bottom: 1px solid var(--adm-border);
  background: rgba(8, 12, 20, 0.5);
  backdrop-filter: blur(6px);
}
.env-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  font-size: 0.66rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  padding: 0.3rem 0.6rem;
  border-radius: 6px;
}
.env-badge .dot { width: 7px; height: 7px; border-radius: 50%; background: currentColor; box-shadow: 0 0 8px currentColor; }
.env-emulator { background: rgba(79, 214, 160, 0.1); color: var(--adm-ok); border: 1px solid rgba(79, 214, 160, 0.3); }
.env-prod { background: rgba(255, 107, 107, 0.1); color: var(--adm-danger); border: 1px solid rgba(255, 107, 107, 0.3); }
.header-right { display: flex; align-items: center; gap: 0.85rem; }
.who { color: var(--adm-text-dim); font-size: 0.8rem; }
.signout { padding: 0.4rem 0.8rem; font-size: 0.78rem; }
.content { flex: 1; overflow: auto; padding: 2rem 2.25rem; }
</style>
