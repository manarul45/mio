import { assertCanManageCourse } from '~/server/utils/authHelper'
import { QuizWriteError } from '~/server/utils/quizContent'
import { saveQuizRecord } from '~/server/utils/quizWrite'

function asWriteError(err: any) {
  const statusCode = err instanceof QuizWriteError ? err.statusCode : (err?.statusCode || 500)
  const message = err?.message || 'Gagal menyimpan kuis'
  throw createError({ statusCode, statusMessage: message })
}

export default defineEventHandler(async (event) => {
  const courseId = getRouterParam(event, 'id')
  if (!courseId) {
    throw createError({ statusCode: 400, statusMessage: 'ID kursus diperlukan' })
  }

  const body = await readBody(event)
  const { client } = await assertCanManageCourse(event, courseId, body?.instructor_id)
  const sectionId = Number(body?.section_id)
  if (!sectionId) {
    throw createError({ statusCode: 400, statusMessage: 'Modul kuis diperlukan' })
  }

  const { data: section, error: sectionError } = await client
    .from('course_sections')
    .select('id, course_id')
    .eq('id', sectionId)
    .maybeSingle()

  if (sectionError) asWriteError(sectionError)
  if (!section || String(section.course_id) !== String(courseId)) {
    throw createError({ statusCode: 400, statusMessage: 'Modul tidak termasuk kursus ini' })
  }

  const quizId = body?.id ? Number(body.id) : null
  let sortOrder = 1
  if (quizId) {
    const { data: existing, error: existingError } = await client
      .from('quizzes')
      .select('id, section_id')
      .eq('id', quizId)
      .maybeSingle()
    if (existingError) asWriteError(existingError)
    if (!existing || Number(existing.section_id) !== sectionId) {
      throw createError({ statusCode: 404, statusMessage: 'Kuis tidak ditemukan' })
    }
  } else {
    const { count, error: countError } = await client
      .from('quizzes')
      .select('id', { count: 'exact', head: true })
      .eq('section_id', sectionId)
    if (countError) asWriteError(countError)
    sortOrder = (count || 0) + 1
  }

  try {
    const id = await saveQuizRecord(client, {
      sectionId,
      quizId,
      title: body?.title,
      passingScore: body?.passing_score,
      sortOrder,
      questions: Array.isArray(body?.questions) ? body.questions : [],
      fromImport: false,
    })
    return { success: true, id }
  } catch (err: any) {
    asWriteError(err)
  }
})
