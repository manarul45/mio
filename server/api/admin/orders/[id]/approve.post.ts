import { requireAdmin } from '~/server/utils/authHelper'
import { getAdminSupabaseClient } from '~/server/utils/supabaseAdmin'
import { logAuditAction } from '~/server/utils/auditLogger'
import { fulfillPaidOrder } from '~/server/utils/orderFulfillment'

export default defineEventHandler(async (event) => {
  const { userId: adminId } = await requireAdmin(event)
  const client = getAdminSupabaseClient(event)
  const orderId = Number(getRouterParam(event, 'id'))

  const { data: order } = await client
    .from('orders')
    .select('id, order_number, user_id, status')
    .eq('id', orderId)
    .maybeSingle()

  if (!order) throw createError({ statusCode: 404, statusMessage: 'Pesanan tidak ditemukan.' })
  if (order.status !== 'pending') {
    throw createError({ statusCode: 409, statusMessage: 'Hanya pesanan berstatus PENDING yang bisa disetujui.' })
  }

  const { course_ids } = await fulfillPaidOrder(client, order)

  await logAuditAction({
    event,
    userId: adminId,
    action: 'order.approved_by_admin',
    entityType: 'Order',
    entityId: order.id,
    newValues: { order_number: order.order_number, course_ids },
  })

  return { success: true, enrolled_count: course_ids.length }
})
