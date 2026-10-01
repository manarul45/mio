import { requireAdmin } from '~/server/utils/authHelper'
import { getAdminSupabaseClient } from '~/server/utils/supabaseAdmin'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const client = getAdminSupabaseClient(event)
  const targetUserId = getRouterParam(event, 'id')

  const { data, error } = await client
    .from('enrollments')
    .select('course_id, status, progress_percentage')
    .eq('user_id', targetUserId)

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  return { enrollments: data || [] }
})
