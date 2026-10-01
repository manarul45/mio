import { getAdminSupabaseClient } from '~/server/utils/supabaseAdmin'
import { getAuthenticatedUserId } from '~/server/utils/authHelper'
import { computeLockState, getUserProgressIds } from '~/server/utils/learningProgress'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  if (!slug) {
    throw createError({ statusCode: 400, statusMessage: 'Slug kursus diperlukan' })
  }

  const client = getAdminSupabaseClient(event)
  const userId = await getAuthenticatedUserId(event)
  if (!userId) {
    throw createError({ statusCode: 401, statusMessage: 'Silakan masuk terlebih dahulu.' })
  }

  const { data, error } = await client
    .from('courses')
    .select(`
      *,
      categories:category_id(name),
      profiles:instructor_id(id, name, avatar_url),
      sections:course_sections(
        id,
        title,
        description,
        sort_order,
        kitab_url,
        ebook_url,
        lessons(
          id,
          title,
          slug,
          youtube_video_id,
          duration_seconds,
          is_preview,
          is_active,
          sort_order,
          description
        ),
        quizzes(
          id,
          title,
          slug,
          passing_score,
          time_limit_minutes,
          sort_order,
          is_active,
          quiz_questions(
            id,
            quiz_id,
            question_text,
            explanation,
            points,
            sort_order,
            quiz_options(
              id,
              question_id,
              option_text,
              is_correct,
              sort_order
            )
          )
        )
      )
    `)
    .eq('slug', slug)
    .single()

  if (error || !data) {
    throw createError({ statusCode: 404, statusMessage: 'Kursus ruang belajar tidak ditemukan' })
  }

  const [{ data: profile }, { data: enrollment }] = await Promise.all([
    client.from('profiles').select('role').eq('id', userId).maybeSingle(),
    client
      .from('enrollments')
      .select('id')
      .eq('user_id', userId)
      .eq('course_id', data.id)
      .eq('status', 'active')
      .maybeSingle(),
  ])

  const isAdmin = profile?.role === 'ADMIN' || profile?.role === 'SUPER_ADMIN'
  const isStaff = isAdmin || data.instructor_id === userId
  const isEnrolled = !!enrollment

  if (!isEnrolled && !isStaff) {
    throw createError({ statusCode: 403, statusMessage: 'Anda belum terdaftar di kursus ini.' })
  }

  ;(data as any).viewer = { is_enrolled: isEnrolled, is_staff: isStaff }

  // Sort sections and items
  if (data.sections) {
    data.sections.sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0))
    data.sections.forEach((sec: any) => {
      sec.lessons = (sec.lessons || []).filter((l: any) => l.is_active !== false)
      sec.quizzes = (sec.quizzes || []).filter((q: any) => q.is_active !== false)
      if (sec.lessons) {
        sec.lessons.sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0))
        sec.lessons.forEach((l: any) => {
          l.duration_minutes = l.duration_minutes || (l.duration_seconds ? Math.ceil(l.duration_seconds / 60) : 10)
        })
      }
      if (sec.quizzes) {
        sec.quizzes.sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0))
        sec.quizzes.forEach((qz: any) => {
          if (qz.quiz_questions) {
            qz.quiz_questions.sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0))
            qz.quiz_questions.forEach((qn: any) => {
              // Ensure compatibility for both question_text and question
              qn.question = qn.question_text
              if (qn.quiz_options) {
                qn.quiz_options.sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0))
                // Kunci jawaban tidak dikirim ke browser; penilaian dilakukan di /api/learning/submit-quiz.
                qn.quiz_options.forEach((o: any) => { delete o.is_correct })
              }
            })
          }
        })
      }
    })
  }

  // Urutan belajar: isi materi yang masih terkunci tidak dikirim ke browser.
  let completedLessonIds = new Set<number>()
  let passedQuizIds = new Set<number>()
  let certificateCode: string | null = null
  if (isEnrolled) {
    ;({ completedLessonIds, passedQuizIds } = await getUserProgressIds(client, userId))
    const { data: cert } = await client
      .from('certificates')
      .select('certificate_code')
      .eq('user_id', userId)
      .eq('course_id', data.id)
      .maybeSingle()
    certificateCode = cert?.certificate_code || null
  }

  if (!isStaff) {
    const { lockedLessons, lockedQuizzes } = computeLockState(data.sections || [], completedLessonIds, passedQuizIds)
    ;(data.sections || []).forEach((sec: any) => {
      sec.lessons.forEach((l: any) => {
        l.is_locked = lockedLessons.has(l.id)
        if (l.is_locked) {
          l.lock_reason = lockedLessons.get(l.id)
          l.youtube_video_id = null
          l.description = null
        }
      })
      sec.quizzes.forEach((q: any) => {
        q.is_locked = lockedQuizzes.has(q.id)
        if (q.is_locked) {
          q.lock_reason = lockedQuizzes.get(q.id)
          q.quiz_questions = []
        }
      })
      const sectionLocked = sec.lessons.length + sec.quizzes.length > 0
        && sec.lessons.every((l: any) => l.is_locked)
        && sec.quizzes.every((q: any) => q.is_locked)
      if (sectionLocked) {
        sec.kitab_url = null
        sec.ebook_url = null
      }
    })
  }

  const sections = (data.sections || []) as any[]
  const courseLessonIds = new Set(sections.flatMap((sec) => sec.lessons.map((l: any) => l.id)))
  const courseQuizIds = new Set(sections.flatMap((sec) => sec.quizzes.map((q: any) => q.id)))
  ;(data as any).viewer.completed_lesson_ids = [...completedLessonIds].filter((id) => courseLessonIds.has(id))
  ;(data as any).viewer.passed_quiz_ids = [...passedQuizIds].filter((id) => courseQuizIds.has(id))
  ;(data as any).viewer.certificate_code = certificateCode

  return data
})
