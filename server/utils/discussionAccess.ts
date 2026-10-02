import type { H3Event } from 'h3'
import { getAuthenticatedUserId } from '~/server/utils/authHelper'
import { getAdminSupabaseClient } from '~/server/utils/supabaseAdmin'

function courseInstructorId(discussion: any) {
  const lesson = discussion?.lesson
  const section = lesson?.section
  const course = section?.course
  return course?.instructor_id || null
}

export async function assertCanModerateDiscussion(event: H3Event, discussionId: string) {
  const client = getAdminSupabaseClient(event)
  const userId = await getAuthenticatedUserId(event)
  if (!userId) {
    throw createError({ statusCode: 401, statusMessage: 'Silakan masuk.' })
  }

  const { data: profile } = await client
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle()

  const role = String(profile?.role || '').toUpperCase()
  const isAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN'

  const { data: discussion, error } = await client
    .from('lesson_discussions')
    .select(`
      id,
      is_resolved,
      lesson:lessons(
        section:course_sections(
          course:courses(instructor_id)
        )
      )
    `)
    .eq('id', discussionId)
    .maybeSingle()

  if (error || !discussion) {
    throw createError({ statusCode: 404, statusMessage: 'Pertanyaan tidak ditemukan.' })
  }

  if (!isAdmin && courseInstructorId(discussion) !== userId) {
    throw createError({ statusCode: 403, statusMessage: 'Hanya pengajar yang dapat menjawab atau menutup pertanyaan.' })
  }

  return { client, userId, isAdmin }
}
