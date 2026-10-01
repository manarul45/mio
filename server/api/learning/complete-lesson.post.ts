import { requireActiveEnrollment, recalculateProgress, getCourseLockState } from '~/server/utils/learningProgress'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const courseId = Number(body?.course_id)
  const lessonId = Number(body?.lesson_id)

  if (!courseId || !lessonId) {
    throw createError({ statusCode: 400, statusMessage: 'course_id dan lesson_id harus diisi.' })
  }

  const { client, userId, enrollment } = await requireActiveEnrollment(event, courseId)

  const { data: lesson } = await client
    .from('lessons')
    .select('id, section:course_sections!inner(course_id)')
    .eq('id', lessonId)
    .eq('section.course_id', courseId)
    .maybeSingle()

  if (!lesson) {
    throw createError({ statusCode: 404, statusMessage: 'Pelajaran tidak ditemukan di kursus ini.' })
  }

  const { lockedLessons } = await getCourseLockState(client, userId, courseId)
  if (lockedLessons.has(lessonId)) {
    throw createError({ statusCode: 403, statusMessage: lockedLessons.get(lessonId) })
  }

  const now = new Date().toISOString()
  const { error: progressError } = await client
    .from('lesson_progress')
    .upsert({
      user_id: userId,
      course_id: courseId,
      lesson_id: lessonId,
      is_completed: true,
      completed_at: now,
      updated_at: now,
    }, { onConflict: 'user_id,lesson_id' })

  if (progressError) {
    throw createError({ statusCode: 500, statusMessage: 'Gagal memperbarui progres: ' + progressError.message })
  }

  const progress = await recalculateProgress(client, userId, courseId, enrollment)

  return {
    success: true,
    ...progress,
    message: progress.is_course_complete
      ? 'Selamat! Anda telah menyelesaikan seluruh materi kursus dan mendapatkan sertifikat kelulusan!'
      : 'Pelajaran berhasil diselesaikan!',
  }
})
