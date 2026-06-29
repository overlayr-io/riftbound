<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { PlaymatVariant } from '@riftbound/shared'
import { PLAYMAT_DIMENSIONS, MAX_PLAYER_PLAYMATS_PER_VARIANT } from '@riftbound/shared'
import { usePlaymatStore } from '@/stores/playmat'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/stores/toast'
import {
  processPlaymatImage, autoContrastZoneStyle, uploadPlayerPlaymat, deleteStorageObject,
} from '@/utils/playmatImage'
import { playmatApi } from '@/services/playmatApi'

const store = usePlaymatStore()
const auth = useAuthStore()
const toast = useToast()

const uploading = ref<PlaymatVariant | null>(null)

onMounted(() => store.load())

const settings = computed(() => store.settings)

const myFull = computed(() => store.mine.filter((m) => m.variant === 'full'))
const myHalf = computed(() => [])

function isActive(kind: 'unicolor' | 'official' | 'player', id: string): boolean {
  return !store.settings.random && store.settings.kind === kind && store.settings.id === id
}

async function select(kind: 'unicolor' | 'official' | 'player', id: string) {
  await store.saveSettings({ kind, id, random: false })
}

async function toggle(key: 'halfMode' | 'random' | 'includeOfficialInRandom') {
  await store.saveSettings({ [key]: !store.settings[key] } as never)
}

async function onPick(e: Event, variant: PlaymatVariant) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file || !auth.user) return
  const existing = variant === 'full' ? myFull.value.length : myHalf.value.length
  if (existing >= MAX_PLAYER_PLAYMATS_PER_VARIANT) {
    toast.error(`Limite de ${MAX_PLAYER_PLAYMATS_PER_VARIANT} images atteinte`)
    return
  }
  uploading.value = variant
  try {
    const { blob } = await processPlaymatImage(file, variant)
    const zoneStyle = await autoContrastZoneStyle(blob)
    const { imageUrl, storagePath } = await uploadPlayerPlaymat(auth.user.uid, variant, blob)
    await playmatApi.addMine({ variant, imageUrl, storagePath, zoneStyle })
    await store.refreshMine()
    toast.success('Image ajoutée')
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Échec de l’upload')
  } finally {
    uploading.value = null
  }
}

async function removeMine(id: string, storagePath: string) {
  try {
    await playmatApi.deleteMine(id)
    await deleteStorageObject(storagePath)
    await store.refreshMine()
  } catch {
    toast.error('Suppression impossible')
  }
}
</script>

<template>
  <div class="pm">
    <!-- Toggles -->
    <div class="pm-toggles">
      <button class="pm-toggle" :class="{ 'pm-toggle--on': settings.random }" @click="toggle('random')">
        <span class="pm-toggle__dot" /> Aléatoire à chaque partie
      </button>
      <button
        class="pm-toggle"
        :class="{ 'pm-toggle--on': settings.includeOfficialInRandom }"
        :disabled="!settings.random"
        @click="toggle('includeOfficialInRandom')"
      >
        <span class="pm-toggle__dot" /> Inclure les fonds officiels
      </button>
    </div>

    <!-- Thèmes unis -->
    <div class="pm-group-label">THÈMES UNIS</div>
    <div class="pm-grid">
      <button
        v-for="u in store.unicolors"
        :key="u.id"
        class="pm-tile"
        :class="{ 'pm-tile--active': isActive('unicolor', u.id) }"
        :style="{ background: u.backgroundCss }"
        :title="u.name"
        @click="select('unicolor', u.id)"
      >
        <span class="pm-tile__name">{{ u.name }}</span>
      </button>
      <p v-if="!store.unicolors.length" class="pm-empty">Aucun thème pour l’instant.</p>
    </div>

    <!-- Fonds officiels -->
    <div class="pm-group-label">FONDS OFFICIELS</div>
    <div class="pm-grid">
      <button
        v-for="o in store.official"
        :key="o.id"
        class="pm-tile"
        :class="{ 'pm-tile--active': isActive('official', o.id) }"
        :style="{ backgroundImage: `url(${o.imageUrl})` }"
        :title="`${o.name} (${o.variant})`"
        @click="select('official', o.id)"
      >
        <span class="pm-tile__badge">{{ o.variant }}</span>
        <span class="pm-tile__name">{{ o.name }}</span>
      </button>
      <p v-if="!store.official.length" class="pm-empty">Aucun fond officiel pour l’instant.</p>
    </div>

    <!-- Mes images -->
    <div class="pm-group-label">
      MES IMAGES
      <span class="pm-hint">{{ PLAYMAT_DIMENSIONS.full.label }}</span>
    </div>

    <div class="pm-variant">
      <div class="pm-variant__head">
        <span>Fond entier ({{ myFull.length }}/{{ MAX_PLAYER_PLAYMATS_PER_VARIANT }})</span>
        <label class="pm-upload" :class="{ 'pm-upload--busy': uploading === 'full' }">
          <input type="file" accept="image/*" :disabled="!!uploading || myFull.length >= MAX_PLAYER_PLAYMATS_PER_VARIANT" @change="onPick($event, 'full')" />
          {{ uploading === 'full' ? '…' : '+ Ajouter' }}
        </label>
      </div>
      <div class="pm-grid">
        <div
          v-for="m in myFull"
          :key="m.id"
          class="pm-tile pm-tile--own"
          :class="{ 'pm-tile--active': isActive('player', m.id) }"
          :style="{ backgroundImage: `url(${m.imageUrl})` }"
          @click="select('player', m.id)"
        >
          <button class="pm-del" title="Supprimer" @click.stop="removeMine(m.id, m.storagePath)">×</button>
        </div>
      </div>
    </div>

