import { getAdminSupabaseClient } from '~/server/utils/supabaseAdmin'
import { getAuthenticatedUserId } from '~/server/utils/authHelper'

export default defineEventHandler(async (event) => {
  const courseId = getRouterParam(event, 'id')
  if (!courseId) {
    throw createError({ statusCode: 400, statusMessage: 'ID kursus diperlukan' })
  }

  const query = getQuery(event)
  const client = getAdminSupabaseClient(event)

  const instructorId = await getAuthenticatedUserId(event, query?.user_id as string)

  // Check existing course
  const { data: existingCourse } = await client
    .from('courses')
    .select('id, instructor_id')
    .eq('id', courseId)
    .single()

  if (!existingCourse) {
    throw createError({ statusCode: 404, statusMessage: 'Kursus tidak ditemukan' })
  }

  if (instructorId) {
    const { data: profile } = await client
      .from('profiles')
      .select('role')
      .eq('id', instructorId)
      .single()

    const isAdmin = profile?.role === 'ADMIN' || profile?.role === 'SUPER_ADMIN'
    if (!isAdmin && existingCourse.instructor_id !== instructorId) {
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
