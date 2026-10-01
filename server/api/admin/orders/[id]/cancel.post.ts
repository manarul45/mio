import { requireAdmin } from '~/server/utils/authHelper'
import { getAdminSupabaseClient } from '~/server/utils/supabaseAdmin'
import { logAuditAction } from '~/server/utils/auditLogger'
import { cancelPendingOrder } from '~/server/utils/orderFulfillment'

export default defineEventHandler(async (event) => {
  const { userId: adminId } = await requireAdmin(event)
  const client = getAdminSupabaseClient(event)
  const orderId = Number(getRouterParam(event, 'id'))

  const { data: order } = await client
    .from('orders')
    .select('id, order_number, status')
    .eq('id', orderId)
    .maybeSingle()

  if (!order) throw createError({ statusCode: 404, statusMessage: 'Pesanan tidak ditemukan.' })
  if (order.status !== 'pending') {
    throw createError({ statusCode: 409, statusMessage: 'Hanya pesanan berstatus PENDING yang bisa dibatalkan.' })
  }

  await cancelPendingOrder(client, order.id)

  await logAuditAction({
    event,
    userId: adminId,
    action: 'order.cancelled_by_admin',
    entityType: 'Order',
    entityId: order.id,
    newValues: { order_number: order.order_number },
  })

  return { success: true }
})
