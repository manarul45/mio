import { requireAdmin } from '~/server/utils/authHelper'
import { getAdminSupabaseClient } from '~/server/utils/supabaseAdmin'

export default defineEventHandler(async (event) => {
  const withdrawalId = getRouterParam(event, 'id')
  const client = getAdminSupabaseClient(event)
await requireAdmin(event)

  const body = await readBody(event)
  const { admin_notes, receipt_url } = body

  // 1. Fetch withdrawal
  const { data: withdrawal, error: fetchErr } = await client
    .from('affiliate_withdrawals')
    .select('*')
    .eq('id', withdrawalId)
    .single()

  if (fetchErr || !withdrawal) {
    throw createError({ statusCode: 404, statusMessage: 'Permintaan penarikan tidak ditemukan.' })
  }

  // 2. Update status to approved
  const { data: updated, error: updErr } = await client
    .from('affiliate_withdrawals')
    .update({
      status: 'approved',
      admin_notes: admin_notes || 'Pencairan dana telah ditransfer dengan sukses oleh bendahara platform.',
      receipt_url: receipt_url || null,
      processed_at: new Date().toISOString(),
    })
    .eq('id', withdrawalId)
    .select()
    .single()

  if (updErr) {
    throw createError({ statusCode: 500, statusMessage: 'Gagal menyetujui penarikan: ' + updErr.message })
  }

  // 3. Update commissions to paid
  await client
    .from('affiliate_commissions')
    .update({ status: 'paid', paid_at: new Date().toISOString() })
    .eq('affiliate_user_id', withdrawal.user_id)
    .eq('status', 'approved')

  return { success: true, withdrawal: updated }
})
