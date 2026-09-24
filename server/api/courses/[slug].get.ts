import { getAdminSupabaseClient } from '~/server/utils/supabaseAdmin'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  if (!slug) {
    throw createError({ statusCode: 400, statusMessage: 'Slug kursus diperlukan' })
  }

  const client = getAdminSupabaseClient(event)

  const { data, error } = await client
    .from('courses')
    .select(`
      *,
      category:categories(id, name, slug),
      instructor:profiles!courses_instructor_id_fkey(id, name, avatar_url),
      sections:course_sections(
        id, title, description, sort_order,
        lessons:lessons(id, title, slug, youtube_video_id, duration_seconds, is_preview, is_active, sort_order, description),
        quizzes:quizzes(id, title, slug, passing_score, time_limit_minutes, sort_order)
      ),
      reviews:course_reviews(
        id, rating, review_text, created_at, instructor_reply, instructor_replied_at,
        user:profiles!course_reviews_user_id_fkey(id, name, avatar_url)
      )
    `)
    .eq('slug', slug)
    .single()

  if (error || !data) {
    throw createError({ statusCode: 404, statusMessage: 'Kursus tidak ditemukan' })
  }

  // Sort sections and items
  if (data.sections) {
    data.sections.sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0))
    data.sections.forEach((sec: any) => {
      if (sec.lessons) sec.lessons.sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0))
      if (sec.quizzes) sec.quizzes.sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0))
    })
  }

  // Calculate review stats
  const reviews = data.reviews || []
  const totalReviews = reviews.length
  const totalRating = reviews.reduce((sum: number, r: any) => sum + (Number(r.rating) || 0), 0)
  const averageRating = totalReviews > 0 ? (totalRating / totalReviews).toFixed(1) : '5.0'

  return {
    ...data,
    total_reviews: totalReviews,
    average_rating: averageRating,
  }
})
