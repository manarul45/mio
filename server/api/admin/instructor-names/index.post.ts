import { requireAdmin } from '~/server/utils/authHelper'
import { getAdminSupabaseClient } from '~/server/utils/supabaseAdmin'
import { addInstructorName, removeInstructorName } from '~/server/utils/instructorNames'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const client = getAdminSupabaseClient(event)
  const body = await readBody(event)
  const action = String(body?.action || '')
  const name = String(body?.name || '')

  const names = action === 'remove'
    ? await removeInstructorName(client, name)
    : await addInstructorName(client, name)

  return { names }
})
