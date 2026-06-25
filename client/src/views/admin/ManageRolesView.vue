<script setup lang="ts">
import { ref } from 'vue'
import type { Role } from '@riftbound/shared'
import { ROLE_PERMISSIONS } from '@riftbound/shared'
import { useAdminStore } from '@/stores/admin'

const admin = useAdminStore()

const targetUid = ref('')
const selectedRole = ref<Role | ''>('')
const message = ref<string | null>(null)
const isError = ref(false)
const busy = ref(false)

const roles: Role[] = ['super_admin', 'moderator', 'support', 'viewer']

function permCount(r: Role): number {
  return ROLE_PERMISSIONS[r].length
}

async function submit() {
  message.value = null
  isError.value = false
  busy.value = true
  try {
    const role = selectedRole.value === '' ? null : selectedRole.value
    await admin.assignRole(targetUid.value.trim(), role)
    message.value = role
      ? `Rôle « ${role} » assigné à ${targetUid.value.slice(0, 8)}…`
      : `Rôle retiré pour ${targetUid.value.slice(0, 8)}…`
  } catch {
    isError.value = true
    message.value = admin.error ?? "Échec de l'opération."
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div>
    <header class="page-head">
      <p class="adm-eyebrow">Contrôle d'accès</p>
      <h1 class="adm-title">Gestion des rôles</h1>
    </header>

    <div class="layout">
      <div class="adm-card form-card">
        <p class="hint">
          Assigne ou retire un rôle admin via custom claim. Le token de l'utilisateur
          ciblé est révoqué immédiatement.
        </p>

        <form @submit.prevent="submit">
          <label class="adm-label">UID utilisateur
            <input v-model="targetUid" class="adm-input" placeholder="uid Firebase" required />
          </label>
          <label class="adm-label">Rôle
            <select v-model="selectedRole" class="adm-input">
              <option value="">— Retirer le rôle —</option>
              <option v-for="r in roles" :key="r" :value="r">{{ r }}</option>
            </select>
          </label>
          <button type="submit" class="adm-btn adm-btn--primary full" :disabled="busy || !targetUid.trim()">
            {{ busy ? 'En cours…' : 'Appliquer' }}
          </button>
        </form>

        <transition name="fade">
          <p v-if="message" class="msg" :class="{ error: isError }">{{ message }}</p>
        </transition>
      </div>

      <div class="adm-card roles-card">
        <div class="roles-title">Matrice des rôles</div>
        <ul class="roles-list">
          <li v-for="r in roles" :key="r">
            <span class="adm-chip adm-chip--gold">{{ r }}</span>
            <span class="perm-count">{{ permCount(r) }} permission(s)</span>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page-head { margin-bottom: 1.5rem; }
.page-head .adm-eyebrow { margin-bottom: 0.35rem; }
.layout {
  display: grid;
  grid-template-columns: minmax(0, 380px) minmax(0, 280px);
  gap: 1.25rem;
  align-items: start;
}
.form-card, .roles-card { padding: 1.5rem; }
.hint { color: var(--adm-text-dim); font-size: 0.85rem; margin: 0 0 1.4rem; line-height: 1.55; }
form { display: flex; flex-direction: column; gap: 1rem; }
select.adm-input { cursor: pointer; }
.full { width: 100%; padding-top: 0.7rem; padding-bottom: 0.7rem; }
.msg {
  margin: 1.1rem 0 0;
  color: var(--adm-ok);
  font-size: 0.85rem;
  padding: 0.55rem 0.7rem;
  border-radius: 8px;
  border: 1px solid rgba(79, 214, 160, 0.25);
  background: rgba(79, 214, 160, 0.06);
}
.msg.error {
  color: var(--adm-danger);
  border-color: rgba(255, 107, 107, 0.25);
  background: rgba(255, 107, 107, 0.06);
}
.roles-title {
  font-size: 0.7rem; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase;
  color: var(--adm-text-dim); margin-bottom: 1rem;
}
.roles-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.7rem; }
.roles-list li { display: flex; align-items: center; justify-content: space-between; }
.perm-count { color: var(--adm-text-faint); font-size: 0.76rem; }
.fade-enter-active, .fade-leave-active { transition: opacity 0.25s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
