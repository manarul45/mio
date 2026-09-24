import { serverSupabaseUser } from '#supabase/server'
import { getAdminSupabaseClient } from '~/server/utils/supabaseAdmin'

export default defineEventHandler(async (event) => {
  const discussionId = getRouterParam(event, 'id')
  const user = await serverSupabaseUser(event)

  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Silakan masuk untuk membalas diskusi.' })
  }

  const body = await readBody(event)
  const { content } = body

  if (!content || !content.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'Isi balasan wajib diisi.' })
  }

  const client = getAdminSupabaseClient(event)

  // Check user role or if user is course instructor
  const { data: profile } = await client
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const isInstructorRole = profile?.role === 'INSTRUCTOR' || profile?.role === 'ADMIN' || profile?.role === 'SUPER_ADMIN'

  const { data, error } = await client
    .from('lesson_discussion_replies')
    .insert({
      discussion_id: discussionId,
      user_id: user.id,
      content: content.trim(),
      is_instructor: isInstructorRole,
    })
    .select(`
      id,
      discussion_id,
      content,
      is_instructor,
      created_at,
      user:profiles!lesson_discussion_replies_user_id_fkey(id, name, avatar_url, role)
    `)
    .single()

  if (error) {
    throw createError({ statusCode: 500, statusMessage: 'Gagal mengirim balasan: ' + error.message })
  }

  return { success: true, reply: data }
})
