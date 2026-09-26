import { serverSupabaseClient, serverSupabaseServiceRole } from '#supabase/server'
import { requireAdmin } from '~/server/utils/authHelper'
import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NUXT_PUBLIC_SUPABASE_URL

  let client: any
  if (serviceKey && supabaseUrl) {
    client = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    })
  } else {
    try {
      client = serverSupabaseServiceRole(event)
    } catch {
      client = await serverSupabaseClient(event)
    }
  }

  const tables = [
    { name: 'profiles', label: 'Pengguna & Akun' },
    { name: 'courses', label: 'Data Kursus' },
    { name: 'categories', label: 'Kategori Kursus' },
    { name: 'course_sections', label: 'Bab / Silabus' },
    { name: 'lessons', label: 'Pelajaran Video' },
    { name: 'quizzes', label: 'Kuis Evaluasi' },
    { name: 'quiz_questions', label: 'Soal Kuis' },
    { name: 'quiz_options', label: 'Pilihan Jawaban' },
    { name: 'orders', label: 'Pesanan & Transaksi' },
    { name: 'order_items', label: 'Item Pesanan' },
    { name: 'enrollments', label: 'Pendaftaran Siswa' },
    { name: 'lesson_progress', label: 'Progres Belajar' },
    { name: 'quiz_attempts', label: 'Ujian Kuis Siswa' },
    { name: 'certificates', label: 'Sertifikat Kelulusan' },
    { name: 'vouchers', label: 'Kode Voucher Diskon' },
    { name: 'landing_pages', label: 'Landing Page' },
    { name: 'settings', label: 'Pengaturan Sistem' },
    { name: 'audit_logs', label: 'Audit Trail Log' },
  ]

  const statsList = await Promise.all(
    tables.map(async (tbl) => {
      try {
        const { count, error } = await client
          .from(tbl.name)
          .select('*', { count: 'exact', head: true })

        return {
          name: tbl.name,
          label: tbl.label,
          rows: error ? 0 : (count || 0)
        }
      } catch {
        return {
          name: tbl.name,
          label: tbl.label,
          rows: 0
        }
      }
    })
  )

  return {
    tables: statsList,
    totalRecords: statsList.reduce((acc, t) => acc + (t.rows || 0), 0)
  }
})
