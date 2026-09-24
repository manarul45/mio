import { getAdminSupabaseClient } from '~/server/utils/supabaseAdmin'
import { resolveShortcodes } from '~/server/utils/landingPageService'

export default defineEventHandler(async (event) => {
  const client = getAdminSupabaseClient(event)
  const slug = getRouterParam(event, 'slug')
  const query = getQuery(event)
  const courseId = query.course_id

  let dbQuery = client
    .from('landing_pages')
    .select('*')

  if (slug === '__homepage__') {
    dbQuery = dbQuery.eq('is_homepage', true).eq('status', 'published')
  } else {
    dbQuery = dbQuery.eq('slug', slug).eq('status', 'published')
  }

  const { data: landingPage, error } = await dbQuery.maybeSingle()

  if (error || !landingPage) {
    throw createError({ statusCode: 404, statusMessage: 'Landing page tidak ditemukan atau belum dipublikasikan.' })
  }

  let course: any = null
  if (courseId) {
    const { data: foundCourse } = await client
      .from('courses')
      .select(`
        *,
        category:categories(id, name, slug),
        instructor:profiles!courses_instructor_id_fkey(id, name, avatar_url, headline, bio)
      `)
      .eq('id', courseId)
      .maybeSingle()

    course = foundCourse
  }

  const { data: settingsRows } = await client
    .from('settings')
    .select('key, value')

  const settingsMap: Record<string, string> = {}
  if (settingsRows) {
    for (const row of settingsRows) {
      settingsMap[row.key] = row.value
    }
  }

  const html = resolveShortcodes(landingPage.content || '', course, settingsMap)

  if (query.raw === 'true' || query.raw === '1') {
    setHeader(event, 'content-type', 'text/html; charset=utf-8')
    return html
  }

  return {
    landingPage,
    html,
  }
})
