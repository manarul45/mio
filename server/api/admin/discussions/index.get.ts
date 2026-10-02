import { requireAdmin } from '~/server/utils/authHelper'
import { getAdminSupabaseClient } from '~/server/utils/supabaseAdmin'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const client = getAdminSupabaseClient(event)

  const { data, error } = await client
    .from('lesson_discussions')
    .select(`
      id,
      title,
      content,
      is_resolved,
      created_at,
      user:profiles!lesson_discussions_user_id_fkey(name),
      replies:lesson_discussion_replies(id, content, is_instructor, created_at),
      lesson:lessons!lesson_discussions_lesson_id_fkey(
        id,
        title,
        section:course_sections!lessons_section_id_fkey(
          course:courses!course_sections_course_id_fkey(id, title, slug)
        )
      )
    `)
    .eq('is_resolved', false)
    .order('created_at', { ascending: true })

  if (error) {
    throw createError({ statusCode: 500, statusMessage: 'Gagal memuat pertanyaan: ' + error.message })
  }

  const questions = (data || []).map((row: any) => {
    const course = row.lesson?.section?.course
    return {
      id: row.id,
      title: row.title,
      content: row.content,
      created_at: row.created_at,
      student_name: row.user?.name || 'Siswa',
      lesson_id: row.lesson?.id || null,
      lesson_title: row.lesson?.title || 'Materi',
      course_title: course?.title || 'Kelas',
      course_slug: course?.slug || '',
      replies: (row.replies || []).sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
    }
  })

  return { questions }
})