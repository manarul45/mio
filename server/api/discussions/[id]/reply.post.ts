import { assertCanModerateDiscussion } from '~/server/utils/discussionAccess'

export default defineEventHandler(async (event) => {
  const discussionId = getRouterParam(event, 'id')
  if (!discussionId) {
    throw createError({ statusCode: 400, statusMessage: 'Pertanyaan tidak ditemukan.' })
  }

  const { client, userId } = await assertCanModerateDiscussion(event, discussionId)
  const body = await readBody(event)
  const content = String(body?.content || '')

  if (!content.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'Isi balasan wajib diisi.' })
  }

  const { data, error } = await client
    .from('lesson_discussion_replies')
    .insert({
      discussion_id: discussionId,
      user_id: userId,
      content: content.trim(),
      is_instructor: true,
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
