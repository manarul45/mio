import { getAdminSupabaseClient } from '~/server/utils/supabaseAdmin'

export default defineEventHandler(async (event) => {
  const lessonId = getRouterParam(event, 'id')
  if (!lessonId) {
    throw createError({ statusCode: 400, statusMessage: 'ID materi diperlukan.' })
  }

  const client = getAdminSupabaseClient(event)

  const { data, error } = await client
    .from('lesson_discussions')
    .select(`
      id,
      lesson_id,
      title,
      content,
      is_resolved,
      created_at,
      updated_at,
      user:profiles!lesson_discussions_user_id_fkey(id, name, avatar_url, role),
      replies:lesson_discussion_replies(
        id,
        content,
        is_instructor,
        created_at,
        user:profiles!lesson_discussion_replies_user_id_fkey(id, name, avatar_url, role)
      )
    `)
    .eq('lesson_id', lessonId)
    .order('created_at', { ascending: false })

  if (error) {
    throw createError({ statusCode: 500, statusMessage: 'Gagal memuat diskusi materi: ' + error.message })
  }

  // Sort replies ascending by date
  const discussions = (data || []).map((d: any) => ({
    ...d,
    replies: (d.replies || []).sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
  }))

  return { discussions }
})
