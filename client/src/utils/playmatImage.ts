import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import { storage } from '@/firebase'
import { PLAYMAT_DIMENSIONS, type PlaymatVariant, type ZoneStyle } from '@riftbound/shared'

/**
 * Charge un File image en HTMLImageElement.
 */
function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => { URL.revokeObjectURL(url); resolve(img) }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image illisible')) }
    img.src = url
  })
}

/**
 * Redimensionne + recadre (cover, centré) vers le ratio/résolution cible de la
 * variante, puis encode en webp. Retourne le blob + l'aperçu data-URL.
 */
export async function processPlaymatImage(
  file: File,
  variant: PlaymatVariant,
  quality = 0.82,
): Promise<{ blob: Blob; previewUrl: string; width: number; height: number }> {
  const img = await loadImage(file)
  const target = PLAYMAT_DIMENSIONS[variant]
  // On ne dépasse pas la résolution source (pas d'upscale inutile), tout en
  // respectant le ratio cible.
  const targetRatio = target.w / target.h
  let outW = Math.min(target.w, img.width)
  let outH = Math.round(outW / targetRatio)
  if (outH > img.height) { outH = img.height; outW = Math.round(outH * targetRatio) }

  const canvas = document.createElement('canvas')
  canvas.width = outW
  canvas.height = outH
  const ctx = canvas.getContext('2d')!
  ctx.imageSmoothingQuality = 'high'

  // cover : on couvre toute la cible et on centre le crop.
  const srcRatio = img.width / img.height
  let sx = 0, sy = 0, sw = img.width, sh = img.height
  if (srcRatio > targetRatio) {
    sw = img.height * targetRatio
    sx = (img.width - sw) / 2
  } else {
    sh = img.width / targetRatio
    sy = (img.height - sh) / 2
  }
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, outW, outH)

  const blob: Blob = await new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Encodage échoué'))), 'image/webp', quality),
  )
  return { blob, previewUrl: canvas.toDataURL('image/webp', 0.6), width: outW, height: outH }
}

/**
 * Échantillonne la luminance moyenne de l'image et en dérive un ZoneStyle
 * lisible (verre dépoli) : labels/bordures clairs sur fond sombre, l'inverse sinon.
 */
export async function autoContrastZoneStyle(blob: Blob): Promise<ZoneStyle> {
  const img = await loadImage(new File([blob], 'tmp.webp', { type: blob.type }))
  const s = 32
  const canvas = document.createElement('canvas')
  canvas.width = s; canvas.height = s
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, 0, 0, s, s)
  const { data } = ctx.getImageData(0, 0, s, s)
  let sum = 0
  for (let i = 0; i < data.length; i += 4) {
    // luminance perçue (Rec. 709)
    sum += 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]
  }
  const avg = sum / (data.length / 4) / 255 // 0..1

  if (avg < 0.5) {
    // Fond sombre → contenu clair, accent doré (cohérent avec le thème de base).
    return {
      background: 'rgba(8, 16, 28, 0.30)',
      border: '#C8AA6E',
      label: '#F2E5CD',
    }
  }
  // Fond clair → contenu sombre pour rester lisible.
  return {
    background: 'rgba(255, 255, 255, 0.18)',
    border: '#3a2c10',
    label: '#1a1208',
  }
}

/** Upload d'une image de playmat joueur. Path : playmats/players/{uid}/{variant}/{id}.webp */
export async function uploadPlayerPlaymat(
  uid: string, variant: PlaymatVariant, blob: Blob,
): Promise<{ imageUrl: string; storagePath: string }> {
  const id = crypto.randomUUID()
  const path = `playmats/players/${uid}/${variant}/${id}.webp`
  const r = storageRef(storage, path)
  await uploadBytes(r, blob, { contentType: 'image/webp' })
  const imageUrl = await getDownloadURL(r)
  return { imageUrl, storagePath: path }
}

/** Upload d'une image officielle (back-office). Path : playmats/official/{variant}/{id}.webp */
export async function uploadOfficialPlaymat(
  variant: PlaymatVariant, blob: Blob,
): Promise<{ imageUrl: string; storagePath: string }> {
  const id = crypto.randomUUID()
  const path = `playmats/official/${variant}/${id}.webp`
  const r = storageRef(storage, path)
  await uploadBytes(r, blob, { contentType: 'image/webp' })
  const imageUrl = await getDownloadURL(r)
  return { imageUrl, storagePath: path }
}

/** Supprime l'objet Storage (best-effort : on ignore les erreurs d'objet absent). */
export async function deleteStorageObject(path: string): Promise<void> {
  try { await deleteObject(storageRef(storage, path)) } catch { /* déjà absent */ }
}
