import { supabase, STORAGE_BUCKET } from '../config/supabase'
import type { PlaymatVariant } from '@riftbound/shared'

export async function uploadPlaymatFile(
  path: string,
  buffer: Buffer,
  mimeType: string,
): Promise<string> {
  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, buffer, { contentType: mimeType, upsert: false })

  if (error) throw new Error(`Storage upload failed: ${error.message}`)

  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path)
  return data.publicUrl
}

export async function deletePlaymatFile(storagePath: string): Promise<void> {
  await supabase.storage.from(STORAGE_BUCKET).remove([storagePath])
}

export function buildPlayerPath(uid: string, variant: PlaymatVariant, id: string): string {
  return `players/${uid}/${variant}/${id}.webp`
}

export function buildOfficialPath(variant: PlaymatVariant, id: string): string {
  return `official/${variant}/${id}.webp`
}
