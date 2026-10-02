import { getAdminSupabaseClient } from '~/server/utils/supabaseAdmin'
import { getCourseInstructorMap, getInstructorRoster } from '~/server/utils/instructorNames'

export default defineEventHandler(async (event) => {
  const client = getAdminSupabaseClient(event)
  const [names, byCourseId] = await Promise.all([
    getInstructorRoster(client),
    getCourseInstructorMap(client),
  ])
  return { names, byCourseId }
})
