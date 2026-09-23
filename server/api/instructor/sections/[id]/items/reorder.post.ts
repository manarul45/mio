import { serverSupabaseUser } from '#supabase/server'
import { getAdminSupabaseClient } from '~/server/utils/supabaseAdmin'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Harap login terlebih dahulu' })
  }

  const sectionId = getRouterParam(event, 'id')
  if (!sectionId) {
    throw createError({ statusCode: 400, statusMessage: 'ID modul/section diperlukan' })
  }

  const body = await readBody(event)
  const items: Array<{ id: number, type: 'lesson' | 'quiz' }> = body?.items || []

  if (!Array.isArray(items) || items.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'Data items tidak valid' })
  }

  const client = getAdminSupabaseClient(event)

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
