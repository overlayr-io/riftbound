<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { CardType } from '@riftbound/shared'
import { adminContentApi, type CardDto } from '@/services/adminContentApi'

const cards = ref<CardDto[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const search = ref('')

const form = ref({ baseCardId: '', name: '', type: 'unit' as CardType, imageUrl: '' })
const types: CardType[] = ['unit', 'spell', 'gear', 'rune', 'battlefield', 'legend']

const filtered = computed(() => {
  const s = search.value.trim().toLowerCase()
  return s ? cards.value.filter((c) => `${c.baseCardId} ${c.name}`.toLowerCase().includes(s)) : cards.value
})

async function load() {
  loading.value = true; error.value = null
  try { cards.value = await adminContentApi.listCards() }
  catch { error.value = 'Erreur de chargement' }
  finally { loading.value = false }
}
async function save() {
  if (!form.value.baseCardId || !form.value.name) return
  await adminContentApi.upsertCard(form.value.baseCardId, form.value.name, form.value.type, form.value.imageUrl)
  form.value = { baseCardId: '', name: '', type: 'unit', imageUrl: '' }
  await load()
}
function edit(c: CardDto) { form.value = { baseCardId: c.baseCardId, name: c.name, type: c.type, imageUrl: c.imageUrl } }
async function del(id: string) { await adminContentApi.deleteCard(id); await load() }

onMounted(load)
</script>

<template>
  <div>
    <header class="page-head">
      <p class="adm-eyebrow">Domaine D · contenu</p>
      <h1 class="adm-title">Base de cartes</h1>
    </header>

    <div class="adm-card block">
      <div class="section-title">Ajouter / corriger une carte</div>
      <p class="hint">Saisie manuelle en attendant la vraie API officielle (le stub <code>fetchCardData</code> remplira <code>imageUrl</code> à terme).</p>
      <div class="form">
        <input v-model="form.baseCardId" class="adm-input" placeholder="baseCardId" />
        <input v-model="form.name" class="adm-input" placeholder="Nom" />
        <select v-model="form.type" class="adm-input">
          <option v-for="t in types" :key="t" :value="t">{{ t }}</option>
        </select>
        <input v-model="form.imageUrl" class="adm-input grow" placeholder="imageUrl (optionnel)" />
        <button class="adm-btn adm-btn--primary" :disabled="!form.baseCardId || !form.name" @click="save">Enregistrer</button>
      </div>
    </div>

    <div class="adm-card block">
      <div class="section-title">Cartes ({{ cards.length }})</div>
      <input v-model="search" class="adm-input search" placeholder="Rechercher une carte" />
      <div v-if="loading" class="adm-state"><div class="adm-spinner" /> Chargement…</div>
      <div v-else-if="error" class="adm-state adm-state--error">{{ error }}</div>
      <div v-else-if="filtered.length === 0" class="adm-state"><span class="empty">◆</span> Aucune carte.</div>
      <table v-else class="adm-table">
        <thead><tr><th>Aperçu</th><th>baseCardId</th><th>Nom</th><th>Type</th><th></th></tr></thead>
        <tbody>
          <tr v-for="c in filtered" :key="c.baseCardId">
            <td><img v-if="c.imageUrl" :src="c.imageUrl" class="thumb" alt="" /><span v-else class="thumb empty-thumb">—</span></td>
            <td class="adm-mono">{{ c.baseCardId }}</td>
            <td>{{ c.name }}</td>
            <td><span class="adm-chip">{{ c.type }}</span></td>
            <td class="actions">
              <button class="adm-btn adm-btn--ghost mini" @click="edit(c)">Éditer</button>
              <button class="adm-btn danger-btn mini" @click="del(c.baseCardId)">Suppr.</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.page-head { margin-bottom: 1.5rem; }
.page-head .adm-eyebrow { margin-bottom: 0.35rem; }
.block { padding: 1.35rem 1.5rem; margin-bottom: 1.25rem; }
.section-title { font-size: 0.7rem; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: var(--adm-text-dim); margin-bottom: 0.9rem; }
.hint { color: var(--adm-text-dim); font-size: 0.82rem; margin: 0 0 1rem; }
code { background: var(--adm-raise); padding: 0.05rem 0.3rem; border-radius: 4px; color: var(--adm-gold); }
.form { display: flex; gap: 0.5rem; flex-wrap: wrap; align-items: center; }
.form .adm-input { min-width: 120px; }
.form .grow { flex: 1; min-width: 200px; }
.search { margin-bottom: 1rem; max-width: 320px; }
.thumb { width: 34px; height: 46px; object-fit: cover; border-radius: 4px; border: 1px solid var(--adm-border); }
.empty-thumb { display: inline-flex; align-items: center; justify-content: center; color: var(--adm-text-faint); }
.actions { display: flex; gap: 0.4rem; }
.mini { padding: 0.35rem 0.6rem; font-size: 0.76rem; }
.danger-btn { background: rgba(255,107,107,0.12); border: 1px solid rgba(255,107,107,0.4); color: var(--adm-danger); }
.empty { color: var(--adm-gold); opacity: 0.5; }
</style>
