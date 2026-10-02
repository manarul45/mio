import { getAuthenticatedUserId } from '~/server/utils/authHelper'
import { getAdminSupabaseClient } from '~/server/utils/supabaseAdmin'

export default defineEventHandler(async (event) => {
  const client = getAdminSupabaseClient(event)
  const userId = await getAuthenticatedUserId(event)
  if (!userId) {
    throw createError({ statusCode: 401, statusMessage: 'Silakan masuk.' })
  }

  const { data: profile } = await client
    .from('profiles')
    .select('id, role, name, email')
    .eq('id', userId)
    .maybeSingle()

  if (!profile) {
    throw createError({ statusCode: 404, statusMessage: 'Profil tidak ditemukan.' })
  }

  const role = String(profile.role || '').toUpperCase()
  if (role === 'ADMIN' || role === 'SUPER_ADMIN') {
    throw createError({ statusCode: 400, statusMessage: 'Akun pengelola tidak bisa dihapus dari halaman profil.' })
  }

  const [{ count: paidOrders }, { count: ownedCourses }] = await Promise.all([
    client.from('orders').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('status', 'paid'),
    client.from('courses').select('id', { count: 'exact', head: true }).eq('instructor_id', userId),
  ])

  if (paidOrders) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Akun ini masih punya pesanan yang sudah lunas, jadi tidak dihapus.',
    })
  }
  if (ownedCourses) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Akun ini masih menjadi pengajar sebuah kursus, jadi tidak dihapus.',
    })
  }

  const { error: authError } = await client.auth.admin.deleteUser(userId)
  if (authError && !/not.?found/i.test(authError.message)) {
    throw createError({ statusCode: 500, statusMessage: 'Gagal menghapus akun login: ' + authError.message })
  }

  await client.from('profiles').delete().eq('id', userId)

  return { success: true }
})
