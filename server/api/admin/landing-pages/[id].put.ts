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
    userId: user.id,
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
