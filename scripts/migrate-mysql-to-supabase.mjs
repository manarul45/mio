/**
 * MIO ACADEMY - SCRIPT MIGRASI DATABASE MYSQL KE SUPABASE
 *
 * Cara Menjalankan:
 * node scripts/migrate-mysql-to-supabase.mjs [--database=nama_database_mysql]
 */

import mysql from 'mysql2/promise'
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

// Load .env
dotenv.config()

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// 1. Kredensial MySQL (Default Laragon)
const args = process.argv.slice(2)
const dbArg = args.find(a => a.startsWith('--database='))
const mysqlDatabase = dbArg ? dbArg.split('=')[1] : (process.env.MYSQL_DATABASE || 'appmio')

const mysqlConfig = {
  host: process.env.MYSQL_HOST || 'localhost',
  port: Number(process.env.MYSQL_PORT) || 3306,
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: mysqlDatabase
}

// 2. Kredensial Supabase
const supabaseUrl = process.env.SUPABASE_URL || process.env.NUXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY

if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('placeholder')) {
  console.error('\n❌ ERROR: SUPABASE_URL atau SUPABASE_SERVICE_ROLE_KEY belum diisi di file .env')
  console.error('Silakan isi kredensial Supabase Anda di file .env terlebih dahulu.\n')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// ID Mappings (MySQL ID -> Supabase ID)
const userIdMap = new Map()
const categoryIdMap = new Map()
const courseIdMap = new Map()
const sectionIdMap = new Map()
const lessonIdMap = new Map()
const quizIdMap = new Map()
const questionIdMap = new Map()

// Helper parse JSON safely
function parseJsonSafe(val, fallback = []) {
  if (!val) return fallback
  if (typeof val === 'object') return val
  try {
    return JSON.parse(val)
  } catch {
    return fallback
  }
}

async function runMigration() {
  console.log('=================================================================')
  console.log('🚀 MEMULAI MIGRASI DATA DARI MYSQL KE SUPABASE (MIO ACADEMY)')
  console.log(`📦 Sumber Database MySQL: ${mysqlConfig.database}@${mysqlConfig.host}:${mysqlConfig.port}`)
  console.log(`🌐 Target Supabase: ${supabaseUrl}`)
  console.log('=================================================================\n')

  let connection
  try {
    connection = await mysql.createConnection(mysqlConfig)
    console.log('✅ Berhasil terhubung ke database MySQL lokal!\n')
  } catch (err) {
    console.error(`❌ Gagal terhubung ke MySQL: ${err.message}`)
    console.error('Pastikan Laragon/MySQL Anda aktif dan nama database sesuai.\n')
    process.exit(1)
  }

  try {
    // -------------------------------------------------------------
    // TAHAP 1: USERS & PROFILES
    // -------------------------------------------------------------
    console.log('⏳ [1/10] Migrasi Akun Pengguna (Users)...')
    try {
      const [users] = await connection.query('SELECT * FROM users WHERE deleted_at IS NULL')
      console.log(`   Ditemukan ${users.length} user di MySQL.`)

      for (const u of users) {
        // Cek apakah user sudah terdaftar di Supabase Auth
        const { data: existingUsers } = await supabase.auth.admin.listUsers()
        const found = existingUsers?.users?.find(eu => eu.email?.toLowerCase() === u.email?.toLowerCase())

        let supabaseUid
        if (found) {
          supabaseUid = found.id
        } else {
          // Buat user baru di Supabase Auth
          const { data: created, error: createErr } = await supabase.auth.admin.createUser({
            email: u.email,
            password: 'Password123!', // Password default, user dapat reset nanti
            email_confirm: true,
            user_metadata: {
              name: u.name,
              whatsapp_number: u.whatsapp_number || null,
              role: u.role || 'STUDENT'
            }
          })

          if (createErr) {
            console.warn(`   ⚠️ Lewati user ${u.email}: ${createErr.message}`)
            continue
          }
          supabaseUid = created.user.id
        }

        userIdMap.set(u.id, supabaseUid)

        // Upsert ke public.profiles
        await supabase
          .from('profiles')
          .upsert({
            id: supabaseUid,
            name: u.name,
            email: u.email,
            whatsapp_number: u.whatsapp_number || null,
            avatar_url: u.avatar || null,
            headline: u.headline || null,
            bio: u.bio || null,
            role: (u.role && ['SUPER_ADMIN', 'ADMIN', 'INSTRUCTOR', 'STUDENT'].includes(u.role)) ? u.role : 'STUDENT'
          })
      }
      console.log(`   ✅ Selesai migrasi ${userIdMap.size} users.\n`)
    } catch (e) {
      console.warn(`   ⚠️ Tabel users: ${e.message}\n`)
    }

    // Fallback: Jika tidak ada instructor di map, gunakan admin / user pertama
    const defaultInstructorId = Array.from(userIdMap.values())[0]

    // -------------------------------------------------------------
    // TAHAP 2: CATEGORIES
    // -------------------------------------------------------------
    console.log('⏳ [2/10] Migrasi Kategori (Categories)...')
    try {
      const [cats] = await connection.query('SELECT * FROM categories ORDER BY id ASC')
      console.log(`   Ditemukan ${cats.length} kategori.`)

      for (const c of cats) {
        const { data, error } = await supabase
          .from('categories')
          .insert({
            name: c.name,
            slug: c.slug,
            description: c.description || null,
            image_url: c.image || null,
            sort_order: c.sort_order || 0,
            is_active: Boolean(c.is_active)
          })
          .select('id')
          .single()

        if (data) {
          categoryIdMap.set(c.id, data.id)
        } else if (error) {
          // Jika slug sudah ada, cari id existing
          const { data: exist } = await supabase.from('categories').select('id').eq('slug', c.slug).single()
          if (exist) categoryIdMap.set(c.id, exist.id)
        }
      }
      console.log(`   ✅ Selesai migrasi ${categoryIdMap.size} kategori.\n`)
    } catch (e) {
      console.warn(`   ⚠️ Tabel categories: ${e.message}\n`)
    }

    // -------------------------------------------------------------
    // TAHAP 3: COURSES
    // -------------------------------------------------------------
    console.log('⏳ [3/10] Migrasi Kursus (Courses)...')
    try {
      const [courses] = await connection.query('SELECT * FROM courses WHERE deleted_at IS NULL')
      console.log(`   Ditemukan ${courses.length} kursus.`)

      for (const crs of courses) {
        const instructorUuid = userIdMap.get(crs.instructor_id) || defaultInstructorId
        const categoryId = categoryIdMap.get(crs.category_id) || Array.from(categoryIdMap.values())[0]

        if (!instructorUuid || !categoryId) {
          console.warn(`   ⚠️ Lewati kursus '${crs.title}': instructor atau category tidak ditemukan.`)
          continue
        }

        const { data, error } = await supabase
          .from('courses')
          .insert({
            title: crs.title,
            slug: crs.slug,
            subtitle: crs.subtitle || null,
            description: crs.description || null,
            thumbnail_url: crs.thumbnail || null,
            preview_video_id: crs.preview_video_id || null,
            level: crs.level || 'all_levels',
            language: crs.language || 'id',
            price: Number(crs.price) || 0,
            discount_price: crs.discount_price ? Number(crs.discount_price) : null,
            learning_objectives: parseJsonSafe(crs.learning_objectives),
            requirements: parseJsonSafe(crs.requirements),
            target_audience: parseJsonSafe(crs.target_audience),
            whatsapp_group_url: crs.whatsapp_group_url || null,
            whatsapp_contact_url: crs.whatsapp_contact_url || null,
            telegram_url: crs.telegram_url || null,
            status: crs.status || 'published',
            moderation_notes: crs.moderation_notes || null,
            published_at: crs.published_at || new Date().toISOString(),
            instructor_id: instructorUuid,
            category_id: categoryId
          })
          .select('id')
          .single()

        if (data) {
          courseIdMap.set(crs.id, data.id)
        } else if (error) {
          const { data: exist } = await supabase.from('courses').select('id').eq('slug', crs.slug).single()
          if (exist) courseIdMap.set(crs.id, exist.id)
        }
      }
      console.log(`   ✅ Selesai migrasi ${courseIdMap.size} kursus.\n`)
    } catch (e) {
      console.warn(`   ⚠️ Tabel courses: ${e.message}\n`)
    }

    // -------------------------------------------------------------
    // TAHAP 4: COURSE SECTIONS (MODUL)
    // -------------------------------------------------------------
    console.log('⏳ [4/10] Migrasi Modul Kurikulum (Sections)...')
    try {
      const [sections] = await connection.query('SELECT * FROM sections ORDER BY course_id, sort_order ASC')
      console.log(`   Ditemukan ${sections.length} modul.`)

      for (const sec of sections) {
        const supabaseCourseId = courseIdMap.get(sec.course_id)
        if (!supabaseCourseId) continue

        const { data } = await supabase
          .from('course_sections')
          .insert({
            course_id: supabaseCourseId,
            title: sec.title,
            description: sec.description || null,
            sort_order: sec.sort_order || 0
          })
          .select('id')
          .single()

        if (data) sectionIdMap.set(sec.id, data.id)
      }
      console.log(`   ✅ Selesai migrasi ${sectionIdMap.size} modul.\n`)
    } catch (e) {
      console.warn(`   ⚠️ Tabel sections: ${e.message}\n`)
    }

    // -------------------------------------------------------------
    // TAHAP 5: LESSONS (MATERI VIDEO & ARTIKEL)
    // -------------------------------------------------------------
    console.log('⏳ [5/10] Migrasi Materi Pelajaran (Lessons)...')
    try {
      const [lessons] = await connection.query('SELECT * FROM lessons ORDER BY section_id, sort_order ASC')
      console.log(`   Ditemukan ${lessons.length} materi pelajaran.`)

      for (const lsn of lessons) {
        const supabaseSectionId = sectionIdMap.get(lsn.section_id)
        if (!supabaseSectionId) continue

        const { data } = await supabase
          .from('lessons')
          .insert({
            section_id: supabaseSectionId,
            title: lsn.title,
            slug: lsn.slug,
            description: lsn.description || null,
            youtube_video_id: lsn.youtube_video_id || '',
            duration_seconds: lsn.duration_seconds || 0,
            sort_order: lsn.sort_order || 0,
            is_preview: Boolean(lsn.is_preview),
            is_active: Boolean(lsn.is_active)
          })
          .select('id')
          .single()

        if (data) lessonIdMap.set(lsn.id, data.id)
      }
      console.log(`   ✅ Selesai migrasi ${lessonIdMap.size} materi pelajaran.\n`)
    } catch (e) {
      console.warn(`   ⚠️ Tabel lessons: ${e.message}\n`)
    }

    // -------------------------------------------------------------
    // TAHAP 6: QUIZZES
    // -------------------------------------------------------------
    console.log('⏳ [6/10] Migrasi Kuis (Quizzes)...')
    try {
      const [quizzes] = await connection.query('SELECT * FROM quizzes ORDER BY section_id, sort_order ASC')
      console.log(`   Ditemukan ${quizzes.length} kuis.`)

      for (const q of quizzes) {
        const supabaseSectionId = sectionIdMap.get(q.section_id)
        if (!supabaseSectionId) continue

        const { data } = await supabase
          .from('quizzes')
          .insert({
            section_id: supabaseSectionId,
            title: q.title,
            slug: q.slug,
            description: q.description || null,
            passing_score: q.passing_score || 70,
            time_limit_minutes: q.time_limit_minutes || 0,
            max_attempts: q.max_attempts || 0,
            sort_order: q.sort_order || 0,
            is_active: Boolean(q.is_active)
          })
          .select('id')
          .single()

        if (data) quizIdMap.set(q.id, data.id)
      }
      console.log(`   ✅ Selesai migrasi ${quizIdMap.size} kuis.\n`)
    } catch (e) {
      console.warn(`   ⚠️ Tabel quizzes: ${e.message}\n`)
    }

    // -------------------------------------------------------------
    // TAHAP 7: QUIZ QUESTIONS & OPTIONS
    // -------------------------------------------------------------
    console.log('⏳ [7/10] Migrasi Soal & Opsi Kuis...')
    try {
      const [questions] = await connection.query('SELECT * FROM quiz_questions ORDER BY quiz_id, sort_order ASC')
      console.log(`   Ditemukan ${questions.length} butir pertanyaan.`)

      for (const qq of questions) {
        const supabaseQuizId = quizIdMap.get(qq.quiz_id)
        if (!supabaseQuizId) continue

        const { data: qData } = await supabase
          .from('quiz_questions')
          .insert({
            quiz_id: supabaseQuizId,
            question_text: qq.question_text,
            explanation: qq.explanation || null,
            question_type: qq.question_type || 'single_choice',
            points: qq.points || 10,
            sort_order: qq.sort_order || 0,
            media_type: qq.media_type || null,
            media_url: qq.media_url || null
          })
          .select('id')
          .single()

        if (qData) questionIdMap.set(qq.id, qData.id)
      }

      // Quiz options
      const [options] = await connection.query('SELECT * FROM quiz_options ORDER BY question_id, sort_order ASC')
      console.log(`   Ditemukan ${options.length} opsi jawaban kuis.`)

      let optionsMigrated = 0
      for (const opt of options) {
        const supabaseQuestionId = questionIdMap.get(opt.question_id)
        if (!supabaseQuestionId) continue

        await supabase
          .from('quiz_options')
          .insert({
            question_id: supabaseQuestionId,
            option_text: opt.option_text,
            is_correct: Boolean(opt.is_correct),
            sort_order: opt.sort_order || 0,
            media_url: opt.media_url || null
          })
        optionsMigrated++
      }
      console.log(`   ✅ Selesai migrasi ${questionIdMap.size} soal dan ${optionsMigrated} opsi jawaban.\n`)
    } catch (e) {
      console.warn(`   ⚠️ Tabel quiz_questions / options: ${e.message}\n`)
    }

    // -------------------------------------------------------------
    // TAHAP 8: VOUCHERS
    // -------------------------------------------------------------
    console.log('⏳ [8/10] Migrasi Kode Voucher...')
    try {
      const [vouchers] = await connection.query('SELECT * FROM vouchers')
      console.log(`   Ditemukan ${vouchers.length} voucher.`)

      let vCount = 0
      for (const v of vouchers) {
        await supabase
          .from('vouchers')
          .upsert({
            code: v.code.toUpperCase(),
            name: v.name,
            type: v.type || 'fixed',
            discount_amount: Number(v.discount_amount),
            min_order_amount: Number(v.min_order_amount) || 0,
            max_discount_amount: v.max_discount_amount ? Number(v.max_discount_amount) : null,
            usage_limit: v.usage_limit || null,
            used_count: v.used_count || 0,
            expires_at: v.expires_at || null,
            is_active: Boolean(v.is_active)
          }, { onConflict: 'code' })
        vCount++
      }
      console.log(`   ✅ Selesai migrasi ${vCount} voucher.\n`)
    } catch (e) {
      console.warn(`   ⚠️ Tabel vouchers: ${e.message}\n`)
    }

    // -------------------------------------------------------------
    // TAHAP 9: SETTINGS
    // -------------------------------------------------------------
    console.log('⏳ [9/10] Migrasi Pengaturan Sistem (Settings)...')
    try {
      const [settings] = await connection.query('SELECT * FROM settings')
      console.log(`   Ditemukan ${settings.length} pengaturan.`)

      for (const s of settings) {
        await supabase
          .from('settings')
          .upsert({
            key: s.key,
            value: s.value,
            type: s.type || 'string'
          }, { onConflict: 'key' })
      }
      console.log(`   ✅ Selesai migrasi ${settings.length} settings.\n`)
    } catch (e) {
      console.warn(`   ⚠️ Tabel settings: ${e.message}\n`)
    }

    // -------------------------------------------------------------
    // TAHAP 10: LANDING PAGES
    // -------------------------------------------------------------
    console.log('⏳ [10/10] Migrasi Landing Pages...')
    try {
      const [lps] = await connection.query('SELECT * FROM landing_pages')
      console.log(`   Ditemukan ${lps.length} landing pages.`)

      for (const lp of lps) {
        await supabase
          .from('landing_pages')
          .upsert({
            name: lp.name,
            slug: lp.slug,
            content: lp.content || lp.html_content || null,
            status: lp.status || 'draft',
            is_template: Boolean(lp.is_template),
            is_homepage: Boolean(lp.is_homepage)
          }, { onConflict: 'slug' })
      }
      console.log(`   ✅ Selesai migrasi ${lps.length} landing pages.\n`)
    } catch (e) {
      console.warn(`   ⚠️ Tabel landing_pages: ${e.message}\n`)
    }

    console.log('=================================================================')
    console.log('🎉 SEMUA DATA DARI MYSQL TELAH BERHASIL DIMIGRASIKAN KE SUPABASE!')
    console.log('=================================================================\n')
  } catch (err) {
    console.error(`\n❌ Terjadi kesalahan saat proses migrasi:`, err)
  } finally {
    if (connection) await connection.end()
  }
}

runMigration()
