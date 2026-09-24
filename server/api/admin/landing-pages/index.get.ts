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

  const query = getQuery(event)
  const search = (query.search as string) || ''

  let dbQuery = client
    .from('landing_pages')
    .select(`
      id,
      name,
      slug,
      status,
      is_template,
      is_homepage,
      created_by,
      created_at,
      updated_at,
      creator:profiles!landing_pages_created_by_fkey(id, name, email)
    `)
    .order('created_at', { ascending: false })

  if (search.trim()) {
    dbQuery = dbQuery.or(`name.ilike.%${search.trim()}%,slug.ilike.%${search.trim()}%`)
  }

  const { data: landingPages, error } = await dbQuery

  if (error) {
    // If foreign key relation name is different, fallback to simple select
    const fallback = await client
      .from('landing_pages')
      .select('*')
      .order('created_at', { ascending: false })

    if (fallback.error) {
      throw createError({ statusCode: 500, statusMessage: 'Gagal memuat landing pages: ' + fallback.error.message })
    }

    return {
      landingPages: fallback.data || [],
      shortcodes: WHITELISTED_SHORTCODES,
    }
  }

  return {
    landingPages: landingPages || [],
    shortcodes: WHITELISTED_SHORTCODES,
  }
})
