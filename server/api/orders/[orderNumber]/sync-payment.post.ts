import { getAdminSupabaseClient } from '~/server/utils/supabaseAdmin'
import { getAuthenticatedUserId } from '~/server/utils/authHelper'
import { applyMidtransPayment, fetchMidtransStatus } from '~/server/utils/midtrans'

export default defineEventHandler(async (event) => {
  const userId = await getAuthenticatedUserId(event)
  if (!userId) {
    throw createError({ statusCode: 401, statusMessage: 'Anda harus masuk akun terlebih dahulu.' })
  }

  const orderNumber = String(getRouterParam(event, 'orderNumber') || '')
  const client = getAdminSupabaseClient(event)
  const { data: order } = await client
    .from('orders')
    .select('id, status, payment_method, payment_gateway_ref')
    .eq('order_number', orderNumber)
    .eq('user_id', userId)
    .maybeSingle()

  if (!order) {
    throw createError({ statusCode: 404, statusMessage: 'Pesanan tidak ditemukan.' })
  }
  if (order.status === 'paid') return { paid: true }
  if (order.payment_method === 'free_enrollment') return { paid: false }
  if (order.payment_method === 'bank_transfer' && !order.payment_gateway_ref) {
    return { paid: false }
  }

  const status = await fetchMidtransStatus(orderNumber)
  if (!status) return { paid: false }

  const result = await applyMidtransPayment(client, status)
  return { paid: result.paid }
})