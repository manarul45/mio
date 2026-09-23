import { serverSupabaseUser } from '#supabase/server'
import { getAdminSupabaseClient } from '~/server/utils/supabaseAdmin'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Harap login terlebih dahulu' })
  }

  const courseId = getRouterParam(event, 'id')
  if (!courseId) {
    throw createError({ statusCode: 400, statusMessage: 'ID kursus diperlukan' })
  }

  const client = getAdminSupabaseClient(event)

  const { data, error } = await client
    .from('courses')
    .select(`
      *,
      sections:course_sections(
        *,
        lessons(*),
        quizzes(
          *,
          quiz_questions(
            *,
            quiz_options(*)
          )
        )
      )
    `)
    .eq('id', courseId)
    .single()

  if (error || !data) {
    throw createError({ statusCode: 404, statusMessage: 'Kursus tidak ditemukan' })
  }

  // Sort sections and items
  if (data.sections) {
    data.sections.sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0))
    data.sections.forEach((sec: any) => {
      if (sec.lessons) {
        sec.lessons.sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0))
      }
      if (sec.quizzes) {
        sec.quizzes.sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0))
        sec.quizzes.forEach((qz: any) => {
          if (qz.quiz_questions) {
            qz.quiz_questions.sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0))
            qz.quiz_questions.forEach((qn: any) => {
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
