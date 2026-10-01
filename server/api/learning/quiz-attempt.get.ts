import { requireActiveEnrollment } from '~/server/utils/learningProgress'
import { loadQuizForGrading, gradeQuiz } from '~/server/utils/quizGrading'

/** Hasil percobaan terakhir peserta untuk satu kuis, beserta jawaban dan pembahasannya. */
export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const courseId = Number(query.course_id)
  const quizId = Number(query.quiz_id)

  if (!courseId || !quizId) {
    throw createError({ statusCode: 400, statusMessage: 'course_id dan quiz_id harus diisi.' })
  }

  const { client, userId } = await requireActiveEnrollment(event, courseId)

  const { data: attempt } = await client
    .from('quiz_attempts')
    .select('submitted_answers, created_at')
    .eq('user_id', userId)
    .eq('quiz_id', quizId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!attempt) {
    return { attempt: null }
  }

  const answers = (attempt.submitted_answers || {}) as Record<string, number>
  const quiz = await loadQuizForGrading(client, courseId, quizId)

  return {
    attempt: {
      ...gradeQuiz(quiz, answers),
      answers,
      submitted_at: attempt.created_at,
    },
  }
})
