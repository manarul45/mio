import { serverSupabaseUser } from '#supabase/server'
import { getAdminSupabaseClient } from '~/server/utils/supabaseAdmin'
import { logAuditAction } from '~/server/utils/auditLogger'

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

  const { data: existingPage } = await client
    .from('landing_pages')
    .select('*')
    .eq('id', id)
    .single()

  if (!existingPage) {
    throw createError({ statusCode: 404, statusMessage: 'Landing page tidak ditemukan.' })
  }

  const { error } = await client
    .from('landing_pages')
    .delete()
    .eq('id', id)

  if (error) {
    throw createError({ statusCode: 500, statusMessage: 'Gagal menghapus landing page: ' + error.message })
  }

  await logAuditAction({
    event,
    userId: user.id,
    action: 'landing_page.deleted',
    entityType: 'landing_pages',
    entityId: id,
    oldValues: { name: existingPage.name, slug: existingPage.slug },
  })

  return {
    success: true,
  }
})
