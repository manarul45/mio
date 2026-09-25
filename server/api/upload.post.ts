import { serverSupabaseUser } from '#supabase/server'
import { getAdminSupabaseClient } from '~/server/utils/supabaseAdmin'
import { uploadToCloudinary } from '~/server/utils/cloudinaryService'
import { readMultipartFormData } from 'h3'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Silakan masuk terlebih dahulu untuk mengunggah file.' })
  }

  const formData = await readMultipartFormData(event)
  if (!formData || formData.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'Tidak ada file yang diunggah.' })
  }

  let fileItem: any = null
  let bucket = 'courses'
  let customFolder = ''

  for (const item of formData) {
    if (item.name === 'bucket' && item.data) {
      bucket = item.data.toString().trim()
    } else if (item.name === 'folder' && item.data) {
      customFolder = item.data.toString().trim()
    } else if (item.filename && item.data) {
      fileItem = item
    }
  }

  if (!fileItem) {
    throw createError({ statusCode: 400, statusMessage: 'Berkas file tidak ditemukan.' })
  }

  const originalName = fileItem.filename || 'upload.bin'
  const mimeType = fileItem.type || 'application/octet-stream'

  // ============================================================================
  // 1. CLOUDINARY UPLOADER (Primary for images & media)
  // ============================================================================
  try {
    const cloudinaryRes = await uploadToCloudinary(
      fileItem.data,
      mimeType,
      {
        folder: customFolder || 'courses/thumbnails',
        filename: originalName,
      },
      event
    )

    if (cloudinaryRes.success && cloudinaryRes.url) {
      return {
        success: true,
        url: cloudinaryRes.url,
        provider: 'cloudinary',
        filename: originalName,
        size: fileItem.data.length,
        mimeType,
      }
    }
  } catch (cloudErr) {
    console.warn('Cloudinary upload attempt error, falling back to Supabase:', cloudErr)
  }

  // ============================================================================
  // 2. FALLBACK: SUPABASE STORAGE
  // ============================================================================
  const allowedBuckets = ['courses', 'course-assets', 'avatars', 'certificates', 'receipts', 'materials']
  if (!allowedBuckets.includes(bucket)) {
    bucket = 'courses'
  }

  const ext = originalName.split('.').pop()?.toLowerCase() || 'bin'
  const baseName = originalName.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9-_]/g, '_')
  const timestamp = Date.now()
  const randomStr = Math.random().toString(36).substring(2, 8)
  const safeFilename = `${baseName}-${timestamp}-${randomStr}.${ext}`

  const folderPath = customFolder ? `${customFolder.replace(/^\/+|\/+$/g, '')}/` : ''
  const filePath = `${folderPath}${safeFilename}`

  const client = getAdminSupabaseClient(event)
  const isPublicBucket = ['courses', 'course-assets', 'avatars', 'certificates'].includes(bucket)

  // Auto-ensure bucket exists in Supabase Storage
  try {
    const { data: bData, error: bError } = await client.storage.getBucket(bucket)
    if (bError || !bData) {
      await client.storage.createBucket(bucket, {
        public: isPublicBucket,
      })
    }
  } catch (bErr) {
    console.warn('Auto-create bucket attempt failed or already exists:', bErr)
  }

  let { data: uploadData, error: uploadError } = await client.storage
    .from(bucket)
    .upload(filePath, fileItem.data, {
      contentType: mimeType,
      upsert: true,
    })

  // If failed with bucket not found, attempt creation and retry once
  if (uploadError && (
    uploadError.message?.toLowerCase().includes('not found') ||
    (uploadError as any).statusCode === '404' ||
    (uploadError as any).code === 'NoSuchBucket'
  )) {
    try {
      await client.storage.createBucket(bucket, { public: isPublicBucket })
      const retryResult = await client.storage
        .from(bucket)
        .upload(filePath, fileItem.data, {
          contentType: mimeType,
          upsert: true,
        })
      uploadData = retryResult.data
      uploadError = retryResult.error
    } catch {}
  }

  if (uploadError) {
    throw createError({ statusCode: 500, statusMessage: 'Gagal mengunggah file ke penyimpanan: ' + uploadError.message })
  }

  let fileUrl = ''
  if (isPublicBucket) {
    const { data: urlData } = client.storage.from(bucket).getPublicUrl(filePath)
    fileUrl = urlData.publicUrl
  } else {
    // Generate long-lived signed URL for private bucket (1 year)
    const { data: signedData } = await client.storage
      .from(bucket)
      .createSignedUrl(filePath, 60 * 60 * 24 * 365)

    fileUrl = signedData?.signedUrl || filePath
  }

  return {
    success: true,
    url: fileUrl,
    provider: 'supabase',
    path: filePath,
    bucket,
    filename: originalName,
    size: fileItem.data.length,
    mimeType,
  }
})
