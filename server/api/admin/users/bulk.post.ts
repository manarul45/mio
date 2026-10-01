import { requireAdmin } from '~/server/utils/authHelper'
import { getAdminSupabaseClient } from '~/server/utils/supabaseAdmin'
import { logAuditAction } from '~/server/utils/auditLogger'
import { activateEnrollments, assertCoursesExist, parseCourseIds } from '~/server/utils/adminEnrollment'

const ALLOWED_ROLES = ['STUDENT', 'INSTRUCTOR', 'ADMIN']

export default defineEventHandler(async (event) => {
  const client = getAdminSupabaseClient(event)
const { userId } = await requireAdmin(event)

  const body = await readBody(event)
  const { raw_users, default_password } = body
  const default_role = String(body?.default_role || 'STUDENT').toUpperCase()
  const defaultCourseIds = parseCourseIds(body?.course_ids)

  if (!raw_users || typeof raw_users !== 'string' || !raw_users.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'Data pengguna massal wajib diisi.' })
  }
  if (!ALLOWED_ROLES.includes(default_role)) {
    throw createError({ statusCode: 400, statusMessage: 'Peran default tidak dikenal.' })
  }
  await assertCoursesExist(client, defaultCourseIds)

  const rawInput = raw_users.trim()
  let createdCount = 0
  let existingCount = 0
  let enrolledCount = 0
  let skippedCount = 0

  // 1. Try parsing JSON first
  let items: any[] = []
  if (rawInput.startsWith('[') || rawInput.startsWith('{')) {
    try {
      const parsed = JSON.parse(rawInput)
      items = Array.isArray(parsed) ? parsed : [parsed]
    } catch {
      items = []
    }
  }

  // 2. If not JSON, parse lines (CSV / delimiter)
  if (items.length === 0) {
    const lines = rawInput.split(/\r?\n/)
    for (const line of lines) {
      const cleanLine = line.trim()
      if (!cleanLine || cleanLine.startsWith('#')) continue

      const parts = cleanLine.split(/[,;\t|]/).map(p => p.trim())
      const name = parts[0]
      const email = parts[1]
      const password = parts[2] || default_password || 'Mio123456!'
      const role = parts[3] ? parts[3].toUpperCase() : default_role
      const whatsapp = parts[4] || ''
      const courseIdsRaw = parts[5] || ''

      const courseIds = courseIdsRaw
        ? courseIdsRaw.split(':').map(c => Number(c.trim())).filter(c => !isNaN(c) && c > 0)
        : []

      items.push({
        name,
        email,
        password,
        role,
        whatsapp_number: whatsapp,
        course_ids: courseIds,
      })
    }
  }

  if (items.length > 500) {
    throw createError({ statusCode: 400, statusMessage: 'Maksimal 500 pengguna per batch import.' })
  }

  const { data: allCourses } = await client.from('courses').select('id')
  const validCourseIds = new Set((allCourses || []).map((c: any) => Number(c.id)))

  // 3. Process each user item
  for (const item of items) {
    const name = (item.name || '').trim()
    const email = (item.email || '').trim().toLowerCase()
    const password = item.password || default_password || 'Mio123456!'
    const role = String(item.role || default_role).trim().toUpperCase()
    const whatsapp = String(item.whatsapp_number || item.whatsapp || item.wa || '').trim()
    const courseIds = [...new Set([...defaultCourseIds, ...parseCourseIds(item.course_ids)])]
      .filter((id) => validCourseIds.has(id))

    if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !ALLOWED_ROLES.includes(role)) {
      skippedCount++
      continue
    }

    try {
      const { data: existingProfile } = await client
        .from('profiles')
        .select('id')
        .eq('email', email)
        .maybeSingle()

      if (existingProfile) {
        await activateEnrollments(client, existingProfile.id, courseIds)
        enrolledCount += courseIds.length
        existingCount++
        continue
      }

      const { data: authData, error: authError } = await client.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name, whatsapp_number: whatsapp },
      })
      if (authError || !authData.user) {
        skippedCount++
        continue
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
        skippedCount++
        continue
      }
      createdCount++

      await activateEnrollments(client, newUserId, courseIds)
      enrolledCount += courseIds.length
    } catch {
      skippedCount++
    }
  }

  // Log audit
  await logAuditAction({
    event,
    userId: userId,
    action: 'user.bulk_import',
    entityType: 'User',
    entityId: 0,
    newValues: {
      created_count: createdCount,
      existing_count: existingCount,
      enrolled_count: enrolledCount,
      skipped_count: skippedCount,
      course_ids: defaultCourseIds,
    },
  })

  return {
    success: true,
    created_count: createdCount,
    existing_count: existingCount,
    enrolled_count: enrolledCount,
    skipped_count: skippedCount,
    message: `Import Selesai: ${createdCount} pengguna baru dibuat, ${existingCount} pengguna lama ditambahkan kursusnya, ${enrolledCount} pendaftaran kursus aktif, ${skippedCount} dilewati (format salah atau peran tidak dikenal).`
  }
})
