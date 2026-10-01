import type { getAdminSupabaseClient } from '~/server/utils/supabaseAdmin'

type AdminClient = ReturnType<typeof getAdminSupabaseClient>

export function parseCourseIds(raw: unknown): number[] {
  if (!Array.isArray(raw)) return []
  const ids = raw.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0)
  return [...new Set(ids)]
}

export async function assertCoursesExist(client: AdminClient, courseIds: number[]) {
  if (!courseIds.length) return
  const { data, error } = await client.from('courses').select('id').in('id', courseIds)
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  if ((data || []).length !== courseIds.length) {
    throw createError({ statusCode: 400, statusMessage: 'Ada kursus yang tidak ditemukan.' })
  }
}

/** Aktifkan akses kursus; progres belajar yang sudah ada tetap tersimpan. */
export async function activateEnrollments(client: AdminClient, userId: string, courseIds: number[]) {
  if (!courseIds.length) return
  const now = new Date().toISOString()
  const { error } = await client.from('enrollments').upsert(
    courseIds.map((course_id) => ({ user_id: userId, course_id, status: 'active', updated_at: now })),
    { onConflict: 'user_id,course_id' },
  )
  if (error) throw createError({ statusCode: 500, statusMessage: 'Gagal mendaftarkan kursus: ' + error.message })
}

export function buildWhatsappUrl(phone: string | null | undefined, message: string) {
  if (!phone) return ''
  const digits = phone.replace(/[^0-9]/g, '')
  if (!digits) return ''
  const finalPhone = digits.startsWith('0') ? '62' + digits.substring(1) : digits
  return `https://wa.me/${finalPhone}?text=${encodeURIComponent(message)}`
}
