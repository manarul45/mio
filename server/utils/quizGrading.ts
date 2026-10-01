import type { getAdminSupabaseClient } from '~/server/utils/supabaseAdmin'

type AdminClient = ReturnType<typeof getAdminSupabaseClient>

export async function loadQuizForGrading(client: AdminClient, courseId: number, quizId: number) {
  const { data: quiz } = await client
    .from('quizzes')
    .select(`
      id,
      passing_score,
      section:course_sections!inner(course_id),
      quiz_questions(id, quiz_options(id, is_correct))
    `)
    .eq('id', quizId)
    .eq('section.course_id', courseId)
    .maybeSingle()

  if (!quiz) {
    throw createError({ statusCode: 404, statusMessage: 'Kuis tidak ditemukan di kursus ini.' })
  }
  return quiz as any
}

/**
 * Nilai jawaban dan susun pembahasan per soal.
 * Kunci jawaban (correct_option_ids) hanya dibuka jika peserta lulus,
 * supaya tidak bisa disalin saat mengulang kuis.
 */
export function gradeQuiz(quiz: any, answers: Record<string, number>) {
  const questions = quiz.quiz_questions || []
  let correctCount = 0

  const review = questions.map((question: any) => {
    const selected = Number(answers[String(question.id)]) || null
    const correctOptionIds = (question.quiz_options || [])
      .filter((o: any) => o.is_correct)
      .map((o: any) => o.id)
    const isCorrect = selected !== null && correctOptionIds.includes(selected)
    if (isCorrect) correctCount++
    return { question_id: question.id, selected_option_id: selected, is_correct: isCorrect, correct_option_ids: correctOptionIds }
  })

  const totalQuestions = questions.length
  const score = Math.round((correctCount / (totalQuestions || 1)) * 100)
  const passingScore = quiz.passing_score || 80
  const passed = totalQuestions > 0 && score >= passingScore

  if (!passed) {
    review.forEach((r: any) => { r.correct_option_ids = [] })
  }

  return { score, passed, correct_count: correctCount, total_questions: totalQuestions, passing_score: passingScore, review }
}
