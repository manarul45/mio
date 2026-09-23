import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { course_id, lesson_id } = body

  if (!course_id || !lesson_id) {
    throw createError({ statusCode: 400, statusMessage: 'course_id dan lesson_id harus diisi.' })
  }

  const supabase = await serverSupabaseClient(event)
  const user = await serverSupabaseUser(event)

  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Sesi login tidak sah.' })
  }

  // 1. Verify Enrollment
  const { data: enrollment, error: enrollError } = await supabase
    .from('enrollments')
    .select('id, status')
    .eq('user_id', user.id)
    .eq('course_id', course_id)
    .eq('status', 'active')
    .single()

  if (enrollError || !enrollment) {
    throw createError({ statusCode: 403, statusMessage: 'Anda tidak memiliki akses aktif ke kursus ini.' })
  }

  // 2. Upsert Lesson Progress
  const { error: progressError } = await supabase
    .from('lesson_progress')
    .upsert({
      user_id: user.id,
      course_id: course_id,
      lesson_id: lesson_id,
      is_completed: true,
      completed_at: new Date().toISOString()
    }, {
      onConflict: 'user_id,lesson_id'
    })

  if (progressError) {
    throw createError({ statusCode: 500, statusMessage: 'Gagal memperbarui progres: ' + progressError.message })
  }

  // 3. Check if all lessons in the course are now completed
  const { data: allLessons } = await supabase
    .from('lessons')
    .select('id, section:course_sections!inner(course_id)')
    .eq('section.course_id', course_id)
    .eq('is_active', true)

  const totalLessonsCount = allLessons?.length || 0

  const { data: completedProgress } = await supabase
    .from('lesson_progress')
    .select('id')
    .eq('user_id', user.id)
    .eq('course_id', course_id)
    .eq('is_completed', true)

  const completedCount = completedProgress?.length || 0
  const isCourseComplete = totalLessonsCount > 0 && completedCount >= totalLessonsCount

  let certificateCode = null

  // 4. Issue Certificate if course completed
  if (isCourseComplete) {
    await supabase
      .from('enrollments')
      .update({ completed_at: new Date().toISOString() })
      .eq('id', enrollment.id)

    // Check if certificate already exists
    const { data: existingCert } = await supabase
      .from('certificates')
      .select('certificate_code')
      .eq('user_id', user.id)
      .eq('course_id', course_id)
      .maybeSingle()

    if (existingCert) {
      certificateCode = existingCert.certificate_code
    } else {
      const randomCert = 'MIO-CERT-' + Math.random().toString(36).substring(2, 9).toUpperCase()
      const { data: newCert } = await supabase
        .from('certificates')
        .insert({
          certificate_code: randomCert,
          user_id: user.id,
          course_id: course_id
        })
        .select()
        .single()

      if (newCert) certificateCode = newCert.certificate_code
    }
  }

  return {
    success: true,
    completed_count: completedCount,
    total_count: totalLessonsCount,
    is_course_complete: isCourseComplete,
    certificate_code: certificateCode,
    message: isCourseComplete
      ? 'Selamat! Anda telah menyelesaikan seluruh materi kursus dan mendapatkan sertifikat kelulusan!'
      : 'Pelajaran berhasil diselesaikan!'
  }
})
