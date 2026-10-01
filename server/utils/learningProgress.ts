import type { H3Event } from 'h3'
import { getAdminSupabaseClient } from '~/server/utils/supabaseAdmin'
import { getAuthenticatedUserId } from '~/server/utils/authHelper'

type AdminClient = ReturnType<typeof getAdminSupabaseClient>

/**
 * Pastikan pemanggil login dan terdaftar aktif di kursus.
 * Penulisan memakai kunci server, jadi siswa tidak perlu izin tulis langsung ke tabel progres.
 */
export async function requireActiveEnrollment(event: H3Event, courseId: number) {
  const client = getAdminSupabaseClient(event)
  const userId = await getAuthenticatedUserId(event)
  if (!userId) {
    throw createError({ statusCode: 401, statusMessage: 'Silakan masuk terlebih dahulu.' })
  }

  const { data: enrollment } = await client
    .from('enrollments')
    .select('id, completed_at')
    .eq('user_id', userId)
    .eq('course_id', courseId)
    .eq('status', 'active')
    .maybeSingle()

  if (!enrollment) {
    throw createError({ statusCode: 403, statusMessage: 'Anda tidak memiliki akses aktif ke kursus ini.' })
  }

  return { client, userId, enrollment }
}

export const LOCK_REASON_PREVIOUS_QUIZ = 'Lulus latihan sebelumnya terlebih dahulu.'
export const LOCK_REASON_PREVIOUS_SECTION = 'Selesaikan semua video pada bab sebelumnya terlebih dahulu.'
export const LOCK_REASON_QUIZ = 'Tandai selesai semua video sebelum latihan ini terlebih dahulu.'

/**
 * Aturan urutan belajar (berlaku untuk semua kursus), dibaca berurutan dari bab pertama:
 * - Setiap latihan adalah gerbang: semua materi sesudahnya terkunci sampai latihan itu lulus.
 * - Latihan terbuka setelah semua video sejak latihan sebelumnya ditandai selesai.
 * - Bab tanpa latihan menjadi gerbang lewat videonya: bab berikutnya terbuka jika semua videonya selesai.
 * - Video di antara dua latihan bebas dibuka dalam urutan apa pun.
 * - Materi yang sudah pernah selesai/lulus dan video pratinjau selalu terbuka.
 * `sections` harus sudah terurut; item di dalamnya diurutkan di sini.
 */
export function computeLockState(
  sections: any[],
  completedLessonIds: Set<number>,
  passedQuizIds: Set<number>,
) {
  const lockedLessons = new Map<number, string>()
  const lockedQuizzes = new Map<number, string>()
  let gateReason: string | null = null
  let lessonsSinceLastQuizDone = true

  for (const section of sections) {
    const items = [
      ...(section.lessons || []).filter((l: any) => l.is_active !== false).map((l: any) => ({ ...l, item_type: 'lesson' })),
      ...(section.quizzes || []).filter((q: any) => q.is_active !== false).map((q: any) => ({ ...q, item_type: 'quiz' })),
    ].sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0))

    for (const item of items) {
      if (item.item_type === 'lesson') {
        const done = completedLessonIds.has(item.id)
        if (gateReason && !done && !item.is_preview) lockedLessons.set(item.id, gateReason)
        if (!done) lessonsSinceLastQuizDone = false
        continue
      }

      if (!passedQuizIds.has(item.id)) {
        if (gateReason) lockedQuizzes.set(item.id, gateReason)
        else if (!lessonsSinceLastQuizDone) lockedQuizzes.set(item.id, LOCK_REASON_QUIZ)
        gateReason ||= LOCK_REASON_PREVIOUS_QUIZ
      }
      lessonsSinceLastQuizDone = true
    }

    const hasQuiz = items.some((i: any) => i.item_type === 'quiz')
    if (!hasQuiz && !items.every((l: any) => completedLessonIds.has(l.id))) {
      gateReason ||= LOCK_REASON_PREVIOUS_SECTION
    }
  }

  return { lockedLessons, lockedQuizzes }
}

