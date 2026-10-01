import { requireAdmin } from '~/server/utils/authHelper'
import { getAdminSupabaseClient } from '~/server/utils/supabaseAdmin'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const client = getAdminSupabaseClient(event)

  const { data, error } = await client
    .from('courses')
    .select('id, title, status')
    .order('title', { ascending: true })

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  return { courses: data || [] }
})
