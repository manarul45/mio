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
      categories:category_id(name),
      profiles:instructor_id(id, name, avatar_url),
      sections:course_sections(
        id,
        title,
        description,
        sort_order,
        lessons(
          id,
          title,
          slug,
          youtube_video_id,
          duration_seconds,
          is_preview,
          is_active,
          sort_order,
          description
        ),
        quizzes(
          id,
          title,
          slug,
          passing_score,
          time_limit_minutes,
          sort_order,
          quiz_questions(
            id,
            quiz_id,
            question_text,
            explanation,
            points,
            sort_order,
            quiz_options(
              id,
              question_id,
              option_text,
              is_correct,
              sort_order
            )
          )
        )
      )
    `)
    .eq('slug', slug)
    .single()

  if (error || !data) {
    throw createError({ statusCode: 404, statusMessage: 'Kursus ruang belajar tidak ditemukan' })
  }

  // Sort sections and items
  if (data.sections) {
    data.sections.sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0))
    data.sections.forEach((sec: any) => {
      if (sec.lessons) {
        sec.lessons.sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0))
        sec.lessons.forEach((l: any) => {
          l.duration_minutes = l.duration_minutes || (l.duration_seconds ? Math.ceil(l.duration_seconds / 60) : 10)
        })
      }
      if (sec.quizzes) {
        sec.quizzes.sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0))
        sec.quizzes.forEach((qz: any) => {
          if (qz.quiz_questions) {
            qz.quiz_questions.sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0))
            qz.quiz_questions.forEach((qn: any) => {
              // Ensure compatibility for both question_text and question
              qn.question = qn.question_text
              if (qn.quiz_options) {
                qn.quiz_options.sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0))
              }
            })
          }
        })
      }
    })
  }

  return data
})
