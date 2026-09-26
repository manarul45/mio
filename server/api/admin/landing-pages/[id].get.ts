import { requireAdmin } from '~/server/utils/authHelper'
import { getAdminSupabaseClient } from '~/server/utils/supabaseAdmin'
import { WHITELISTED_SHORTCODES } from '~/server/utils/landingPageService'

export default defineEventHandler(async (event) => {
  const client = getAdminSupabaseClient(event)
await requireAdmin(event)
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID landing page tidak valid.' })
  }

  const { data: landingPage, error } = await client
    .from('landing_pages')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !landingPage) {
    throw createError({ statusCode: 404, statusMessage: 'Landing page tidak ditemukan.' })
  }

  const { data: courses } = await client
    .from('courses')
    .select('id, title, slug')
    .order('title', { ascending: true })

  return {
    landingPage,
    shortcodes: WHITELISTED_SHORTCODES,
    courses: courses || [],
  }
})
