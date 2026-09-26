import { QuizWriteError, buildOptionRows, extractYouTubeId, slugifyTitle } from '~/server/utils/quizContent'

type DbClient = {
  from: (table: string) => any
}

function dbFail(error: { message?: string } | null, fallback: string) {
  if (!error) return
  throw new QuizWriteError(error.message || fallback, 500)
}

export async function insertQuestions(
  client: DbClient,
  quizId: number,
  questions: any[],
  fromImport: boolean,
) {
  const prepared: Array<{ text: string; explanation: string | null; sort_order: number; options: any[] }> = []

  for (let i = 0; i < questions.length; i++) {
    const question = questions[i]
    const text = String(question?.question || question?.question_text || '').trim()
    if (!text) continue
    prepared.push({
      text,
      explanation: question?.explanation ? String(question.explanation) : null,
      sort_order: prepared.length + 1,
      options: buildOptionRows(question, fromImport),
    })
  }

  if (fromImport && prepared.length === 0) {
    throw new QuizWriteError('Kuis tidak punya soal yang bisa disimpan.')
  }
  if (prepared.length === 0) return

  const { data: inserted, error } = await client
    .from('quiz_questions')
    .insert(prepared.map(question => ({
      quiz_id: quizId,
      question_text: question.text,
      explanation: question.explanation,
      sort_order: question.sort_order,
    })))
    .select('id, sort_order')

  dbFail(error, 'Gagal menyimpan soal')
  if (!inserted || inserted.length !== prepared.length) {
    throw new QuizWriteError('Soal tidak tersimpan lengkap.', 500)
  }

  const idByOrder = new Map<number, number>(inserted.map((row: any) => [row.sort_order, row.id]))
  const optionRows: any[] = []
  for (const question of prepared) {
    const questionId = idByOrder.get(question.sort_order)
    if (!questionId) throw new QuizWriteError('Soal tidak tersimpan lengkap.', 500)
    for (const option of question.options) {
      optionRows.push({
        question_id: questionId,
        option_text: option.option_text,
        is_correct: option.is_correct,
        sort_order: option.sort_order,
      })
    }
  }

  for (let i = 0; i < optionRows.length; i += 200) {
    const { error: optionError } = await client.from('quiz_options').insert(optionRows.slice(i, i + 200))
    dbFail(optionError, 'Gagal menyimpan pilihan jawaban')
  }
}

export async function saveQuizRecord(client: DbClient, input: {
  sectionId: number
  quizId?: number | null
  title: string
  passingScore?: number
  sortOrder?: number
  description?: string | null
  timeLimitMinutes?: number
  questions: any[]
  fromImport: boolean
}) {
  const title = String(input.title || '').trim() || 'Kuis Evaluasi'
  const passingScore = Number(input.passingScore)
  const payload = {
    title,
    passing_score: Number.isFinite(passingScore) ? passingScore : 80,
    description: input.description || null,
    time_limit_minutes: Number(input.timeLimitMinutes) || 0,
  }

  let quizId = input.quizId || null
  if (quizId) {
    const { error } = await client.from('quizzes').update(payload).eq('id', quizId)
    dbFail(error, 'Gagal memperbarui kuis')
    const { error: deleteError } = await client.from('quiz_questions').delete().eq('quiz_id', quizId)
    dbFail(deleteError, 'Gagal memperbarui soal')
  } else {
    const { data, error } = await client
      .from('quizzes')
      .insert({
        ...payload,
        section_id: input.sectionId,
        slug: slugifyTitle(title),
        sort_order: input.sortOrder || 1,
      })
      .select('id')
      .single()
    dbFail(error, 'Gagal menyimpan kuis')
    quizId = data.id
  }

  try {
    await insertQuestions(client, quizId as number, input.questions || [], input.fromImport)
  } catch (err) {
    if (!input.quizId) {
      await client.from('quizzes').delete().eq('id', quizId)
    } else {
      await client.from('quiz_questions').delete().eq('quiz_id', quizId)
    }
    throw err
  }

  return quizId as number
}

async function sectionCounts(client: DbClient, sectionId: number) {
  const [lessons, quizzes] = await Promise.all([
    client.from('lessons').select('id', { count: 'exact', head: true }).eq('section_id', sectionId),
    client.from('quizzes').select('id', { count: 'exact', head: true }).eq('section_id', sectionId),
  ])
  dbFail(lessons.error, 'Gagal memeriksa modul')
  dbFail(quizzes.error, 'Gagal memeriksa modul')
  return { lessons: lessons.count || 0, quizzes: quizzes.count || 0 }
}

function validateImport(sections: any[]) {
  if (!Array.isArray(sections)) {
    throw new QuizWriteError('Format JSON harus berupa array modul.')
  }

  for (const section of sections) {
    const quizzes = Array.isArray(section?.quizzes) ? section.quizzes : []
    for (const quiz of quizzes) {
      const questions = Array.isArray(quiz?.questions) ? quiz.questions : []
      const filled = questions.filter((question: any) => String(question?.question || question?.question_text || '').trim())
      if (filled.length === 0) {
        throw new QuizWriteError(`Kuis "${quiz?.title || 'Kuis Evaluasi'}" tidak punya soal.`)
      }
      for (const question of filled) buildOptionRows(question, true)
    }
  }
}

