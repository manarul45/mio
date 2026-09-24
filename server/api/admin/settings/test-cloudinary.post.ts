import { serverSupabaseUser } from '#supabase/server'
import crypto from 'crypto'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const body = await readBody(event)
  const {
    cloudinary_cloud_name: cloudName,
    cloudinary_api_key: apiKey,
    cloudinary_api_secret: apiSecret,
    cloudinary_upload_preset: uploadPreset,
  } = body || {}

  if (!cloudName || !apiKey || !apiSecret) {
    return {
      success: false,
      message: 'Lengkapi Cloud Name, API Key, dan API Secret Cloudinary terlebih dahulu.',
    }
  }

  const testContent = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
  const timestamp = Math.floor(Date.now() / 1000)
  const folder = 'test-connection'
  const publicId = `ping-${Date.now()}`

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
    const serializedParams = sortedKeys.map(k => `${k}=${paramsToSign[k]}`).join('&')
    const signature = crypto.createHash('sha1').update(`${serializedParams}${apiSecret}`).digest('hex')

    const formData = new FormData()
    formData.append('file', testContent)
    formData.append('api_key', apiKey)
    formData.append('timestamp', String(timestamp))
    formData.append('folder', folder)
    formData.append('public_id', publicId)
    formData.append('signature', signature)
    if (uploadPreset) {
      formData.append('upload_preset', uploadPreset)
    }

    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: 'POST',
      body: formData,
    })

    const data: any = await res.json()

    if (res.ok && data.secure_url) {
      return {
        success: true,
        message: 'Koneksi ke Cloudinary Media CDN Berhasil! Gambar uji coba berhasil diunggah.',
        test_file_url: data.secure_url,
      }
    } else {
      return {
        success: false,
        message: `Cloudinary API Error: ${data.error?.message || 'Periksa kredensial Cloud Name, API Key, dan API Secret Anda.'}`,
      }
    }
  } catch (err: any) {
    return {
      success: false,
      message: 'Error koneksi Cloudinary: ' + (err.message || 'Terjadi kesalahan sistem'),
    }
  }
})
