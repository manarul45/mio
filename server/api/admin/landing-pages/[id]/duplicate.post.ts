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

  const { data: sourcePage } = await client
    .from('landing_pages')
    .select('*')
    .eq('id', id)
    .single()

  if (!sourcePage) {
    throw createError({ statusCode: 404, statusMessage: 'Landing page sumber tidak ditemukan.' })
  }

  const rawSlug = `${sourcePage.slug}-copy`
  let slug = rawSlug
  let counter = 1
  while (true) {
    const { data: existing } = await client
      .from('landing_pages')
      .select('id')
      .eq('slug', slug)
      .maybeSingle()

    if (!existing) break
    slug = `${rawSlug}-${counter++}`
  }

  const { data: newPage, error } = await client
    .from('landing_pages')
    .insert({
      name: `${sourcePage.name} (Copy)`,
      slug,
      content: sourcePage.content || '',
      status: 'draft',
      is_template: false,
      is_homepage: false,
      created_by: user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error || !newPage) {
    throw createError({ statusCode: 500, statusMessage: 'Gagal menduplikasi landing page: ' + (error?.message || '') })
  }

  await logAuditAction({
    event,
    userId: user.id,
    action: 'landing_page.duplicated',
    entityType: 'landing_pages',
    entityId: newPage.id,
    oldValues: { original_id: sourcePage.id },
    newValues: { name: newPage.name, slug: newPage.slug },
  })

  return {
    success: true,
    landingPage: newPage,
  }
})
