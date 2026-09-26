import { requireAdmin } from '~/server/utils/authHelper'
import { getAdminSupabaseClient } from '~/server/utils/supabaseAdmin'

export default defineEventHandler(async (event) => {
  const withdrawalId = getRouterParam(event, 'id')
  const client = getAdminSupabaseClient(event)
await requireAdmin(event)

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