/** Sengaja tidak difilter per course_id: catatan progres lama ada yang tersimpan tanpa course_id. */
export async function getUserProgressIds(client: AdminClient, userId: string) {
  const [{ data: lessons }, { data: quizzes }] = await Promise.all([
    client.from('lesson_progress').select('lesson_id').eq('user_id', userId).eq('is_completed', true),
    client.from('quiz_attempts').select('quiz_id').eq('user_id', userId).eq('passed', true),
  ])
  return {
    completedLessonIds: new Set<number>((lessons || []).map((p: any) => p.lesson_id)),
    passedQuizIds: new Set<number>((quizzes || []).map((a: any) => a.quiz_id)),
  }
}

/** Status kunci kursus untuk satu peserta, dipakai saat menyimpan progres/kuis. */
export async function getCourseLockState(client: AdminClient, userId: string, courseId: number) {
  const [{ data: sections }, progress] = await Promise.all([
    client
      .from('course_sections')
      .select('id, sort_order, lessons(id, sort_order, is_active, is_preview), quizzes(id, sort_order, is_active)')
      .eq('course_id', courseId)
      .order('sort_order', { ascending: true }),
    getUserProgressIds(client, userId),
  ])
  return computeLockState(sections || [], progress.completedLessonIds, progress.passedQuizIds)
}

/**
 * Hitung ulang persentase progres dari pelajaran selesai + kuis lulus,
 * simpan ke enrollments, dan terbitkan sertifikat saat mencapai 100%.
 */
export async function recalculateProgress(
  client: AdminClient,
  userId: string,
  courseId: number,
  enrollment: { id: number; completed_at: string | null },
) {
  const { data: sections } = await client
    .from('course_sections')
    .select('lessons(id, is_active), quizzes(id, is_active)')
    .eq('course_id', courseId)

  const lessonIds: number[] = []
  const quizIds: number[] = []
  for (const section of (sections || []) as any[]) {
    for (const lesson of section.lessons || []) {
      if (lesson.is_active !== false) lessonIds.push(lesson.id)
    }
    for (const quiz of section.quizzes || []) {
      if (quiz.is_active !== false) quizIds.push(quiz.id)
    }
  }

  let completedLessons = 0
  if (lessonIds.length) {
    const { data } = await client
      .from('lesson_progress')
      .select('lesson_id')
      .eq('user_id', userId)
      .eq('is_completed', true)
      .in('lesson_id', lessonIds)
    completedLessons = new Set((data || []).map((p: any) => p.lesson_id)).size
  }

  let passedQuizzes = 0
  if (quizIds.length) {
    const { data } = await client
      .from('quiz_attempts')
      .select('quiz_id')
      .eq('user_id', userId)
      .eq('passed', true)
      .in('quiz_id', quizIds)
    passedQuizzes = new Set((data || []).map((a: any) => a.quiz_id)).size
  }

  const totalItems = lessonIds.length + quizIds.length
  const progressPercentage = totalItems
    ? Math.min(100, Math.round(((completedLessons + passedQuizzes) / totalItems) * 100))
    : 0
  const isCourseComplete = totalItems > 0 && progressPercentage === 100
  const now = new Date().toISOString()

  await client
    .from('enrollments')
    .update({
      progress_percentage: progressPercentage,
      completed_at: isCourseComplete ? (enrollment.completed_at || now) : null,
      updated_at: now,
    })
    .eq('id', enrollment.id)

  let certificateCode: string | null = null
  if (isCourseComplete) {
    const { data: existingCert } = await client
      .from('certificates')
      .select('certificate_code')
      .eq('user_id', userId)
      .eq('course_id', courseId)
      .maybeSingle()

    if (existingCert) {
      certificateCode = existingCert.certificate_code
    } else {
      const code = 'MIO-CERT-' + Math.random().toString(36).substring(2, 9).toUpperCase()
      const { data: newCert } = await client
        .from('certificates')
        .insert({ certificate_code: code, user_id: userId, course_id: courseId })
        .select('certificate_code')
        .single()
      certificateCode = newCert?.certificate_code || null
    }
  }

  return {
    progress_percentage: progressPercentage,
    is_course_complete: isCourseComplete,
    certificate_code: certificateCode,
  }
}
