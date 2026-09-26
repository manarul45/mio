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

  const { data: existingPage } = await client
    .from('landing_pages')
    .select('*')
    .eq('id', id)
    .single()

  if (!existingPage) {
    throw createError({ statusCode: 404, statusMessage: 'Landing page tidak ditemukan.' })
  }

  const body = await readBody(event)
  const { name, content, status, is_template, slug: rawSlug } = body

  if (!name || typeof name !== 'string' || !name.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'Nama landing page wajib diisi.' })
  }

  let finalSlug = existingPage.slug
  if (rawSlug && rawSlug.trim()) {
    finalSlug = rawSlug
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
  }

  const { data: updatedPage, error } = await client
    .from('landing_pages')
    .update({
      name: name.trim(),
      slug: finalSlug,
      content: content ?? existingPage.content,
      status: status === 'published' ? 'published' : 'draft',
      is_template: typeof is_template === 'boolean' ? is_template : existingPage.is_template,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error || !updatedPage) {
    throw createError({ statusCode: 500, statusMessage: 'Gagal memperbarui landing page: ' + (error?.message || '') })
  }

  await logAuditAction({
    event,
    userId: userId,
    action: 'landing_page.updated',
    entityType: 'landing_pages',
    entityId: id,
    oldValues: { name: existingPage.name, slug: existingPage.slug, status: existingPage.status },
    newValues: { name: updatedPage.name, slug: updatedPage.slug, status: updatedPage.status },
  })

  return {
    success: true,
    landingPage: updatedPage,
  }
})
