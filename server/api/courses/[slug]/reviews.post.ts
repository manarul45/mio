import { serverSupabaseUser } from '#supabase/server'
import { getAdminSupabaseClient } from '~/server/utils/supabaseAdmin'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  const user = await serverSupabaseUser(event)

  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Silakan masuk untuk memberikan ulasan.' })
  }

  const body = await readBody(event)
  const { rating, review_text } = body

  const numericRating = Math.max(1, Math.min(5, Number(rating) || 5))
  if (!review_text || !review_text.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'Teks ulasan wajib diisi.' })
  }

  const client = getAdminSupabaseClient(event)

  // 1. Fetch course by slug
  const { data: course, error: cErr } = await client
    .from('courses')
    .select('id')
    .eq('slug', slug)
    .single()

  if (cErr || !course) {
    throw createError({ statusCode: 404, statusMessage: 'Kursus tidak ditemukan.' })
  }

  // 2. Verify enrollment
  const { data: enrollment } = await client
    .from('enrollments')
    .select('id')
    .eq('user_id', user.id)
    .eq('course_id', course.id)
    .maybeSingle()

  if (!enrollment) {
    throw createError({ statusCode: 403, statusMessage: 'Hanya siswa yang terdaftar di kursus ini yang dapat memberikan ulasan.' })
  }

  // 3. Upsert review into course_reviews
  const { data: review, error: revErr } = await client
    .from('course_reviews')
    .upsert({
      user_id: user.id,
      course_id: course.id,
      rating: numericRating,
      review_text: review_text.trim(),
      is_approved: true,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,course_id' })
    .select(`
      id,
      rating,
      review_text,
      created_at,
      instructor_reply,
      instructor_replied_at,
      user:profiles!course_reviews_user_id_fkey(id, name, avatar_url)
    `)
    .single()

  if (revErr) {
    throw createError({ statusCode: 500, statusMessage: 'Gagal menyimpan ulasan: ' + revErr.message })
  }

  return { success: true, review }
})
