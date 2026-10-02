import { serverSupabaseClient } from '#supabase/server'
import { requireAdmin } from '~/server/utils/authHelper'
import { getAdminSupabaseClient } from '~/server/utils/supabaseAdmin'
import { logAuditAction } from '~/server/utils/auditLogger'

async function deleteLandingPage(client: any, id: string) {
  const { data, error } = await client
    .from('landing_pages')
    .delete()
    .eq('id', id)
    .select('id')

  if (error) {
    throw createError({ statusCode: 500, statusMessage: 'Gagal menghapus landing page: ' + error.message })
  }

  return data || []
}

export default defineEventHandler(async (event) => {
  const client = getAdminSupabaseClient(event)
  const { userId } = await requireAdmin(event)

  const id = getRouterParam(event, 'id')
  if (!id || !/^\d+$/.test(id)) {
    throw createError({ statusCode: 400, statusMessage: 'ID landing page tidak valid.' })
  }

  const { data: existingPage } = await client
    .from('landing_pages')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (!existingPage) {
    throw createError({ statusCode: 404, statusMessage: 'Landing page tidak ditemukan.' })
  }

  let deleted = await deleteLandingPage(client, id)
  if (!deleted.length) {
    const userClient = await serverSupabaseClient(event)
    deleted = await deleteLandingPage(userClient, id)
  }

  if (!deleted.length) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Landing page tidak terhapus. Database menolak perintah hapus.',
    })
  }

  await logAuditAction({
    event,
    userId: userId,
    action: 'landing_page.deleted',
    entityType: 'landing_pages',
    entityId: id,
    oldValues: { name: existingPage.name, slug: existingPage.slug },
  })

  return {
    success: true,
  }
})
