import { serverSupabaseUser } from '#supabase/server'
import { getAdminSupabaseClient } from '~/server/utils/supabaseAdmin'
import { resolveShortcodes } from '~/server/utils/landingPageService'

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

  const body = await readBody(event)
  const { content = '', course_id } = body

  let course: any = null
  if (course_id) {
    const { data: foundCourse } = await client
      .from('courses')
      .select(`
        *,
        category:categories(id, name, slug),
        instructor:profiles!courses_instructor_id_fkey(id, name, avatar_url, headline, bio)
      `)
      .eq('id', course_id)
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

  const html = resolveShortcodes(content, course, settingsMap)

  return {
    success: true,
    html,
  }
})
