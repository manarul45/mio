import { assertCanModerateDiscussion } from '~/server/utils/discussionAccess'

export default defineEventHandler(async (event) => {
  const discussionId = getRouterParam(event, 'id')
  if (!discussionId) {
    throw createError({ statusCode: 400, statusMessage: 'Pertanyaan tidak ditemukan.' })
  }

  const { client } = await assertCanModerateDiscussion(event, discussionId)

  const { data: discussion, error: fetchErr } = await client
    .from('lesson_discussions')
    .select('id, is_resolved')
    .eq('id', discussionId)
    .single()

  if (fetchErr || !discussion) {
    throw createError({ statusCode: 404, statusMessage: 'Pertanyaan tidak ditemukan.' })
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
