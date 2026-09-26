import { requireAdmin } from '~/server/utils/authHelper'
import { getAdminSupabaseClient } from '~/server/utils/supabaseAdmin'
import { logAuditAction } from '~/server/utils/auditLogger'

export default defineEventHandler(async (event) => {
  const client = getAdminSupabaseClient(event)
const { userId } = await requireAdmin(event)

  const body = await readBody(event)
  const { name, content, status = 'draft', is_template = false } = body

  if (!name || typeof name !== 'string' || !name.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'Nama landing page wajib diisi.' })
  }

  let rawSlug = (body.slug || name)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

  if (!rawSlug) {
    rawSlug = 'lp-' + Date.now()
  }

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
      name: name.trim(),
      slug,
      content: content || '',
      status: status === 'published' ? 'published' : 'draft',
      is_template: Boolean(is_template),
      is_homepage: false,
      created_by: userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error || !newPage) {
    throw createError({ statusCode: 500, statusMessage: 'Gagal membuat landing page: ' + (error?.message || '') })
  }

  await logAuditAction({
    event,
    userId: userId,
    action: 'landing_page.created',
    entityType: 'landing_pages',
    entityId: newPage.id,
    newValues: { name: newPage.name, slug: newPage.slug, status: newPage.status },
  })

  return {
    success: true,
    landingPage: newPage,
  }
})
