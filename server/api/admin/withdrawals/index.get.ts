import { serverSupabaseUser } from '#supabase/server'
import { getAdminSupabaseClient } from '~/server/utils/supabaseAdmin'

export default defineEventHandler(async (event) => {
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

  const query = getQuery(event)
  const status = (query.status as string) || 'all'

  let dbQuery = client
    .from('affiliate_withdrawals')
    .select(`
      *,
      user:profiles!affiliate_withdrawals_user_id_fkey(id, name, email, whatsapp_number)
    `)
    .order('created_at', { ascending: false })

  if (status !== 'all') {
    dbQuery = dbQuery.eq('status', status)
  }

  const { data: withdrawals, error } = await dbQuery

  if (error) {
    throw createError({ statusCode: 500, statusMessage: 'Gagal memuat data penarikan: ' + error.message })
  }

  // Count pending
  const { count: pendingCount } = await client
    .from('affiliate_withdrawals')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending')

  return {
    withdrawals: withdrawals || [],
    pendingCount: pendingCount || 0,
  }
})
