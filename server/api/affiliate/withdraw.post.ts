import { serverSupabaseUser } from '#supabase/server'
import { getAdminSupabaseClient } from '~/server/utils/supabaseAdmin'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Silakan masuk ke akun Anda.' })
  }

  const body = await readBody(event)
  const { amount, bank_name, account_number, account_holder } = body

  const withdrawAmount = Number(amount)
  if (isNaN(withdrawAmount) || withdrawAmount < 50000) {
    throw createError({ statusCode: 400, statusMessage: 'Minimum penarikan saldo komisi adalah Rp 50.000.' })
  }

  if (!bank_name || !bank_name.trim() || !account_number || !account_number.trim() || !account_holder || !account_holder.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'Data rekening bank (Nama Bank, Nomor Rekening, dan Atas Nama) wajib diisi lengkap.' })
  }

  const client = getAdminSupabaseClient(event)

  // 1. Calculate available balance
  const { data: comms } = await client
    .from('affiliate_commissions')
    .select('amount, status')
    .eq('affiliate_user_id', user.id)

  const cleared = (comms || [])
    .filter((c: any) => c.status === 'approved' || c.status === 'paid')
    .reduce((sum: number, c: any) => sum + (Number(c.amount) || 0), 0)

  const { data: withs } = await client
    .from('affiliate_withdrawals')
    .select('amount, status')
    .eq('user_id', user.id)

  const processedOrPending = (withs || [])
    .filter((w: any) => w.status === 'approved' || w.status === 'pending')
    .reduce((sum: number, w: any) => sum + (Number(w.amount) || 0), 0)

  const availableBalance = Math.max(0, cleared - processedOrPending)

  if (withdrawAmount > availableBalance) {
    throw createError({
      statusCode: 400,
      statusMessage: `Jumlah penarikan (Rp ${withdrawAmount.toLocaleString('id-ID')}) melebihi saldo komisi yang tersedia untuk ditarik (Rp ${availableBalance.toLocaleString('id-ID')}).`
    })
  }

  // 2. Insert withdrawal request
  const { data: newWithdrawal, error: insError } = await client
    .from('affiliate_withdrawals')
    .insert({
      user_id: user.id,
      amount: withdrawAmount,
      bank_name: bank_name.trim(),
      account_number: account_number.trim(),
      account_holder: account_holder.trim(),
      status: 'pending',
    })
    .select()
    .single()

  if (insError) {
    throw createError({ statusCode: 500, statusMessage: 'Gagal mengajukan penarikan: ' + insError.message })
  }

  return {
    success: true,
    withdrawal: newWithdrawal,
    message: 'Permintaan penarikan komisi berhasil dikirimkan dan sedang diproses tim keuangan.'
  }
})