export async function importCurriculum(client: DbClient, courseId: string, sections: any[]) {
  validateImport(sections)

  let sectionCount = 0
  let quizCount = 0
  let questionCount = 0

  for (let sIdx = 0; sIdx < sections.length; sIdx++) {
    const section = sections[sIdx] || {}
    const title = String(section.title || `Modul ${sIdx + 1}`).trim()
    let sectionId: number | null = null
    let createdSection = false
    const createdQuizIds: number[] = []
    const createdLessonIds: number[] = []

    try {
      const { data: sameTitle, error: sameTitleError } = await client
        .from('course_sections')
        .select('id, sort_order')
        .eq('course_id', courseId)
        .eq('title', title)
      dbFail(sameTitleError, 'Gagal memeriksa modul')

      const emptyIds: number[] = []
      const filled: any[] = []
      for (const row of sameTitle || []) {
        const counts = await sectionCounts(client, row.id)
        if (counts.lessons === 0 && counts.quizzes === 0) emptyIds.push(row.id)
        else filled.push(row)
      }

      if (emptyIds.length > 0) {
        const { error: deleteEmptyError } = await client.from('course_sections').delete().in('id', emptyIds)
        dbFail(deleteEmptyError, 'Gagal menghapus modul kosong')
      }

      if (filled.length > 0) {
        filled.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
        sectionId = filled[0].id
        if (section.description) {
          await client.from('course_sections').update({ description: section.description }).eq('id', sectionId)
        }
      } else {
        const { data: created, error: createError } = await client
          .from('course_sections')
          .insert({
            course_id: courseId,
            title,
            description: section.description || '',
            sort_order: section.section_order || section.sort_order || sIdx + 1,
          })
          .select('id')
          .single()
        dbFail(createError, 'Gagal membuat modul')
        sectionId = created.id
        createdSection = true
      }

      if (Array.isArray(section.lessons)) {
        for (let lIdx = 0; lIdx < section.lessons.length; lIdx++) {
          const lesson = section.lessons[lIdx]
          const lessonTitle = String(lesson.title || `Pelajaran ${lIdx + 1}`).trim()
          const videoId = extractYouTubeId(lesson.youtube_url || lesson.youtube_video_id || '')
          if (!videoId) {
            throw new QuizWriteError(`Link YouTube untuk "${lessonTitle}" tidak dikenali.`)
          }
          const minutes = Number(lesson.duration_minutes) || 10
          const { data: lessonRow, error: lessonError } = await client
            .from('lessons')
            .insert({
              section_id: sectionId,
              title: lessonTitle,
              slug: slugifyTitle(lessonTitle),
              youtube_video_id: videoId,
              duration_seconds: Math.max(0, Math.round(minutes * 60)),
              is_preview: !!lesson.is_preview,
              description: lesson.description || '',
              sort_order: lIdx + 1,
            })
            .select('id')
            .single()
          dbFail(lessonError, 'Gagal menyimpan pelajaran')
          createdLessonIds.push(lessonRow.id)
        }
      }

      const { data: existingQuizzes, error: existingQuizError } = await client
        .from('quizzes')
        .select('id, title, sort_order')
        .eq('section_id', sectionId)
      dbFail(existingQuizError, 'Gagal memeriksa kuis')

      const quizzes = Array.isArray(section.quizzes) ? section.quizzes : []
      const replacedQuizIds: number[] = []
      let addedQuizzes = 0
      let addedQuestions = 0
      for (let qIdx = 0; qIdx < quizzes.length; qIdx++) {
        const quiz = quizzes[qIdx]
        const quizTitle = String(quiz.title || 'Kuis Evaluasi').trim()
        const previous = (existingQuizzes || []).filter((row: any) => row.title === quizTitle)
        const sortOrder = previous[0]?.sort_order ?? ((existingQuizzes?.length || 0) + createdQuizIds.length + 1)
        const questions = Array.isArray(quiz.questions) ? quiz.questions : []
        const quizId = await saveQuizRecord(client, {
          sectionId: sectionId as number,
          title: quizTitle,
          passingScore: quiz.passing_score ?? 80,
          sortOrder,
          description: quiz.description || null,
          timeLimitMinutes: quiz.time_limit_minutes,
          questions,
          fromImport: true,
        })
        createdQuizIds.push(quizId)
        replacedQuizIds.push(...previous.map((row: any) => row.id))
        addedQuizzes += 1
        addedQuestions += questions.filter((question: any) => String(question?.question || question?.question_text || '').trim()).length
      }

      if (replacedQuizIds.length > 0) {
        const { error: replaceError } = await client.from('quizzes').delete().in('id', replacedQuizIds)
        dbFail(replaceError, 'Gagal mengganti kuis lama')
      }

      sectionCount += 1
      quizCount += addedQuizzes
      questionCount += addedQuestions
    } catch (err) {
      if (createdSection && sectionId) {
        await client.from('course_sections').delete().eq('id', sectionId)
      } else {
        if (createdQuizIds.length > 0) {
          await client.from('quizzes').delete().in('id', createdQuizIds)
        }
        if (createdLessonIds.length > 0) {
          await client.from('lessons').delete().in('id', createdLessonIds)
        }
      }

      const message = err instanceof Error ? err.message : 'Gagal mengimpor kurikulum'
      const statusCode = err instanceof QuizWriteError ? err.statusCode : 500
      throw new QuizWriteError(
        `${message} Modul yang belum selesai tidak disimpan, supaya tidak tertumpuk kosong.`,
        statusCode,
      )
    }
  }

  return { sections: sectionCount, quizzes: quizCount, questions: questionCount }
}
