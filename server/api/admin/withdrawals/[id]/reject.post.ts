import { serverSupabaseUser } from '#supabase/server'
import { getAdminSupabaseClient } from '~/server/utils/supabaseAdmin'

export default defineEventHandler(async (event) => {
  const withdrawalId = getRouterParam(event, 'id')
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Silakan masuk.' })
  }

  const client = getAdminSupabaseClient(event)

  const { data: profile } = await client
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'ADMIN' && profile?.role !== 'SUPER_ADMIN') {
    throw createError({ statusCode: 403, statusMessage: 'Akses khusus administrator.' })
  }

  const body = await readBody(event)
  const { admin_notes } = body

  const { data: updated, error } = await client
    .from('affiliate_withdrawals')
    .update({
      status: 'rejected',
      admin_notes: admin_notes || 'Permintaan penarikan ditolak oleh administrator.',
      processed_at: new Date().toISOString(),
    })
    .eq('id', withdrawalId)
    .select()
    .single()

  if (error) {
    throw createError({ statusCode: 500, statusMessage: 'Gagal menolak penarikan: ' + error.message })
  }

  return { success: true, withdrawal: updated }
})
