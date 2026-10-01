import { assertCanManageCourse } from '~/server/utils/authHelper'

export default defineEventHandler(async (event) => {
  const courseId = getRouterParam(event, 'id')
  const quizId = Number(getRouterParam(event, 'quizId'))
  if (!courseId || !quizId) {
    throw createError({ statusCode: 400, statusMessage: 'Kursus dan latihan wajib dipilih.' })
  }

  const { client } = await assertCanManageCourse(event, courseId)

  const { data: quiz, error: quizError } = await client
    .from('quizzes')
    .select('id, section_id')
    .eq('id', quizId)
    .maybeSingle()

  if (quizError) {
    throw createError({ statusCode: 500, statusMessage: quizError.message || 'Gagal memeriksa latihan' })
  }
  if (!quiz) {
    throw createError({ statusCode: 404, statusMessage: 'Latihan tidak ditemukan' })
  }

  const { data: section, error: sectionError } = await client
    .from('course_sections')
    .select('course_id')
    .eq('id', quiz.section_id)
    .maybeSingle()

  if (sectionError) {
    throw createError({ statusCode: 500, statusMessage: sectionError.message || 'Gagal memeriksa modul' })
  }
  if (!section || String(section.course_id) !== String(courseId)) {
    throw createError({ statusCode: 404, statusMessage: 'Latihan tidak ditemukan pada kursus ini' })
  }

  const { error: attemptError } = await client.from('quiz_attempts').delete().eq('quiz_id', quizId)
  if (attemptError) {
    throw createError({ statusCode: 500, statusMessage: attemptError.message || 'Gagal menghapus riwayat latihan' })
  }

  const { data: questions, error: questionReadError } = await client
    .from('quiz_questions')
    .select('id')
    .eq('quiz_id', quizId)
  if (questionReadError) {
    throw createError({ statusCode: 500, statusMessage: questionReadError.message || 'Gagal memeriksa soal latihan' })
  }

  const questionIds = (questions || []).map((row: { id: number }) => row.id)
  if (questionIds.length > 0) {
    const { error: optionError } = await client.from('quiz_options').delete().in('question_id', questionIds)
    if (optionError) {
      throw createError({ statusCode: 500, statusMessage: optionError.message || 'Gagal menghapus pilihan jawaban' })
    }
    const { error: questionError } = await client.from('quiz_questions').delete().eq('quiz_id', quizId)
    if (questionError) {
      throw createError({ statusCode: 500, statusMessage: questionError.message || 'Gagal menghapus soal latihan' })
    }
  }

  const { error: deleteError } = await client.from('quizzes').delete().eq('id', quizId)
  if (deleteError) {
    throw createError({ statusCode: 500, statusMessage: deleteError.message || 'Gagal menghapus latihan' })
  }

  return { success: true }
})
