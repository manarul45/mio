import { requireAdmin } from '~/server/utils/authHelper'
import { getAdminSupabaseClient } from '~/server/utils/supabaseAdmin'
import { logAuditAction } from '~/server/utils/auditLogger'

export default defineEventHandler(async (event) => {
  const client = getAdminSupabaseClient(event)
const { userId } = await requireAdmin(event)

  const body = await readBody(event)
  const { raw_users, default_role = 'STUDENT', default_password } = body

  if (!raw_users || typeof raw_users !== 'string' || !raw_users.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'Data pengguna massal wajib diisi.' })
  }

  const rawInput = raw_users.trim()
  let createdCount = 0
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

  // 3. Process each user item
  for (const item of items) {
    const name = (item.name || '').trim()
    const email = (item.email || '').trim().toLowerCase()
    const password = item.password || default_password || 'Mio123456!'
    const role = (item.role ? item.role.toUpperCase() : default_role)
    const whatsapp = (item.whatsapp_number || item.whatsapp || item.wa || '').trim()
    const courseIds = Array.isArray(item.course_ids) ? item.course_ids : []

    // Validate email format
    if (!name || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      skippedCount++
      continue
    }

    try {
      // Create user in Supabase Auth
      const { data: authData, error: authError } = await client.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          name,
          whatsapp_number: whatsapp,
          role,
        }
      })

      if (authError || !authData.user) {
        // User already exists, update profile if needed
        const { data: existingProfile } = await client
          .from('profiles')
          .select('id')
          .eq('email', email)
          .maybeSingle()

        if (existingProfile) {
          // Auto enroll if course_ids specified
          for (const cId of courseIds) {
            const { error: enrErr } = await client
              .from('enrollments')
              .upsert({
                user_id: existingProfile.id,
                course_id: cId,
                status: 'active',
                enrolled_at: new Date().toISOString(),
              }, { onConflict: 'user_id,course_id' })
            if (!enrErr) enrolledCount++
          }
        }
        skippedCount++
        continue
      }

      const newUserId = authData.user.id

      // Upsert profile
      await client
        .from('profiles')
        .upsert({
          id: newUserId,
          name,
          email,
          whatsapp_number: whatsapp || null,
          role,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })

      createdCount++

      // Auto enroll courses if provided
      for (const cId of courseIds) {
        const { error: enrErr } = await client
          .from('enrollments')
          .upsert({
            user_id: newUserId,
            course_id: cId,
            status: 'active',
            enrolled_at: new Date().toISOString(),
          }, { onConflict: 'user_id,course_id' })
        if (!enrErr) enrolledCount++
      }
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
      enrolled_count: enrolledCount,
      skipped_count: skippedCount,
    },
  })

  return {
    success: true,
    created_count: createdCount,
    enrolled_count: enrolledCount,
    skipped_count: skippedCount,
    message: `Import Selesai: ${createdCount} pengguna baru berhasil dibuat, ${enrolledCount} pendaftaran kursus otomatis, ${skippedCount} dilewati (duplikat/format salah).`
  }
})
