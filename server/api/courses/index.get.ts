import { getAdminSupabaseClient } from '~/server/utils/supabaseAdmin'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const search = (query.search as string) || ''
  const categorySlug = (query.category as string) || ''
  const level = (query.level as string) || ''
  const sort = (query.sort as string) || 'latest'
  const page = Math.max(1, Number(query.page) || 1)
  const perPage = Math.max(1, Number(query.perPage) || 9)

  const client = getAdminSupabaseClient(event)

  let dbQuery = client
    .from('courses')
    .select(`
      id, title, slug, subtitle, description, thumbnail_url, price, discount_price, level, status, created_at,
      category:categories(id, name, slug),
      instructor:profiles!courses_instructor_id_fkey(id, name, avatar_url),
      sections:course_sections(
        id,
        lessons:lessons(id),
        quizzes:quizzes(id)
      )
    `, { count: 'exact' })
    .eq('status', 'published')

  if (categorySlug) {
    const { data: cat } = await client
      .from('categories')
      .select('id')
      .eq('slug', categorySlug)
      .maybeSingle()
    if (cat) {
      dbQuery = dbQuery.eq('category_id', cat.id)
    }
  }

  if (level) {
    dbQuery = dbQuery.eq('level', level)
  }

  if (search.trim()) {
    dbQuery = dbQuery.or(`title.ilike.%${search.trim()}%,subtitle.ilike.%${search.trim()}%`)
  }

  if (sort === 'price_low') {
    dbQuery = dbQuery.order('price', { ascending: true })
  } else if (sort === 'price_high') {
    dbQuery = dbQuery.order('price', { ascending: false })
  } else {
    dbQuery = dbQuery.order('created_at', { ascending: false })
  }

  const from = (page - 1) * perPage
  const to = from + perPage - 1
  dbQuery = dbQuery.range(from, to)

  const { data, count, error } = await dbQuery
  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: error.message
    })
  }

  const mapped = (data || []).map((c: any) => {
    let totalLessons = 0
    let totalQuizzes = 0
    if (c.sections) {
      c.sections.forEach((sec: any) => {
        totalLessons += sec.lessons?.length || 0
        totalQuizzes += sec.quizzes?.length || 0
      })
    }
    return {
      ...c,
      lessons_count: totalLessons,
      quizzes_count: totalQuizzes,
    }
  })

  return {
    courses: mapped,
    total: count || 0,
    totalPages: Math.ceil((count || 0) / perPage) || 1,
  }
})
