import { serverSupabaseUser } from '#supabase/server'
import { getAdminSupabaseClient } from '~/server/utils/supabaseAdmin'
import { logAuditAction } from '~/server/utils/auditLogger'

export default defineEventHandler(async (event) => {
  const targetUserId = getRouterParam(event, 'id')
  const adminUser = await serverSupabaseUser(event)
  if (!adminUser) {
    throw createError({ statusCode: 401, statusMessage: 'Silakan masuk.' })
  }

  const client = getAdminSupabaseClient(event)

  const { data: adminProfile } = await client
    .from('profiles')
    .select('role')
    .eq('id', adminUser.id)
    .single()

  if (adminProfile?.role !== 'ADMIN' && adminProfile?.role !== 'SUPER_ADMIN') {
    throw createError({ statusCode: 403, statusMessage: 'Akses khusus administrator.' })
  }

  // 1. Fetch target user profile
  const { data: targetProfile, error: pErr } = await client
    .from('profiles')
    .select('id, name, email, whatsapp_number')
    .eq('id', targetUserId)
    .single()

  if (pErr || !targetProfile) {
    throw createError({ statusCode: 404, statusMessage: 'Pengguna tidak ditemukan.' })
  }

  // 2. Generate random 8-character secure password
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#'
  let newPassword = ''
  for (let i = 0; i < 8; i++) {
    newPassword += chars.charAt(Math.floor(Math.random() * chars.length))
  }

  // 3. Update password in Supabase Auth
  const { error: updErr } = await client.auth.admin.updateUserById(targetProfile.id, {
    password: newPassword,
  })

  if (updErr) {
    throw createError({ statusCode: 500, statusMessage: 'Gagal mereset kata sandi: ' + updErr.message })
  }

  // 4. Log audit action
  await logAuditAction({
    event,
    userId: adminUser.id,
    action: 'user.password_reset_by_admin',
    entityType: 'User',
    entityId: targetProfile.id,
    newValues: {
      user_id: targetProfile.id,
      user_email: targetProfile.email,
    },
  })

  // 5. Build WhatsApp Link
  let whatsappUrl = ''
  if (targetProfile.whatsapp_number) {
    const cleanPhone = targetProfile.whatsapp_number.replace(/[^0-9]/g, '')
    const finalPhone = cleanPhone.startsWith('0') ? '62' + cleanPhone.substring(1) : cleanPhone
    const msg = `Halo *${targetProfile.name}*,

Kata sandi akun MIO Learning Academy Anda telah berhasil direset oleh Administrator.

*Email Login:* ${targetProfile.email}
*Kata Sandi Baru:* ${newPassword}

Silakan segera masuk dan perbarui kata sandi Anda di menu profil:
https://mioacademy.id/login

Terima kasih.`
    whatsappUrl = `https://wa.me/${finalPhone}?text=${encodeURIComponent(msg)}`
  }

  return {
    success: true,
    user_id: targetProfile.id,
    user_name: targetProfile.name,
    user_email: targetProfile.email,
    new_password: newPassword,
    whatsapp_url: whatsappUrl,
  }
})
