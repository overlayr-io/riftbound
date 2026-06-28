<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import type { OfficialPlaymatDto, UnicolorThemeDto, PlaymatVariant, ZoneStyle } from '@riftbound/shared'
import { DEFAULT_ZONE_STYLE, PLAYMAT_DIMENSIONS } from '@riftbound/shared'
import { adminPlaymatApi } from '@/services/adminPlaymatApi'
import { processPlaymatImage, uploadOfficialPlaymat, deleteStorageObject } from '@/utils/playmatImage'

const official = ref<OfficialPlaymatDto[]>([])
const unicolors = ref<UnicolorThemeDto[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const busy = ref(false)

const offForm = reactive({
  name: '', variant: 'full' as PlaymatVariant,
  zoneStyle: { ...DEFAULT_ZONE_STYLE } as ZoneStyle,
})
const uniForm = reactive({
  name: '', backgroundCss: 'radial-gradient(ellipse 140% 90% at 50% 25%, #091629 0%, #030810 65%)',
  zoneStyle: { ...DEFAULT_ZONE_STYLE } as ZoneStyle,
})

async function load() {
  loading.value = true; error.value = null
  try {
    [official.value, unicolors.value] = await Promise.all([
      adminPlaymatApi.listOfficial(), adminPlaymatApi.listUnicolors(),
    ])
  } catch { error.value = 'Erreur de chargement' }
  finally { loading.value = false }
}

async function uploadOfficial(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]; input.value = ''
  if (!file || !offForm.name.trim()) { error.value = 'Renseigne un nom avant d’uploader'; return }
  busy.value = true; error.value = null
  try {
    const { blob } = await processPlaymatImage(file, offForm.variant)
    const { imageUrl, storagePath } = await uploadOfficialPlaymat(offForm.variant, blob)
    await adminPlaymatApi.createOfficial({
      name: offForm.name.trim(), variant: offForm.variant, imageUrl, storagePath,
      zoneStyle: { ...offForm.zoneStyle },
    })
    offForm.name = ''
    await load()
  } catch (err) { error.value = err instanceof Error ? err.message : 'Échec de l’upload' }
  finally { busy.value = false }
}

async function setOfficialDefault(id: string) { await adminPlaymatApi.setOfficialDefault(id); await load() }
async function delOfficial(o: OfficialPlaymatDto) {
  await adminPlaymatApi.deleteOfficial(o.id); await deleteStorageObject(o.storagePath); await load()
}

async function createUnicolor() {
  if (!uniForm.name.trim() || !uniForm.backgroundCss.trim()) return
  busy.value = true
  try {
    await adminPlaymatApi.createUnicolor({
      name: uniForm.name.trim(), backgroundCss: uniForm.backgroundCss.trim(), zoneStyle: { ...uniForm.zoneStyle },
    })
    uniForm.name = ''
    await load()
  } finally { busy.value = false }
}
async function setUnicolorDefault(id: string) { await adminPlaymatApi.setUnicolorDefault(id); await load() }
async function delUnicolor(id: string) { await adminPlaymatApi.deleteUnicolor(id); await load() }

onMounted(load)
</script>

