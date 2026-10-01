import { requireAdmin } from '~/server/utils/authHelper'
import { getAdminSupabaseClient } from '~/server/utils/supabaseAdmin'
import { logAuditAction } from '~/server/utils/auditLogger'
import { activateEnrollments, assertCoursesExist, buildWhatsappUrl, parseCourseIds } from '~/server/utils/adminEnrollment'

const ALLOWED_ROLES = ['STUDENT', 'INSTRUCTOR', 'ADMIN']

export default defineEventHandler(async (event) => {
  const { userId: adminId } = await requireAdmin(event)
  const client = getAdminSupabaseClient(event)
  const body = await readBody(event)

  const name = String(body?.name || '').trim()
  const email = String(body?.email || '').trim().toLowerCase()
  const password = String(body?.password || '')
  const role = String(body?.role || 'STUDENT').toUpperCase()
  const whatsapp = String(body?.whatsapp_number || '').trim()
  const courseIds = parseCourseIds(body?.course_ids)

  if (!name) throw createError({ statusCode: 400, statusMessage: 'Nama lengkap wajib diisi.' })
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw createError({ statusCode: 400, statusMessage: 'Format email tidak valid.' })
  }
  if (password.length < 6) {
    throw createError({ statusCode: 400, statusMessage: 'Kata sandi minimal 6 karakter.' })
  }
  if (!ALLOWED_ROLES.includes(role)) {
    throw createError({ statusCode: 400, statusMessage: 'Peran tidak dikenal.' })
  }
  await assertCoursesExist(client, courseIds)

  const { data: existing } = await client.from('profiles').select('id').eq('email', email).maybeSingle()
  if (existing) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Email sudah terdaftar. Gunakan tombol "Kursus" pada pengguna tersebut untuk mendaftarkannya ke kursus.',
    })
  }

  const { data: authData, error: authError } = await client.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name, whatsapp_number: whatsapp },
  })
  if (authError || !authData.user) {
    const alreadyExists = /already|registered|exists/i.test(authError?.message || '')
    throw createError({
      statusCode: alreadyExists ? 409 : 500,
      statusMessage: alreadyExists
        ? 'Email sudah terdaftar di sistem login.'
        : 'Gagal membuat akun: ' + (authError?.message || 'tidak diketahui'),
    })
  }

  const newUserId = authData.user.id
  const { error: profileError } = await client.from('profiles').upsert({
    id: newUserId,
    name,
    email,
    whatsapp_number: whatsapp || null,
    role,
    updated_at: new Date().toISOString(),
  })
  if (profileError) {
    throw createError({ statusCode: 500, statusMessage: 'Akun dibuat, tetapi profil gagal disimpan: ' + profileError.message })
  }

  await activateEnrollments(client, newUserId, courseIds)

  await logAuditAction({
    event,
    userId: adminId,
    action: 'user.created_by_admin',
    entityType: 'User',
    entityId: newUserId,
    newValues: { email, role, course_ids: courseIds },
  })

  const whatsappUrl = buildWhatsappUrl(whatsapp, `Assalamu'alaikum *${name}*,

Akun MIO Learning Academy Anda sudah dibuat oleh Administrator.

*Email Login:* ${email}
*Kata Sandi:* ${password}

Silakan masuk lalu ganti kata sandi Anda di menu profil:
https://mioacademy.id/login

Terima kasih.`)

  return {
    success: true,
    user_id: newUserId,
    user_name: name,
    user_email: email,
    enrolled_count: courseIds.length,
    whatsapp_url: whatsappUrl,
  }
})
