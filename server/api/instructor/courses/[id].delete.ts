import { serverSupabaseUser } from '#supabase/server'
import { getAdminSupabaseClient } from '~/server/utils/supabaseAdmin'

export default defineEventHandler(async (event) => {
  let user = null
  try {
    user = await serverSupabaseUser(event)
  } catch (e) {
    // ignore
  }

  const courseId = getRouterParam(event, 'id')
  if (!courseId) {
    throw createError({ statusCode: 400, statusMessage: 'ID kursus diperlukan' })
  }

  const client = getAdminSupabaseClient(event)

  // Check existing course
  const { data: existingCourse } = await client
    .from('courses')
    .select('id, instructor_id')
    .eq('id', courseId)
    .single()

  if (!existingCourse) {
    throw createError({ statusCode: 404, statusMessage: 'Kursus tidak ditemukan' })
  }

  if (user) {
    const { data: profile } = await client
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const isAdmin = profile?.role === 'ADMIN' || profile?.role === 'SUPER_ADMIN'
    if (!isAdmin && existingCourse.instructor_id !== user.id) {
      throw createError({ statusCode: 403, statusMessage: 'Anda tidak memiliki hak akses untuk menghapus kursus ini' })
    }
  }

  const { error } = await client
    .from('courses')
    .delete()
    .eq('id', courseId)

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message || 'Gagal menghapus kursus' })
  }

  return { success: true, message: 'Kursus berhasil dihapus' }
})
