import { requireAdmin } from '~/server/utils/authHelper'
import { getAdminSupabaseClient } from '~/server/utils/supabaseAdmin'
import { logAuditAction } from '~/server/utils/auditLogger'
import { activateEnrollments, assertCoursesExist, parseCourseIds } from '~/server/utils/adminEnrollment'

/**
 * Samakan akses kursus pengguna dengan daftar `course_ids`:
 * kursus yang dicentang diaktifkan, kursus aktif yang tidak dicentang dicabut (status revoked).
 */
export default defineEventHandler(async (event) => {
  const { userId: adminId } = await requireAdmin(event)
  const client = getAdminSupabaseClient(event)
  const targetUserId = getRouterParam(event, 'id')
  const body = await readBody(event)
  const courseIds = parseCourseIds(body?.course_ids)

  const { data: target } = await client.from('profiles').select('id').eq('id', targetUserId).maybeSingle()
  if (!target) throw createError({ statusCode: 404, statusMessage: 'Pengguna tidak ditemukan.' })

  await assertCoursesExist(client, courseIds)

  const { data: current, error: currentError } = await client
    .from('enrollments')
    .select('course_id, status')
    .eq('user_id', target.id)
  if (currentError) throw createError({ statusCode: 500, statusMessage: currentError.message })

  const activeIds = (current || []).filter((e: any) => e.status === 'active').map((e: any) => Number(e.course_id))
  const toActivate = courseIds.filter((id) => !activeIds.includes(id))
  const toRevoke = activeIds.filter((id) => !courseIds.includes(id))

  await activateEnrollments(client, target.id, toActivate)

  if (toRevoke.length) {
    const { error } = await client
      .from('enrollments')
      .update({ status: 'revoked', updated_at: new Date().toISOString() })
      .eq('user_id', target.id)
      .in('course_id', toRevoke)
    if (error) throw createError({ statusCode: 500, statusMessage: 'Gagal mencabut akses kursus: ' + error.message })
  }

  if (toActivate.length || toRevoke.length) {
    await logAuditAction({
      event,
      userId: adminId,
      action: 'enrollment.updated_by_admin',
      entityType: 'User',
      entityId: target.id,
      newValues: { activated_course_ids: toActivate, revoked_course_ids: toRevoke },
    })
  }

  return {
    success: true,
    activated_count: toActivate.length,
    revoked_count: toRevoke.length,
  }
})
