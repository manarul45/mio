import { serverSupabaseUser } from '#supabase/server'
import { getAdminSupabaseClient } from '~/server/utils/supabaseAdmin'
import { WHITELISTED_SHORTCODES } from '~/server/utils/landingPageService'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Silakan masuk.' })
  }

  const client = getAdminSupabaseClient(event)

  const { data: profile } = await client
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'ADMIN' && profile?.role !== 'SUPER_ADMIN') {
    throw createError({ statusCode: 403, statusMessage: 'Akses khusus administrator.' })
  }

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
