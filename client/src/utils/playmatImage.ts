import { PLAYMAT_DIMENSIONS, type PlaymatVariant, type ZoneStyle } from '@riftbound/shared'

function loadImage(blob: Blob | File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob)
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
  const targetRatio = target.w / target.h
  let outW = Math.min(target.w, img.width)
  let outH = Math.round(outW / targetRatio)
  if (outH > img.height) { outH = img.height; outW = Math.round(outH * targetRatio) }

  const canvas = document.createElement('canvas')
  canvas.width = outW
  canvas.height = outH
  const ctx = canvas.getContext('2d')!
  ctx.imageSmoothingQuality = 'high'

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
 * lisible (verre dépoli).
 */
export async function autoContrastZoneStyle(blob: Blob): Promise<ZoneStyle> {
  const img = await loadImage(blob)
  const s = 32
  const canvas = document.createElement('canvas')
  canvas.width = s; canvas.height = s
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, 0, 0, s, s)
  const { data } = ctx.getImageData(0, 0, s, s)
  let sum = 0
  for (let i = 0; i < data.length; i += 4) {
    sum += 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]
  }
  const avg = sum / (data.length / 4) / 255

  if (avg < 0.5) {
    return { background: 'rgba(8, 16, 28, 0.30)', border: '#C8AA6E', label: '#F2E5CD' }
  }
  return { background: 'rgba(255, 255, 255, 0.18)', border: '#3a2c10', label: '#1a1208' }
}
