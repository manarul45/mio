import { getAdminSupabaseClient } from '~/server/utils/supabaseAdmin'
import { getAuthenticatedUserId } from '~/server/utils/authHelper'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const client = getAdminSupabaseClient(event)

  const userId = await getAuthenticatedUserId(event, query?.user_id as string)
  if (!userId) {
    throw createError({ statusCode: 401, statusMessage: 'Harap login terlebih dahulu' })
  }

  // Check user role in profile
  const { data: profile } = await client
    .from('profiles')
    .select('role, email')
    .eq('id', userId)
    .single()

  const isAdmin = profile?.role === 'ADMIN' || profile?.role === 'SUPER_ADMIN' || profile?.email?.startsWith('admin@')

  let dbQuery = client
    .from('courses')
    .select(`
      id,
      title,
      slug,
      thumbnail:thumbnail_url,
      price,
      discount_price,
      status,
      moderation_notes,
      created_at,
      category:categories(name),
      sections:course_sections(
        id,
        lessons:lessons(id),
        quizzes:quizzes(id)
      ),
      enrollments:enrollments(count)
    `)
    .order('created_at', { ascending: false })

  if (!isAdmin) {
    dbQuery = dbQuery.eq('instructor_id', user.id)
  }

  const { data, error } = await dbQuery
  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  return (data || []).map((c: any) => {
    let totalLessons = 0
    let totalQuizzes = 0
    ;(c.sections || []).forEach((s: any) => {
      totalLessons += (s.lessons || []).length
      totalQuizzes += (s.quizzes || []).length
    })

    const enrollmentCount = c.enrollments?.[0]?.count ?? (Array.isArray(c.enrollments) ? c.enrollments.length : 0)

    return {
      id: c.id,
      title: c.title,
      slug: c.slug,
      thumbnail: c.thumbnail,
      price: c.price,
      discount_price: c.discount_price,
      status: c.status,
      moderation_notes: c.moderation_notes,
      created_at: c.created_at,
      category: { name: c.category?.name || 'Umum' },
      lessons_count: totalLessons,
      quizzes_count: totalQuizzes,
      enrollments_count: enrollmentCount,
    }
  })
})
