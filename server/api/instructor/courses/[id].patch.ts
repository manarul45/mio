import { getAdminSupabaseClient } from '~/server/utils/supabaseAdmin'
import { getAuthenticatedUserId } from '~/server/utils/authHelper'

export default defineEventHandler(async (event) => {
  const courseId = getRouterParam(event, 'id')
  if (!courseId) {
    throw createError({ statusCode: 400, statusMessage: 'ID kursus diperlukan' })
  }

  const body = await readBody(event)
  const client = getAdminSupabaseClient(event)

  const instructorId = await getAuthenticatedUserId(event, body?.instructor_id)
  if (!instructorId) {
    throw createError({ statusCode: 401, statusMessage: 'Harap login terlebih dahulu' })
  }

  // Check existing course
  const { data: existingCourse } = await client
    .from('courses')
    .select('id, instructor_id')
    .eq('id', courseId)
    .single()

  if (!existingCourse) {
    throw createError({ statusCode: 404, statusMessage: 'Kursus tidak ditemukan' })
  }

  const { data: profile } = await client
    .from('profiles')
    .select('role')
    .eq('id', instructorId)
    .single()

  const isAdmin = profile?.role === 'ADMIN' || profile?.role === 'SUPER_ADMIN'
  if (!isAdmin && existingCourse.instructor_id !== instructorId) {
    throw createError({ statusCode: 403, statusMessage: 'Anda tidak memiliki hak akses untuk mengedit kursus ini' })
  }

  const updatePayload: Record<string, any> = {
    updated_at: new Date().toISOString()
  }

  if (body.title !== undefined) updatePayload.title = body.title
  if (body.subtitle !== undefined) updatePayload.subtitle = body.subtitle
  if (body.description !== undefined) updatePayload.description = body.description
  if (body.category_id !== undefined) updatePayload.category_id = body.category_id ? Number(body.category_id) : null
  if (body.level !== undefined) updatePayload.level = body.level
  if (body.language !== undefined) updatePayload.language = body.language
  if (body.price !== undefined) updatePayload.price = Number(body.price) || 0
  if (body.discount_price !== undefined) updatePayload.discount_price = body.discount_price ? Number(body.discount_price) : null
  if (body.thumbnail_url !== undefined) updatePayload.thumbnail_url = body.thumbnail_url || null
  if (body.preview_video_id !== undefined) updatePayload.preview_video_id = body.preview_video_id || null
  if (body.learning_objectives !== undefined) updatePayload.learning_objectives = Array.isArray(body.learning_objectives) ? body.learning_objectives.filter(Boolean) : []
  if (body.requirements !== undefined) updatePayload.requirements = Array.isArray(body.requirements) ? body.requirements.filter(Boolean) : []
  if (body.target_audience !== undefined) updatePayload.target_audience = Array.isArray(body.target_audience) ? body.target_audience.filter(Boolean) : []
  if (body.whatsapp_group_url !== undefined) updatePayload.whatsapp_group_url = body.whatsapp_group_url || null
  if (body.whatsapp_contact_url !== undefined) updatePayload.whatsapp_contact_url = body.whatsapp_contact_url || null
  if (body.telegram_url !== undefined) updatePayload.telegram_url = body.telegram_url || null
  if (body.status !== undefined) updatePayload.status = body.status

  const { data, error } = await client
    .from('courses')
    .update(updatePayload)
    .eq('id', courseId)
    .select()
    .single()

  if (error) {
    console.error('Failed to update course:', error)
    throw createError({ statusCode: 500, statusMessage: error.message || 'Gagal memperbarui kursus' })
  }

  return { success: true, data }
})
