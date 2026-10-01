import { requireActiveEnrollment, recalculateProgress, getCourseLockState } from '~/server/utils/learningProgress'
import { loadQuizForGrading, gradeQuiz } from '~/server/utils/quizGrading'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const courseId = Number(body?.course_id)
  const quizId = Number(body?.quiz_id)
  const answers: Record<string, number> = body?.answers && typeof body.answers === 'object' ? body.answers : {}

  if (!courseId || !quizId) {
    throw createError({ statusCode: 400, statusMessage: 'course_id dan quiz_id harus diisi.' })
  }

  const { client, userId, enrollment } = await requireActiveEnrollment(event, courseId)
  const quiz = await loadQuizForGrading(client, courseId, quizId)

  const { lockedQuizzes } = await getCourseLockState(client, userId, courseId)
  if (lockedQuizzes.has(quizId)) {
    throw createError({ statusCode: 403, statusMessage: lockedQuizzes.get(quizId) })
  }

  const result = gradeQuiz(quiz, answers)

  const { error: attemptError } = await client
    .from('quiz_attempts')
    .insert({
      user_id: userId,
      course_id: courseId,
      quiz_id: quizId,
      total_questions: result.total_questions,
      correct_answers: result.correct_count,
      score_percentage: result.score,
      passed: result.passed,
      submitted_answers: answers,
    })

  if (attemptError) {
    throw createError({ statusCode: 500, statusMessage: 'Gagal menyimpan hasil kuis: ' + attemptError.message })
  }

  const progress = result.passed
    ? await recalculateProgress(client, userId, courseId, enrollment)
    : null

  return {
    success: true,
    ...result,
    ...(progress || {}),
  }
})
