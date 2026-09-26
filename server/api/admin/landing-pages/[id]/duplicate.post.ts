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
      created_by: userId,
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
    userId: userId,
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
