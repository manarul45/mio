import { getAdminSupabaseClient } from '~/server/utils/supabaseAdmin'
import { getAuthenticatedUserId } from '~/server/utils/authHelper'

export default defineEventHandler(async (event) => {
  const userId = await getAuthenticatedUserId(event)
  if (!userId) {
    throw createError({ statusCode: 401, statusMessage: 'Anda harus masuk akun terlebih dahulu.' })
  }

  const body = await readBody(event)
  const nextMethod = body?.payment_method
  if (nextMethod !== 'qris' && nextMethod !== 'bank_transfer') {
    throw createError({ statusCode: 400, statusMessage: 'Metode pembayaran tidak dikenali.' })
  }

  const orderNumber = String(getRouterParam(event, 'orderNumber') || '')
  const client = getAdminSupabaseClient(event)
  const { data: order } = await client
    .from('orders')
    .select('id, status, payment_method')
    .eq('order_number', orderNumber)
    .eq('user_id', userId)
    .maybeSingle()

  if (!order) {
    throw createError({ statusCode: 404, statusMessage: 'Pesanan tidak ditemukan.' })
  }
  if (order.status !== 'pending') {
    throw createError({ statusCode: 400, statusMessage: 'Metode bayar hanya bisa diganti selama pesanan belum lunas.' })
  }
  if (order.payment_method === 'free_enrollment') {
    throw createError({ statusCode: 400, statusMessage: 'Pesanan gratis tidak perlu dibayar.' })
  }

  await client
    .from('orders')
    .update({
      payment_method: nextMethod,
      updated_at: new Date().toISOString(),
    })
    .eq('id', order.id)

  return { payment_method: nextMethod }
})
