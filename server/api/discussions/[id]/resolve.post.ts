import { serverSupabaseUser } from '#supabase/server'
import { getAdminSupabaseClient } from '~/server/utils/supabaseAdmin'

export default defineEventHandler(async (event) => {
  const discussionId = getRouterParam(event, 'id')
  const user = await serverSupabaseUser(event)

  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Silakan masuk.' })
  }

  const client = getAdminSupabaseClient(event)

  // Fetch current status
  const { data: discussion, error: fetchErr } = await client
    .from('lesson_discussions')
    .select('id, user_id, is_resolved')
    .eq('id', discussionId)
    .single()

  if (fetchErr || !discussion) {
    throw createError({ statusCode: 404, statusMessage: 'Diskusi tidak ditemukan.' })
  }

  const newStatus = !discussion.is_resolved

  const { data, error } = await client
    .from('lesson_discussions')
    .update({ is_resolved: newStatus, updated_at: new Date().toISOString() })
    .eq('id', discussionId)
    .select()
    .single()

  if (error) {
    throw createError({ statusCode: 500, statusMessage: 'Gagal memperbarui status diskusi: ' + error.message })
  }

  return { success: true, is_resolved: newStatus }
})
