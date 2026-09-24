import { serverSupabaseUser } from '#supabase/server'
import { getAdminSupabaseClient } from '~/server/utils/supabaseAdmin'

export default defineEventHandler(async (event) => {
  const reviewId = getRouterParam(event, 'id')
  const user = await serverSupabaseUser(event)

  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Silakan masuk.' })
  }

  const body = await readBody(event)
  const { reply_text } = body

  if (!reply_text || !reply_text.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'Isi balasan wajib diisi.' })
  }

  const client = getAdminSupabaseClient(event)

  // 1. Fetch review and course
  const { data: review, error: rErr } = await client
    .from('course_reviews')
    .select(`
      id,
      course_id,
      course:courses(id, instructor_id)
    `)
    .eq('id', reviewId)
    .single()

  if (rErr || !review) {
    throw createError({ statusCode: 404, statusMessage: 'Ulasan tidak ditemukan.' })
  }

  // 2. Check if user is instructor or admin
  const { data: profile } = await client
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const isInstructor = review.course?.instructor_id === user.id
  const isAdmin = profile?.role === 'ADMIN' || profile?.role === 'SUPER_ADMIN'

  if (!isInstructor && !isAdmin) {
    throw createError({ statusCode: 403, statusMessage: 'Hanya instruktur kursus ini atau administrator yang dapat membalas ulasan.' })
  }

  // 3. Update review with reply
  const { data: updated, error: updErr } = await client
    .from('course_reviews')
    .update({
      instructor_reply: reply_text.trim(),
      instructor_replied_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', reviewId)
    .select()
    .single()

  if (updErr) {
    throw createError({ statusCode: 500, statusMessage: 'Gagal mengirimkan balasan ulasan: ' + updErr.message })
  }

  return { success: true, review: updated }
})