<template>
  <div>
    <header class="page-head">
      <p class="adm-eyebrow">Domaine D · contenu</p>
      <h1 class="adm-title">Plateaux (playmats)</h1>
    </header>

    <p v-if="error" class="adm-state adm-state--error">{{ error }}</p>

    <!-- ── Upload officiel ── -->
    <div class="adm-card block">
      <div class="section-title">Ajouter un fond officiel</div>
      <p class="hint">
        Recadré + compressé en webp automatiquement. {{ PLAYMAT_DIMENSIONS.full.label }} — {{ PLAYMAT_DIMENSIONS.half.label }}.
      </p>
      <div class="form">
        <input v-model="offForm.name" class="adm-input" placeholder="Nom du fond" />
        <select v-model="offForm.variant" class="adm-input">
          <option value="full">Fond entier (16:9)</option>
          <option value="half">Demi-terrain (32:9)</option>
        </select>
      </div>
      <div class="zone-style">
        <span class="zs-label">Style des zones :</span>
        <label class="zs-field">Fond <input v-model="offForm.zoneStyle.background" class="adm-input zs-text" placeholder="rgba(...)" /></label>
        <label class="zs-field">Bordure <input v-model="offForm.zoneStyle.border" type="color" class="zs-color" /></label>
        <label class="zs-field">Labels <input v-model="offForm.zoneStyle.label" type="color" class="zs-color" /></label>
      </div>
      <label class="adm-btn adm-btn--primary file-btn" :class="{ 'is-busy': busy }">
        <input type="file" accept="image/*" :disabled="busy" @change="uploadOfficial" />
        {{ busy ? 'Upload…' : 'Choisir une image et uploader' }}
      </label>
    </div>

    <!-- ── Liste officiels ── -->
    <div class="adm-card block">
      <div class="section-title">Fonds officiels ({{ official.length }})</div>
      <div v-if="loading" class="adm-state"><div class="adm-spinner" /> Chargement…</div>
      <div v-else-if="!official.length" class="adm-state"><span class="empty">◆</span> Aucun fond.</div>
      <div v-else class="pm-cards">
        <div v-for="o in official" :key="o.id" class="pm-card" :class="{ 'pm-card--half': o.variant === 'half' }">
          <div class="pm-thumb" :style="{ backgroundImage: `url(${o.imageUrl})` }">
            <span v-if="o.isDefault" class="pm-default-badge">PAR DÉFAUT</span>
            <span class="pm-variant-badge">{{ o.variant }}</span>
          </div>
          <div class="pm-card__row">
            <span class="pm-card__name">{{ o.name }}</span>
            <div class="pm-card__actions">
              <button v-if="!o.isDefault" class="adm-btn adm-btn--ghost sm" @click="setOfficialDefault(o.id)">Par défaut</button>
              <button class="adm-btn adm-btn--danger sm" @click="delOfficial(o)">Suppr.</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ── Thèmes unis ── -->
    <div class="adm-card block">
      <div class="section-title">Créer un thème uni</div>
      <p class="hint">Couleur/dégradé du plateau + style des zones. Pas d’image.</p>
      <div class="form">
        <input v-model="uniForm.name" class="adm-input" placeholder="Nom du thème" />
        <input v-model="uniForm.backgroundCss" class="adm-input grow" placeholder="CSS background (couleur ou gradient)" />
      </div>
      <div class="zone-style">
        <span class="zs-label">Style des zones :</span>
        <label class="zs-field">Fond <input v-model="uniForm.zoneStyle.background" class="adm-input zs-text" placeholder="rgba(...)" /></label>
        <label class="zs-field">Bordure <input v-model="uniForm.zoneStyle.border" type="color" class="zs-color" /></label>
        <label class="zs-field">Labels <input v-model="uniForm.zoneStyle.label" type="color" class="zs-color" /></label>
      </div>
      <div class="uni-preview" :style="{ background: uniForm.backgroundCss }">Aperçu</div>
      <button class="adm-btn adm-btn--primary" :disabled="busy || !uniForm.name || !uniForm.backgroundCss" @click="createUnicolor">Créer le thème</button>
    </div>

    <div class="adm-card block">
      <div class="section-title">Thèmes unis ({{ unicolors.length }})</div>
      <div v-if="!unicolors.length" class="adm-state"><span class="empty">◆</span> Aucun thème.</div>
      <div v-else class="pm-cards">
        <div v-for="u in unicolors" :key="u.id" class="pm-card">
          <div class="pm-thumb" :style="{ background: u.backgroundCss }">
            <span v-if="u.isDefault" class="pm-default-badge">PAR DÉFAUT</span>
          </div>
          <div class="pm-card__row">
            <span class="pm-card__name">{{ u.name }}</span>
            <div class="pm-card__actions">
              <button v-if="!u.isDefault" class="adm-btn adm-btn--ghost sm" @click="setUnicolorDefault(u.id)">Par défaut</button>
              <button class="adm-btn adm-btn--danger sm" @click="delUnicolor(u.id)">Suppr.</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.block { margin-bottom: 1rem; }
.form { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 0.6rem; }
.grow { flex: 1; min-width: 240px; }
.hint { font-size: 0.78rem; color: #6a8a90; margin-bottom: 0.6rem; }

.zone-style { display: flex; flex-wrap: wrap; align-items: center; gap: 0.6rem; margin-bottom: 0.7rem; }
.zs-label { font-size: 0.72rem; color: #8aabb0; font-weight: 600; }
.zs-field { display: inline-flex; align-items: center; gap: 0.35rem; font-size: 0.72rem; color: #6a8a90; }
.zs-text { width: 150px; }
.zs-color { width: 32px; height: 26px; padding: 0; border: 1px solid #2a3445; background: none; cursor: pointer; }

.file-btn { position: relative; overflow: hidden; display: inline-flex; }
.file-btn input { position: absolute; inset: 0; opacity: 0; cursor: pointer; }
.file-btn.is-busy { opacity: 0.6; }

.pm-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 0.75rem; }
.pm-card { border: 1px solid rgba(200,170,110,0.15); border-radius: 8px; overflow: hidden; background: rgba(6,15,27,0.5); }
.pm-thumb {
  position: relative; aspect-ratio: 16 / 9; background-size: cover; background-position: center;
}
.pm-card--half .pm-thumb { aspect-ratio: 32 / 9; }
.pm-default-badge {
  position: absolute; top: 6px; left: 6px;
  font-size: 0.5rem; font-weight: 800; letter-spacing: 0.1em; color: #0a1208;
  background: #C8AA6E; border-radius: 3px; padding: 2px 5px;
}
.pm-variant-badge {
  position: absolute; top: 6px; right: 6px;
  font-size: 0.5rem; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: #F2E5CD;
  background: rgba(6,15,27,0.8); border: 1px solid rgba(200,170,110,0.3); border-radius: 3px; padding: 2px 5px;
}
.pm-card__row { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; padding: 0.5rem 0.6rem; }
.pm-card__name { font-size: 0.8rem; color: #F2E5CD; font-weight: 600; }
.pm-card__actions { display: flex; gap: 0.35rem; }
.adm-btn.sm { padding: 0.2rem 0.5rem; font-size: 0.62rem; }

.uni-preview {
  height: 60px; border-radius: 8px; margin-bottom: 0.7rem;
  display: flex; align-items: center; justify-content: center;
  font-size: 0.7rem; letter-spacing: 0.2em; color: rgba(242,229,205,0.7);
  border: 1px solid rgba(200,170,110,0.15);
}
</style>
