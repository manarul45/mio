import { requireAdmin } from '~/server/utils/authHelper'
import { getAdminSupabaseClient } from '~/server/utils/supabaseAdmin'
import { resolveShortcodes } from '~/server/utils/landingPageService'

export default defineEventHandler(async (event) => {
  const client = getAdminSupabaseClient(event)
await requireAdmin(event)

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
