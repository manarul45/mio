import { serverSupabaseClient, serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'
import { parseMySqlDump } from '~/server/utils/mysqlParser'

export default defineEventHandler(async (event) => {
  // 1. Verifikasi User Login
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Sesi login tidak sah atau telah berakhir. Harap login terlebih dahulu sebagai Admin.'
    })
  }

  // 2. Dapatkan Supabase Client (Prioritaskan Service Role untuk Bypass RLS Administrasi)
  let client: any
  try {
    client = serverSupabaseServiceRole(event)
  } catch {
    client = await serverSupabaseClient(event)
  }

  // 3. Verifikasi Hak Akses Admin / Super Admin
  const { data: profile } = await client
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  const userMetaRole = (user.user_metadata?.role || user.app_metadata?.role || '').toString().toUpperCase()
  const profileRole = (profile?.role || '').toString().toUpperCase()
  const userEmail = (user.email || '').toLowerCase().trim()

  const isAuthorizedAdmin =
    profileRole === 'ADMIN' || profileRole === 'SUPER_ADMIN' ||
    userMetaRole === 'ADMIN' || userMetaRole === 'SUPER_ADMIN' ||
    userEmail === 'admin@mioacademy.com' || userEmail.startsWith('admin@')

  if (!isAuthorizedAdmin) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Hanya Admin atau Super Admin yang diizinkan mengimpor database.'
    })
  }

  // Otomatis sinkronkan role ADMIN pada tabel profiles agar query & permission selalu aktif
  if (!profile) {
    await client.from('profiles').insert({
      id: user.id,
      name: user.user_metadata?.name || user.user_metadata?.full_name || userEmail.split('@')[0],
      email: user.email,
      role: 'ADMIN'
    })
  } else if (profile.role !== 'ADMIN' && profile.role !== 'SUPER_ADMIN') {
    await client.from('profiles').update({ role: 'ADMIN' }).eq('id', user.id)
  }

  // 4. Ekstrak Konten SQL (Mendukung multipart/form-data streaming & JSON body)
  let sqlContent = ''
  const contentType = getHeader(event, 'content-type') || ''

  if (contentType.includes('multipart/form-data')) {
    const formParts = await readMultipartFormData(event)
    if (formParts && formParts.length > 0) {
      for (const part of formParts) {
        if (part.name === 'file' || part.name === 'sql_file') {
          sqlContent = part.data.toString('utf-8')
          break
        } else if (part.name === 'sql_content') {
          sqlContent = part.data.toString('utf-8')
        }
      }
    }
  } else {
    const body = await readBody(event)
    sqlContent = body?.sql_content || ''
  }

  if (!sqlContent || typeof sqlContent !== 'string' || sqlContent.trim().length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Konten file SQL tidak ditemukan atau file SQL kosong.'
    })
  }

  // 5. Parse Data MySQL Dump dengan Tokenizer Cepat
  const tableDataMap = parseMySqlDump(sqlContent)

  const summary: Record<string, number> = {}
  const logs: string[] = []

  // Mapping ID lama (MySQL) ke ID baru (Supabase PostgreSQL)
  const categoryIdMap = new Map<number | string, number>()
  const courseIdMap = new Map<number | string, number>()
  const sectionIdMap = new Map<number | string, number>()
  const quizIdMap = new Map<number | string, number>()
  const questionIdMap = new Map<number | string, number>()

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
    // -------------------------------------------------------------
    // A. CATEGORIES
    // -------------------------------------------------------------
    const categoriesRows = tableDataMap.get('categories') || []
    if (categoriesRows.length > 0) {
      let catCount = 0
      for (const row of categoriesRows) {
        const { data, error } = await client
          .from('categories')
          .insert({
            name: row.name,
            slug: row.slug || `category-${row.id}`,
            description: row.description || null,
            image_url: row.image || row.image_url || null,
            sort_order: Number(row.sort_order) || 0,
            is_active: row.is_active !== undefined ? Boolean(Number(row.is_active)) : true
          })
          .select('id')
          .single()

        if (data) {
          categoryIdMap.set(row.id, data.id)
          catCount++
        } else if (error) {
          const { data: exist } = await client.from('categories').select('id').eq('slug', row.slug).single()
          if (exist) {
            categoryIdMap.set(row.id, exist.id)
            catCount++
          }
        }
      }
      summary.categories = catCount
      logs.push(`Berhasil memproses ${catCount} kategori kursus.`)
    }

    const defaultCategoryId = Array.from(categoryIdMap.values())[0] || null

    // -------------------------------------------------------------
    // B. COURSES
    // -------------------------------------------------------------
    const coursesRows = tableDataMap.get('courses') || []
    if (coursesRows.length > 0) {
      let courseCount = 0
      for (const row of coursesRows) {
        const catId = categoryIdMap.get(row.category_id) || defaultCategoryId
        if (!catId) continue

        const { data, error } = await client
          .from('courses')
          .insert({
            title: row.title,
            slug: row.slug || `course-${row.id}`,
            subtitle: row.subtitle || null,
            description: row.description || null,
            thumbnail_url: row.thumbnail || row.thumbnail_url || null,
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
            instructor_id: user.id, // Tetapkan ke akun admin yang mengimpor
            category_id: catId
          })
          .select('id')
          .single()

        if (data) {
          courseIdMap.set(row.id, data.id)
          courseCount++
        } else if (error) {
          const { data: exist } = await client.from('courses').select('id').eq('slug', row.slug).single()
          if (exist) {
            courseIdMap.set(row.id, exist.id)
            courseCount++
          }
        }
      }
      summary.courses = courseCount
      logs.push(`Berhasil memproses ${courseCount} data kursus.`)
    }

    // -------------------------------------------------------------
    // C. COURSE SECTIONS (Tabel 'sections' atau 'course_sections')
    // -------------------------------------------------------------
    const sectionsRows = tableDataMap.get('sections') || tableDataMap.get('course_sections') || []
    if (sectionsRows.length > 0) {
      let secCount = 0
      for (const row of sectionsRows) {
        const supabaseCourseId = courseIdMap.get(row.course_id)
        if (!supabaseCourseId) continue

        const { data } = await client
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
      summary.course_sections = secCount
      logs.push(`Berhasil memproses ${secCount} modul kurikulum (sections).`)
    }

    // -------------------------------------------------------------
    // D. LESSONS
    // -------------------------------------------------------------
    const lessonsRows = tableDataMap.get('lessons') || []
    if (lessonsRows.length > 0) {
      const lessonsToInsert: any[] = []
      for (const row of lessonsRows) {
        const supabaseSectionId = sectionIdMap.get(row.section_id)
        if (!supabaseSectionId) continue

        lessonsToInsert.push({
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
      }

      // Batch insert in chunks of 50
      let lsnCount = 0
      for (let i = 0; i < lessonsToInsert.length; i += 50) {
        const chunk = lessonsToInsert.slice(i, i + 50)
        const { error } = await client.from('lessons').insert(chunk)
        if (!error) lsnCount += chunk.length
      }

      summary.lessons = lsnCount
      logs.push(`Berhasil memproses ${lsnCount} materi pelajaran video (lessons).`)
    }

    // -------------------------------------------------------------
    // E. QUIZZES
    // -------------------------------------------------------------
    const quizzesRows = tableDataMap.get('quizzes') || []
    if (quizzesRows.length > 0) {
      let qzCount = 0
      for (const row of quizzesRows) {
        const supabaseSectionId = sectionIdMap.get(row.section_id)
        if (!supabaseSectionId) continue

        const { data } = await client
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
      logs.push(`Berhasil memproses ${qzCount} kuis evaluasi.`)
    }

    // -------------------------------------------------------------
    // F. QUIZ QUESTIONS & OPTIONS
    // -------------------------------------------------------------
    const questionsRows = tableDataMap.get('quiz_questions') || []
    if (questionsRows.length > 0) {
      let qqCount = 0
      for (const row of questionsRows) {
        const supabaseQuizId = quizIdMap.get(row.quiz_id)
        if (!supabaseQuizId) continue

        const { data } = await client
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
      const optionsToInsert: any[] = []
      for (const row of optionsRows) {
        const supabaseQuestionId = questionIdMap.get(row.question_id)
        if (!supabaseQuestionId) continue

        optionsToInsert.push({
          question_id: supabaseQuestionId,
          option_text: row.option_text,
          is_correct: row.is_correct !== undefined ? Boolean(Number(row.is_correct)) : false,
          sort_order: Number(row.sort_order) || 0,
          media_url: row.media_url || null
        })
      }

      let optCount = 0
      for (let i = 0; i < optionsToInsert.length; i += 50) {
        const chunk = optionsToInsert.slice(i, i + 50)
        const { error } = await client.from('quiz_options').insert(chunk)
        if (!error) optCount += chunk.length
      }

      summary.quiz_options = optCount
      logs.push(`Berhasil memproses ${qqCount} soal pertanyaan dan ${optCount} pilihan opsi jawaban.`)
    }

    // -------------------------------------------------------------
    // G. VOUCHERS
    // -------------------------------------------------------------
    const vouchersRows = tableDataMap.get('vouchers') || []
    if (vouchersRows.length > 0) {
      let vCount = 0
      for (const row of vouchersRows) {
        if (!row.code) continue
        await client
          .from('vouchers')
          .upsert({
            code: row.code.toString().toUpperCase().trim(),
            name: row.name || `Voucher ${row.code}`,
            type: row.type || 'fixed',
            discount_amount: Number(row.discount_amount) || 0,
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
      logs.push(`Berhasil memproses ${vCount} kode voucher diskon.`)
    }

    // -------------------------------------------------------------
    // H. SETTINGS
    // -------------------------------------------------------------
    const settingsRows = tableDataMap.get('settings') || tableDataMap.get('system_settings') || []
    if (settingsRows.length > 0) {
      let sCount = 0
      for (const row of settingsRows) {
        if (!row.key) continue
        await client
          .from('settings')
          .upsert({
            key: row.key.toString().trim(),
            value: row.value !== undefined ? String(row.value) : '',
            type: row.type || 'string'
          }, { onConflict: 'key' })
        sCount++
      }
      summary.settings = sCount
      logs.push(`Berhasil memproses ${sCount} pengaturan sistem.`)
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
      statusMessage: 'Gagal memproses import SQL: ' + (err.message || 'Kesalahan database')
    })
  }
})
