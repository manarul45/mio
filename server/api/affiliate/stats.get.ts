import { serverSupabaseUser } from '#supabase/server'
import { getAdminSupabaseClient } from '~/server/utils/supabaseAdmin'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Silakan masuk ke akun Anda.' })
  }

  const client = getAdminSupabaseClient(event)

  // 1. Fetch affiliate commissions
  const { data: commissionsData, error: commError } = await client
    .from('affiliate_commissions')
    .select(`
      id,
      amount,
      status,
      created_at,
      course:courses(id, title, slug),
      order:orders(id, order_number, user_id, profiles:user_id(id, name, email))
    `)
    .eq('affiliate_user_id', user.id)
    .order('created_at', { ascending: false })

  if (commError) {
    throw createError({ statusCode: 500, statusMessage: 'Gagal memuat data komisi: ' + commError.message })
  }

  // 2. Fetch withdrawals
  const { data: withdrawalsData, error: withError } = await client
    .from('affiliate_withdrawals')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (withError) {
    throw createError({ statusCode: 500, statusMessage: 'Gagal memuat data penarikan: ' + withError.message })
  }

  // 3. Compute earnings and balance
  const commissions = commissionsData || []
  const withdrawals = withdrawalsData || []

  let totalEarnings = 0
  let pendingEarnings = 0
  let clearedEarnings = 0

  commissions.forEach((c: any) => {
    const amt = Number(c.amount) || 0
    totalEarnings += amt
    if (c.status === 'pending') {
      pendingEarnings += amt
    } else if (c.status === 'approved' || c.status === 'paid') {
      clearedEarnings += amt
    }
  })

  let totalWithdrawn = 0
  let pendingWithdrawal = 0

  withdrawals.forEach((w: any) => {
    const amt = Number(w.amount) || 0
    if (w.status === 'approved') {
      totalWithdrawn += amt
    } else if (w.status === 'pending') {
      pendingWithdrawal += amt
    }
  })

  const withdrawableBalance = Math.max(0, clearedEarnings - (totalWithdrawn + pendingWithdrawal))

  // 4. Fetch published courses for link generation
  const { data: courses } = await client
    .from('courses')
    .select('id, title, slug, price, discount_price, thumbnail_url')
    .eq('status', 'published')
    .order('created_at', { ascending: false })

  // 5. Fetch commission rate setting
  const { data: rateSetting } = await client
    .from('settings')
    .select('value')
    .eq('key', 'affiliate_commission_rate')
    .maybeSingle()

  const affiliateRate = Number(rateSetting?.value) || 20

  return {
    stats: {
      total_earnings: totalEarnings,
      pending_earnings: pendingEarnings,
      cleared_earnings: clearedEarnings,
      total_withdrawn: totalWithdrawn,
      pending_withdrawal: pendingWithdrawal,
      withdrawable_balance: withdrawableBalance,
      affiliate_rate: affiliateRate,
    },
    commissions,
    withdrawals,
    courses: courses || [],
    user_id: user.id,
  }
})
