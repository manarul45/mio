import { serverSupabaseUser } from '#supabase/server'
import { getAdminSupabaseClient } from '~/server/utils/supabaseAdmin'

export default defineEventHandler(async (event) => {
  const lessonId = getRouterParam(event, 'id')
  const user = await serverSupabaseUser(event)

  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Silakan masuk untuk mengajukan pertanyaan diskusi.' })
  }

  const body = await readBody(event)
  const { title, content } = body

  if (!title || !title.trim() || !content || !content.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'Judul dan isi pertanyaan diskusi wajib diisi.' })
  }

  const client = getAdminSupabaseClient(event)

  const { data, error } = await client
    .from('lesson_discussions')
    .insert({
      lesson_id: lessonId,
      user_id: user.id,
      title: title.trim(),
      content: content.trim(),
      is_resolved: false,
    })
    .select(`
      id,
      lesson_id,
      title,
      content,
      is_resolved,
      created_at,
      updated_at,
      user:profiles!lesson_discussions_user_id_fkey(id, name, avatar_url, role)
    `)
    .single()

  if (error) {
    throw createError({ statusCode: 500, statusMessage: 'Gagal mengajukan diskusi: ' + error.message })
  }

  return { success: true, discussion: { ...data, replies: [] } }
})
