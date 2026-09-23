import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'
import { parseMySqlDump } from '~/server/utils/mysqlParser'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Sesi login tidak sah. Harap login sebagai Admin.' })
  }

  const supabase = await serverSupabaseClient(event)

  // Verify Admin role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || (profile.role !== 'ADMIN' && profile.role !== 'SUPER_ADMIN')) {
    throw createError({ statusCode: 403, statusMessage: 'Hanya Admin atau Super Admin yang diizinkan mengimpor database.' })
  }

  const body = await readBody(event)
  const { sql_content } = body

  if (!sql_content || typeof sql_content !== 'string' || sql_content.trim().length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'Konten file SQL tidak boleh kosong.' })
  }

  const tableDataMap = parseMySqlDump(sql_content)

  const summary: Record<string, number> = {}
  const logs: string[] = []

  // ID Maps
  const userIdMap = new Map<number | string, string>()
  const categoryIdMap = new Map<number | string, number>()
  const courseIdMap = new Map<number | string, number>()
  const sectionIdMap = new Map<number | string, number>()
  const quizIdMap = new Map<number | string, number>()
  const questionIdMap = new Map<number | string, number>()

  // Default admin UUID for courses if instructor not found
  userIdMap.set('default', user.id)

  function parseJsonSafe(val: any, fallback = []) {
    if (!val) return fallback
    if (typeof val === 'object') return val
    try {
      return JSON.parse(val)
    } catch {
      return fallback
    }
  }

  try {
    // 1. CATEGORIES
    const categoriesRows = tableDataMap.get('categories') || []
    if (categoriesRows.length > 0) {
      let catCount = 0
      for (const row of categoriesRows) {
        const { data, error } = await supabase
          .from('categories')
          .insert({
            name: row.name,
            slug: row.slug,
            description: row.description || null,
            image_url: row.image || null,
            sort_order: Number(row.sort_order) || 0,
            is_active: row.is_active !== undefined ? Boolean(Number(row.is_active)) : true
          })
          .select('id')
          .single()

        if (data) {
          categoryIdMap.set(row.id, data.id)
          catCount++
        } else if (error) {
          const { data: exist } = await supabase.from('categories').select('id').eq('slug', row.slug).single()
          if (exist) {
            categoryIdMap.set(row.id, exist.id)
            catCount++
          }
        }
      }
      summary.categories = catCount
      logs.push(`Berhasil mengimpor ${catCount} kategori.`)
    }

    // Default category if needed
    const defaultCategoryId = Array.from(categoryIdMap.values())[0] || null

    // 2. COURSES
    const coursesRows = tableDataMap.get('courses') || []
    if (coursesRows.length > 0) {
      let courseCount = 0
      for (const row of coursesRows) {
        const catId = categoryIdMap.get(row.category_id) || defaultCategoryId
        if (!catId) continue

        const { data, error } = await supabase
          .from('courses')
          .insert({
            title: row.title,
            slug: row.slug,
            subtitle: row.subtitle || null,
            description: row.description || null,
            thumbnail_url: row.thumbnail || null,
            preview_video_id: row.preview_video_id || null,
            level: row.level || 'all_levels',
            language: row.language || 'id',
            price: Number(row.price) || 0,
            discount_price: row.discount_price ? Number(row.discount_price) : null,
            learning_objectives: parseJsonSafe(row.learning_objectives),
            requirements: parseJsonSafe(row.requirements),
            target_audience: parseJsonSafe(row.target_audience),
            whatsapp_group_url: row.whatsapp_group_url || null,
            whatsapp_contact_url: row.whatsapp_contact_url || null,
            telegram_url: row.telegram_url || null,
            status: row.status || 'published',
            moderation_notes: row.moderation_notes || null,
            published_at: row.published_at || new Date().toISOString(),
            instructor_id: user.id, // Assigned to active admin
            category_id: catId
          })
          .select('id')
          .single()

        if (data) {
          courseIdMap.set(row.id, data.id)
          courseCount++
        } else if (error) {
          const { data: exist } = await supabase.from('courses').select('id').eq('slug', row.slug).single()
          if (exist) {
            courseIdMap.set(row.id, exist.id)
            courseCount++
          }
        }
      }
      summary.courses = courseCount
      logs.push(`Berhasil mengimpor ${courseCount} kursus.`)
    }

    // 3. SECTIONS
    const sectionsRows = tableDataMap.get('sections') || tableDataMap.get('course_sections') || []
    if (sectionsRows.length > 0) {
      let secCount = 0
      for (const row of sectionsRows) {
        const supabaseCourseId = courseIdMap.get(row.course_id)
        if (!supabaseCourseId) continue

        const { data } = await supabase
          .from('course_sections')
          .insert({
            course_id: supabaseCourseId,
            title: row.title,
            description: row.description || null,
            sort_order: Number(row.sort_order) || 0
          })
          .select('id')
          .single()

        if (data) {
          sectionIdMap.set(row.id, data.id)
          secCount++
        }
      }
      summary.sections = secCount
      logs.push(`Berhasil mengimpor ${secCount} modul kurikulum.`)
    }

    // 4. LESSONS
    const lessonsRows = tableDataMap.get('lessons') || []
    if (lessonsRows.length > 0) {
      let lsnCount = 0
      for (const row of lessonsRows) {
        const supabaseSectionId = sectionIdMap.get(row.section_id)
        if (!supabaseSectionId) continue

        const { data } = await supabase
          .from('lessons')
          .insert({
            section_id: supabaseSectionId,
            title: row.title,
            slug: row.slug || `lesson-${row.id}`,
            description: row.description || null,
            youtube_video_id: row.youtube_video_id || '',
            duration_seconds: Number(row.duration_seconds) || 0,
            sort_order: Number(row.sort_order) || 0,
            is_preview: row.is_preview !== undefined ? Boolean(Number(row.is_preview)) : false,
            is_active: row.is_active !== undefined ? Boolean(Number(row.is_active)) : true
          })
          .select('id')
          .single()

        if (data) lsnCount++
      }
      summary.lessons = lsnCount
      logs.push(`Berhasil mengimpor ${lsnCount} materi pelajaran (lessons).`)
    }

    // 5. QUIZZES
    const quizzesRows = tableDataMap.get('quizzes') || []
    if (quizzesRows.length > 0) {
      let qzCount = 0
      for (const row of quizzesRows) {
        const supabaseSectionId = sectionIdMap.get(row.section_id)
        if (!supabaseSectionId) continue

        const { data } = await supabase
          .from('quizzes')
          .insert({
            section_id: supabaseSectionId,
            title: row.title,
            slug: row.slug || `quiz-${row.id}`,
            description: row.description || null,
            passing_score: Number(row.passing_score) || 70,
            time_limit_minutes: Number(row.time_limit_minutes) || 0,
            max_attempts: Number(row.max_attempts) || 0,
            sort_order: Number(row.sort_order) || 0,
            is_active: row.is_active !== undefined ? Boolean(Number(row.is_active)) : true
          })
          .select('id')
          .single()

        if (data) {
          quizIdMap.set(row.id, data.id)
          qzCount++
        }
      }
      summary.quizzes = qzCount
      logs.push(`Berhasil mengimpor ${qzCount} kuis.`)
    }

    // 6. QUIZ QUESTIONS & OPTIONS
    const questionsRows = tableDataMap.get('quiz_questions') || []
    if (questionsRows.length > 0) {
      let qqCount = 0
      for (const row of questionsRows) {
        const supabaseQuizId = quizIdMap.get(row.quiz_id)
        if (!supabaseQuizId) continue

        const { data } = await supabase
          .from('quiz_questions')
          .insert({
            quiz_id: supabaseQuizId,
            question_text: row.question_text,
            explanation: row.explanation || null,
            question_type: row.question_type || 'single_choice',
            points: Number(row.points) || 10,
            sort_order: Number(row.sort_order) || 0,
            media_type: row.media_type || null,
            media_url: row.media_url || null
          })
          .select('id')
          .single()

        if (data) {
          questionIdMap.set(row.id, data.id)
          qqCount++
        }
      }
      summary.quiz_questions = qqCount

      // Options
      const optionsRows = tableDataMap.get('quiz_options') || []
      let optCount = 0
      for (const row of optionsRows) {
        const supabaseQuestionId = questionIdMap.get(row.question_id)
        if (!supabaseQuestionId) continue

        const { data } = await supabase
          .from('quiz_options')
          .insert({
            question_id: supabaseQuestionId,
            option_text: row.option_text,
            is_correct: row.is_correct !== undefined ? Boolean(Number(row.is_correct)) : false,
            sort_order: Number(row.sort_order) || 0,
            media_url: row.media_url || null
          })
          .select('id')
          .single()

        if (data) optCount++
      }
      summary.quiz_options = optCount
      logs.push(`Berhasil mengimpor ${qqCount} soal pertanyaan dan ${optCount} opsi jawaban.`)
    }

    // 7. VOUCHERS
    const vouchersRows = tableDataMap.get('vouchers') || []
    if (vouchersRows.length > 0) {
      let vCount = 0
      for (const row of vouchersRows) {
        await supabase
          .from('vouchers')
          .upsert({
            code: row.code.toUpperCase(),
            name: row.name,
            type: row.type || 'fixed',
            discount_amount: Number(row.discount_amount),
            min_order_amount: Number(row.min_order_amount) || 0,
            max_discount_amount: row.max_discount_amount ? Number(row.max_discount_amount) : null,
            usage_limit: row.usage_limit ? Number(row.usage_limit) : null,
            used_count: Number(row.used_count) || 0,
            expires_at: row.expires_at || null,
            is_active: row.is_active !== undefined ? Boolean(Number(row.is_active)) : true
          }, { onConflict: 'code' })
        vCount++
      }
      summary.vouchers = vCount
      logs.push(`Berhasil mengimpor ${vCount} kode voucher.`)
    }

    // 8. SETTINGS
    const settingsRows = tableDataMap.get('settings') || []
    if (settingsRows.length > 0) {
      let sCount = 0
      for (const row of settingsRows) {
        await supabase
          .from('settings')
          .upsert({
            key: row.key,
            value: row.value,
            type: row.type || 'string'
          }, { onConflict: 'key' })
        sCount++
      }
      summary.settings = sCount
      logs.push(`Berhasil mengimpor ${sCount} pengaturan sistem.`)
    }

    return {
      success: true,
      summary,
      logs,
      detected_tables: Array.from(tableDataMap.keys())
    }
  } catch (err: any) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Gagal memproses import SQL: ' + err.message
    })
  }
})
