import { requireAdmin } from '~/server/utils/authHelper'
import { getAdminSupabaseClient } from '~/server/utils/supabaseAdmin'
import { logAuditAction } from '~/server/utils/auditLogger'

export default defineEventHandler(async (event) => {
  const client = getAdminSupabaseClient(event)
const { userId } = await requireAdmin(event)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID landing page tidak valid.' })
  }

  // Set all to false
  await client
    .from('landing_pages')
    .update({ is_homepage: false })
    .neq('id', 0)

  // Set selected to true and published
  const { data: targetPage, error } = await client
    .from('landing_pages')
    .update({ is_homepage: true, status: 'published' })
    .eq('id', id)
    .select()
    .single()

  if (error || !targetPage) {
    throw createError({ statusCode: 500, statusMessage: 'Gagal mengatur homepage: ' + (error?.message || '') })
  }

  await logAuditAction({
    event,
    userId: userId,
    action: 'landing_page.set_homepage',
    entityType: 'landing_pages',
    entityId: id,
    newValues: { name: targetPage.name, is_homepage: true },
  })

  return {
    success: true,
    landingPage: targetPage,
  }
})
