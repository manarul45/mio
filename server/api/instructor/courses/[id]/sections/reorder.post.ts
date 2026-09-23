import { serverSupabaseUser } from '#supabase/server'
import { getAdminSupabaseClient } from '~/server/utils/supabaseAdmin'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Harap login terlebih dahulu' })
  }

  const courseId = getRouterParam(event, 'id')
  if (!courseId) {
    throw createError({ statusCode: 400, statusMessage: 'ID kursus diperlukan' })
  }

  const body = await readBody(event)
  const sectionIds: number[] = body?.section_ids || []

  if (!Array.isArray(sectionIds) || sectionIds.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'Data section_ids tidak valid' })
  }

  const client = getAdminSupabaseClient(event)

  // Update sort_order for each section
  const updatePromises = sectionIds.map((id, index) => {
    return client
      .from('course_sections')
      .update({ sort_order: index + 1, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('course_id', courseId)
  })

  await Promise.all(updatePromises)

  return { success: true, message: 'Urutan modul berhasil diperbarui' }
})
