<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { adminContentApi, type PatchNoteDto } from '@/services/adminContentApi'

const notes = ref<PatchNoteDto[]>([])
const loading = ref(false)
const editing = ref<PatchNoteDto | null>(null)
const form = ref({ title: '', version: '', body: '' })

async function load() {
  loading.value = true
  try { notes.value = await adminContentApi.listNotes() } finally { loading.value = false }
}
function startNew() { editing.value = null; form.value = { title: '', version: '', body: '' } }
function startEdit(n: PatchNoteDto) { editing.value = n; form.value = { title: n.title, version: n.version, body: n.body } }

async function save(status: 'draft' | 'published') {
  if (!form.value.title) return
  if (editing.value) await adminContentApi.updateNote(editing.value.id, { ...form.value, status })
  else await adminContentApi.createNote(form.value.title, form.value.version, form.value.body, status)
  startNew(); await load()
}
async function toggle(n: PatchNoteDto) {
  await adminContentApi.updateNote(n.id, { status: n.status === 'published' ? 'draft' : 'published' })
  await load()
}
async function del(id: string) { await adminContentApi.deleteNote(id); if (editing.value?.id === id) startNew(); await load() }
function fmt(iso: string | null) { return iso ? new Date(iso).toLocaleDateString('fr-FR') : '—' }

onMounted(load)
</script>

<template>
  <div>
    <header class="page-head">
      <p class="adm-eyebrow">Domaine D · contenu</p>
      <h1 class="adm-title">Patch notes</h1>
    </header>

    <div class="cols">
      <div class="adm-card block">
        <div class="section-title">{{ editing ? 'Éditer' : 'Nouveau' }} patch note</div>
        <div class="form">
          <input v-model="form.title" class="adm-input" placeholder="Titre" />
          <input v-model="form.version" class="adm-input" placeholder="Version (ex. 1.2.0)" />
          <textarea v-model="form.body" class="adm-input area" rows="8" placeholder="Contenu (markdown simple)"></textarea>
          <div class="btns">
            <button class="adm-btn adm-btn--ghost" :disabled="!form.title" @click="save('draft')">Brouillon</button>
            <button class="adm-btn adm-btn--primary" :disabled="!form.title" @click="save('published')">Publier</button>
            <button v-if="editing" class="adm-btn adm-btn--ghost" @click="startNew">Annuler</button>
          </div>
        </div>
      </div>

      <div class="adm-card block">
        <div class="section-title">Liste</div>
        <div v-if="loading" class="adm-state"><div class="adm-spinner" /></div>
        <ul v-else-if="notes.length" class="list">
          <li v-for="n in notes" :key="n.id" :class="{ active: editing?.id === n.id }">
            <div class="meta">
              <span class="adm-chip" :class="n.status === 'published' ? 'adm-chip--ok' : 'adm-chip--gold'">{{ n.status }}</span>
              <span class="t">{{ n.title }}</span>
              <span class="muted">{{ n.version }} · {{ fmt(n.publishedAt ?? n.createdAt) }}</span>
            </div>
            <div class="row-actions">
              <button class="adm-btn adm-btn--ghost mini" @click="startEdit(n)">Éditer</button>
              <button class="adm-btn adm-btn--ghost mini" @click="toggle(n)">{{ n.status === 'published' ? 'Dépublier' : 'Publier' }}</button>
              <button class="adm-btn danger-btn mini" @click="del(n.id)">Suppr.</button>
            </div>
          </li>
        </ul>
        <p v-else class="muted">Aucun patch note.</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page-head { margin-bottom: 1.5rem; }
.page-head .adm-eyebrow { margin-bottom: 0.35rem; }
.cols { display: grid; grid-template-columns: 380px 1fr; gap: 1.25rem; align-items: start; }
.block { padding: 1.35rem 1.5rem; }
.section-title { font-size: 0.7rem; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: var(--adm-text-dim); margin-bottom: 1rem; }
.form { display: flex; flex-direction: column; gap: 0.7rem; }
.area { resize: vertical; font-family: inherit; }
.btns { display: flex; gap: 0.5rem; }
.list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.6rem; }
.list li { display: flex; justify-content: space-between; align-items: center; gap: 0.75rem; padding: 0.6rem 0.7rem; border: 1px solid var(--adm-border); border-radius: 8px; flex-wrap: wrap; }
.list li.active { border-color: var(--adm-gold); }
.meta { display: flex; align-items: center; gap: 0.6rem; }
.t { color: var(--adm-text); font-weight: 600; }
.muted { color: var(--adm-text-faint); font-size: 0.8rem; }
.row-actions { display: flex; gap: 0.35rem; }
.mini { padding: 0.35rem 0.55rem; font-size: 0.74rem; }
.danger-btn { background: rgba(255,107,107,0.12); border: 1px solid rgba(255,107,107,0.4); color: var(--adm-danger); }
@media (max-width: 1000px) { .cols { grid-template-columns: 1fr; } }
</style>
