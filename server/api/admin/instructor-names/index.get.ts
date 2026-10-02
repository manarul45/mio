import { requireAdmin } from '~/server/utils/authHelper'
import { getAdminSupabaseClient } from '~/server/utils/supabaseAdmin'
import { addInstructorName, getInstructorRoster, removeInstructorName } from '~/server/utils/instructorNames'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const client = getAdminSupabaseClient(event)
  const names = await getInstructorRoster(client)
  return { names }
})