<!--    <div class="pm-variant">
      <div class="pm-variant__head">
        <span>Demi-terrain ({{ myHalf.length }}/{{ MAX_PLAYER_PLAYMATS_PER_VARIANT }})</span>
        <label class="pm-upload" :class="{ 'pm-upload&#45;&#45;busy': uploading === 'half' }">
          <input type="file" accept="image/*" :disabled="!!uploading || myHalf.length >= MAX_PLAYER_PLAYMATS_PER_VARIANT" @change="onPick($event, 'half')" />
          {{ uploading === 'half' ? '…' : '+ Ajouter' }}
        </label>
      </div>
      <div class="pm-grid">
        <div
          v-for="m in myHalf"
          :key="m.id"
          class="pm-tile pm-tile&#45;&#45;own pm-tile&#45;&#45;half"
          :class="{ 'pm-tile&#45;&#45;active': isActive('player', m.id) }"
          :style="{ backgroundImage: `url(${m.imageUrl})` }"
          @click="select('player', m.id)"
        >
          <button class="pm-del" title="Supprimer" @click.stop="removeMine(m.id, m.storagePath)">×</button>
        </div>
      </div>
    </div>-->
  </div>
</template>

<style scoped>
.pm { display: flex; flex-direction: column; gap: 0.75rem; }

.pm-toggles { display: flex; flex-wrap: wrap; gap: 0.4rem; }
.pm-toggle {
  display: inline-flex; align-items: center; gap: 0.4rem;
  font-size: 0.62rem; font-weight: 700; letter-spacing: 0.06em;
  color: #6a8a90; background: rgba(6,15,27,0.6);
  border: 1px solid rgba(200,170,110,0.15); border-radius: 6px;
  padding: 0.4rem 0.6rem; cursor: pointer; transition: all 0.15s;
}
.pm-toggle em { color: #2a4a50; font-style: normal; }
.pm-toggle:disabled { opacity: 0.4; cursor: default; }
.pm-toggle__dot {
  width: 8px; height: 8px; border-radius: 50%;
  background: #2a3445; transition: background 0.15s, box-shadow 0.15s;
}
.pm-toggle--on { color: #F2E5CD; border-color: rgba(200,170,110,0.5); }
.pm-toggle--on .pm-toggle__dot { background: #C8AA6E; box-shadow: 0 0 8px rgba(200,170,110,0.6); }

.pm-group-label {
  font-size: 0.55rem; font-weight: 700; letter-spacing: 0.3em; color: #00CCB9;
  padding-bottom: 0.25rem; border-bottom: 1px solid rgba(0,204,185,0.15);
  display: flex; justify-content: space-between; align-items: baseline; gap: 0.5rem;
}
.pm-hint { font-size: 0.5rem; letter-spacing: 0.03em; color: #2a4a50; font-weight: 600; text-align: right; }

.pm-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(96px, 1fr)); gap: 0.5rem; }
.pm-tile {
  position: relative; aspect-ratio: 16 / 9; border-radius: 6px; overflow: hidden;
  border: 1px solid rgba(200,170,110,0.18); cursor: pointer;
  background-size: cover; background-position: center;
  display: flex; align-items: flex-end; padding: 4px;
  transition: border-color 0.15s, box-shadow 0.15s, transform 0.1s;
}
.pm-tile:hover { transform: translateY(-1px); border-color: rgba(200,170,110,0.5); }
.pm-tile--half { aspect-ratio: 32 / 9; }
.pm-tile--active {
  border-color: #C8AA6E;
  box-shadow: 0 0 0 1px #C8AA6E, 0 0 14px rgba(200,170,110,0.45);
}
.pm-tile__name {
  font-size: 0.5rem; font-weight: 700; letter-spacing: 0.04em; color: #F2E5CD;
  text-shadow: 0 1px 3px rgba(0,0,0,0.9); line-height: 1.1;
}
.pm-tile__badge {
  position: absolute; top: 4px; right: 4px;
  font-size: 0.45rem; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase;
  color: #0a1208; background: rgba(200,170,110,0.85); border-radius: 3px; padding: 1px 4px;
}
.pm-empty { font-size: 0.7rem; color: #2a4a50; grid-column: 1 / -1; }

.pm-variant { display: flex; flex-direction: column; gap: 0.4rem; }
.pm-variant__head {
  display: flex; align-items: center; justify-content: space-between;
  font-size: 0.62rem; color: #8aabb0; font-weight: 600;
}
.pm-upload {
  position: relative; overflow: hidden; cursor: pointer;
  font-size: 0.58rem; font-weight: 700; letter-spacing: 0.06em; color: #C8AA6E;
  border: 1px solid rgba(200,170,110,0.4); border-radius: 5px; padding: 0.25rem 0.6rem;
  transition: background 0.15s;
}
.pm-upload:hover { background: rgba(200,170,110,0.12); }
.pm-upload--busy { opacity: 0.6; }
.pm-upload input { position: absolute; inset: 0; opacity: 0; cursor: pointer; }
.pm-upload input:disabled { cursor: default; }

.pm-del {
  position: absolute; top: 3px; right: 3px;
  width: 18px; height: 18px; border-radius: 50%;
  background: rgba(6,15,27,0.85); border: 1px solid rgba(255,90,90,0.5);
  color: #ff6b6b; font-size: 0.8rem; line-height: 1; cursor: pointer;
  display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.15s;
}
.pm-tile--own:hover .pm-del { opacity: 1; }
</style>
