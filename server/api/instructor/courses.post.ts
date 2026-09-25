import { serverSupabaseUser } from '#supabase/server'
import { getAdminSupabaseClient } from '~/server/utils/supabaseAdmin'

export default defineEventHandler(async (event) => {
  let user = null
  try {
    user = await serverSupabaseUser(event)
  } catch (e) {
    // ignore parsing failure
  }

  const body = await readBody(event)
  const client = getAdminSupabaseClient(event)

  const instructorId = user?.id || body?.instructor_id
  if (!instructorId) {
    throw createError({ statusCode: 401, statusMessage: 'Harap login terlebih dahulu' })
  }

  if (!body.title || !body.title.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'Judul kursus wajib diisi' })
  }

  // Ensure category_id exists, fallback to first category if missing
  let categoryId = body.category_id ? Number(body.category_id) : null
  if (!categoryId) {
    const { data: cat } = await client.from('categories').select('id').order('id').limit(1).maybeSingle()
    categoryId = cat?.id || null
  }

  const baseSlug = (body.slug || body.title)
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')

  const uniqueSlug = `${baseSlug}-${Date.now().toString(36)}`

  const payload = {
    title: body.title.trim(),
    slug: uniqueSlug,
    subtitle: body.subtitle || null,
    description: body.description || null,
    category_id: categoryId,
    instructor_id: instructorId,
    level: body.level || 'all_levels',
    language: body.language || 'id',
    price: Number(body.price) || 0,
    discount_price: body.discount_price ? Number(body.discount_price) : null,
    thumbnail_url: body.thumbnail_url || 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&q=80',
    preview_video_id: body.preview_video_id || null,
    learning_objectives: Array.isArray(body.learning_objectives) ? body.learning_objectives.filter(Boolean) : [],
    requirements: Array.isArray(body.requirements) ? body.requirements.filter(Boolean) : [],
    target_audience: Array.isArray(body.target_audience) ? body.target_audience.filter(Boolean) : [],
    whatsapp_group_url: body.whatsapp_group_url || null,
    whatsapp_contact_url: body.whatsapp_contact_url || null,
    telegram_url: body.telegram_url || null,
    status: 'draft',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }

  const { data, error } = await client
    .from('courses')
    .insert(payload)
    .select()
    .single()

  if (error) {
    console.error('Failed to create course:', error)
    throw createError({ statusCode: 500, statusMessage: error.message || 'Gagal membuat kursus' })
  }

  return { success: true, data }
})
