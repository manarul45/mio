import { assertCanManageCourse } from '~/server/utils/authHelper'
import { getAdminSupabaseClient } from '~/server/utils/supabaseAdmin'

export default defineEventHandler(async (event) => {
  const sectionId = getRouterParam(event, 'id')
  if (!sectionId) {
    throw createError({ statusCode: 400, statusMessage: 'ID modul/section diperlukan' })
  }

  const body = await readBody(event)
  const lookup = getAdminSupabaseClient(event)
  const { data: section, error: sectionError } = await lookup
    .from('course_sections')
    .select('course_id')
    .eq('id', sectionId)
    .maybeSingle()

  if (sectionError || !section) {
    throw createError({ statusCode: 404, statusMessage: 'Modul tidak ditemukan' })
  }

  const { client } = await assertCanManageCourse(event, String(section.course_id))
  const items: Array<{ id: number, type: 'lesson' | 'quiz' }> = body?.items || []

  if (!Array.isArray(items) || items.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'Data items tidak valid' })
  }

  const updatePromises = items.map((item, index) => {
    const newSortOrder = index + 1
    if (item.type === 'lesson') {
      return client
        .from('lessons')
        .update({ sort_order: newSortOrder, updated_at: new Date().toISOString() })
        .eq('id', item.id)
        .eq('section_id', sectionId)
    } else if (item.type === 'quiz') {
      return client
        .from('quizzes')
        .update({ sort_order: newSortOrder, updated_at: new Date().toISOString() })
        .eq('id', item.id)
        .eq('section_id', sectionId)
    }
    return Promise.resolve()
  })

  await Promise.all(updatePromises)

  return { success: true, message: 'Urutan materi dan kuis berhasil diperbarui' }
})
