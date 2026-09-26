import { assertCanManageCourse } from '~/server/utils/authHelper'
import { QuizWriteError } from '~/server/utils/quizContent'
import { importCurriculum } from '~/server/utils/quizWrite'

export default defineEventHandler(async (event) => {
  const courseId = getRouterParam(event, 'id')
  if (!courseId) {
    throw createError({ statusCode: 400, statusMessage: 'ID kursus diperlukan' })
  }

  const body = await readBody(event)
  const { client } = await assertCanManageCourse(event, courseId, body?.instructor_id)

  try {
    const result = await importCurriculum(client, courseId, body?.sections)
    return { success: true, ...result }
  } catch (err: any) {
    const statusCode = err instanceof QuizWriteError ? err.statusCode : 500
    throw createError({
      statusCode,
      statusMessage: err?.message || 'Gagal mengimpor kurikulum',
    })
  }
})
