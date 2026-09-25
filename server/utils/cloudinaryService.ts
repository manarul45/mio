import crypto from 'crypto'
import type { H3Event } from 'h3'
import { getAdminSupabaseClient } from '~/server/utils/supabaseAdmin'

export interface CloudinaryUploadOptions {
  folder?: string
  filename?: string
  resourceType?: 'image' | 'video' | 'raw' | 'auto'
}

/**
 * Uploads a buffer directly to Cloudinary using signed REST API.
 */
export async function uploadToCloudinary(
  fileBuffer: Buffer | Uint8Array,
  mimeType: string,
  options: CloudinaryUploadOptions = {},
  event?: H3Event
): Promise<{ success: boolean; url: string | null; error?: string }> {
  // 1. Fetch settings from Supabase (or fallback to process.env)
  let cloudName = process.env.CLOUDINARY_CLOUD_NAME || ''
  let apiKey = process.env.CLOUDINARY_API_KEY || ''
  let apiSecret = process.env.CLOUDINARY_API_SECRET || ''
  let uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET || ''
  let isEnabled = true

  try {
    const client = getAdminSupabaseClient(event)
    const { data: settings } = await client
      .from('settings')
      .select('key, value')
      .in('key', [
        'cloudinary_enabled',
        'cloudinary_cloud_name',
        'cloudinary_api_key',
        'cloudinary_api_secret',
        'cloudinary_upload_preset',
      ])

    if (settings && settings.length > 0) {
      settings.forEach((s: any) => {
        if (s.key === 'cloudinary_enabled') isEnabled = s.value === 'true' || s.value === '1'
        if (s.key === 'cloudinary_cloud_name' && s.value) cloudName = s.value.trim()
        if (s.key === 'cloudinary_api_key' && s.value) apiKey = s.value.trim()
        if (s.key === 'cloudinary_api_secret' && s.value) apiSecret = s.value.trim()
        if (s.key === 'cloudinary_upload_preset' && s.value) uploadPreset = s.value.trim()
      })
    }
  } catch (err) {
    console.warn('Could not read settings from DB, using env fallback:', err)
  }

  if (!cloudName || !apiKey || !apiSecret) {
    return {
      success: false,
      url: null,
      error: 'Kredensial Cloudinary (Cloud Name, API Key, API Secret) belum dikonfigurasi.',
    }
  }

  const folder = options.folder ? options.folder.replace(/^\/+|\/+$/g, '') : 'uploads'
  const timestamp = Math.floor(Date.now() / 1000)
  const baseName = options.filename
    ? options.filename.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9-_]/g, '_')
    : `file-${Date.now()}`
  const publicId = `${baseName}-${Math.random().toString(36).substring(2, 7)}`

  let resourceType = options.resourceType || 'auto'
  if (mimeType.startsWith('image/')) {
    resourceType = 'image'
  } else if (mimeType.startsWith('video/') || mimeType.startsWith('audio/')) {
    resourceType = 'video'
  }

  try {
    const paramsToSign: Record<string, any> = {
      folder,
      public_id: publicId,
      timestamp,
    }

    if (uploadPreset) {
      paramsToSign.upload_preset = uploadPreset
    }

    const sortedKeys = Object.keys(paramsToSign).sort()
    const serialized = sortedKeys.map(k => `${k}=${paramsToSign[k]}`).join('&')
    const signature = crypto.createHash('sha1').update(`${serialized}${apiSecret}`).digest('hex')

    const fileBase64 = `data:${mimeType};base64,${Buffer.from(fileBuffer).toString('base64')}`

    const formData = new FormData()
    formData.append('file', fileBase64)
    formData.append('api_key', apiKey)
    formData.append('timestamp', String(timestamp))
    formData.append('folder', folder)
    formData.append('public_id', publicId)
    formData.append('signature', signature)
    if (uploadPreset) {
      formData.append('upload_preset', uploadPreset)
    }

    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`, {
      method: 'POST',
      body: formData,
    })

    const data: any = await res.json()

    if (res.ok && (data.secure_url || data.url)) {
      return {
        success: true,
        url: data.secure_url || data.url,
      }
    } else {
      return {
        success: false,
        url: null,
        error: data.error?.message || `HTTP ${res.status}`,
      }
    }
  } catch (err: any) {
    return {
      success: false,
      url: null,
      error: err.message || 'Gagal menghubungi server Cloudinary',
    }
  }
}
