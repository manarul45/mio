import { requireActiveEnrollment, recalculateProgress } from '~/server/utils/learningProgress'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const courseId = Number(body?.course_id)
  if (!courseId) {
    throw createError({ statusCode: 400, statusMessage: 'course_id harus diisi.' })
  }

  const { client, userId, enrollment } = await requireActiveEnrollment(event, courseId)
  const progress = await recalculateProgress(client, userId, courseId, enrollment)

  if (!progress.is_course_complete) {
    throw createError({
      statusCode: 400,
      statusMessage: `Progres Anda baru ${progress.progress_percentage}%. Selesaikan semua video dan latihan untuk mendapatkan sertifikat.`,
    })
  }
  if (!progress.certificate_code) {
    throw createError({ statusCode: 500, statusMessage: 'Sertifikat gagal diterbitkan. Silakan coba lagi.' })
  }

  return { certificate_code: progress.certificate_code }
})
