import { requireAdmin } from '~/server/utils/authHelper'
import { getAdminSupabaseClient } from '~/server/utils/supabaseAdmin'
import { logAuditAction } from '~/server/utils/auditLogger'

export default defineEventHandler(async (event) => {
  const { userId: adminId } = await requireAdmin(event)
  const client = getAdminSupabaseClient(event)
  const targetUserId = String(getRouterParam(event, 'id') || '')

  if (targetUserId === adminId) {
    throw createError({ statusCode: 400, statusMessage: 'Anda tidak bisa menghapus akun Anda sendiri.' })
  }

  const { data: target } = await client
    .from('profiles')
    .select('id, name, email, role')
    .eq('id', targetUserId)
    .maybeSingle()
  if (!target) throw createError({ statusCode: 404, statusMessage: 'Pengguna tidak ditemukan.' })

  const [{ count: paidOrders }, { count: ownedCourses }] = await Promise.all([
    client.from('orders').select('id', { count: 'exact', head: true }).eq('user_id', target.id).eq('status', 'paid'),
    client.from('courses').select('id', { count: 'exact', head: true }).eq('instructor_id', target.id),
  ])

  if (paidOrders) {
    throw createError({
      statusCode: 409,
      statusMessage: `Pengguna ini punya ${paidOrders} pesanan LUNAS, jadi tidak dihapus agar riwayat keuangan tetap utuh. Gunakan tombol "Kursus" untuk mencabut aksesnya.`,
    })
  }
  if (ownedCourses) {
    throw createError({
      statusCode: 409,
      statusMessage: `Pengguna ini masih menjadi pengajar ${ownedCourses} kursus. Pindahkan atau hapus kursusnya terlebih dahulu.`,
    })
  }

  const { error: authError } = await client.auth.admin.deleteUser(target.id)
  if (authError && !/not.?found/i.test(authError.message)) {
    throw createError({ statusCode: 500, statusMessage: 'Gagal menghapus akun login: ' + authError.message })
  }

  const { error: profileError } = await client.from('profiles').delete().eq('id', target.id)
  if (profileError) {
    throw createError({ statusCode: 500, statusMessage: 'Gagal menghapus profil: ' + profileError.message })
  }

  await logAuditAction({
    event,
    userId: adminId,
    action: 'user.deleted_by_admin',
    entityType: 'User',
    entityId: target.id,
    newValues: { name: target.name, email: target.email, role: target.role },
  })

  return { success: true }
})
